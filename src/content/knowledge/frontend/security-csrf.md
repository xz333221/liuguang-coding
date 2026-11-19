---
title: CSRF、SameSite 与 Cookie 作用域
summary: 'CSRF 能成立是因为浏览器会自动带上目标站点的 Cookie,攻击者不需要读到响应。SameSite=Lax 已成默认值,Strict 会打断外链登录态,None 必须配 Secure;纵深防御靠同步器令牌、双提交、Origin 校验,以及让 GET 不带副作用。'
category: frontend
node: frontend-security-csrf
order: 98
level: 进阶
tags: [安全, CSRF, Cookie, SameSite]
updated: 2026-11-19
mindmap: security-csrf.mindmap.json
terms: []
sources:
  - title: OWASP · Cross-Site Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
    note: 同步器令牌、双提交与 Origin 校验的对比。
  - title: MDN · Set-Cookie
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Set-Cookie
    note: SameSite 各取值与 Secure、HttpOnly、前缀规则。
  - title: web.dev · SameSite cookies explained
    url: https://web.dev/articles/samesite-cookies-explained
    note: Lax 成为默认值之后的行为变化。
---

上一篇的 XSS 是「脚本在你的页面里跑」。这一篇的攻击者连你的页面都进不去,只是在别的站点放了一个表单,靠浏览器自动带 Cookie 这一点,让请求带着受害者的身份落到你的服务端。

CSRF(Cross-Site Request Forgery,跨站请求伪造)的关键在于:攻击者不需要读响应,只需要让请求发出去并产生副作用。

## 一次攻击长什么样

受害者在 `bank.example.com` 登录过,会话 Cookie 还有效。然后他打开了攻击者的页面,页面里藏着这段:

```html
<form action="https://bank.example.com/transfer" method="POST">
  <input name="to" value="attacker-account" />
  <input name="amount" value="10000" />
</form>
<script>document.forms[0].submit();</script>
```

页面一加载就自动提交。浏览器判断这是发往 `bank.example.com` 的请求,把该站点的 Cookie 一并带上。服务端看到有效会话,照常执行转账。

整个过程中攻击者看不到任何响应,也不需要看到。CSRF 利用的是「能发」,不是「能读」。第 9 章讲同源策略时提过,限制读取不限制发送,这里就是代价。

用 `fetch` 从攻击者页面发这个请求反而更难成功:跨源 `fetch` 默认不带 Cookie(`credentials` 为 `same-origin`),而且非简单请求要先预检,预检会被拒。表单提交、`<img>`、`<link>`、`<iframe>` 这些不受这个约束,所以 CSRF 的载体一般是表单和 GET 资源。

## SameSite 的三档

SameSite 决定跨站请求要不要带上这个 Cookie。「站点」按可注册域算,`a.example.com` 与 `b.example.com` 是同一站点,与源不是一回事。

| 取值 | 跨站表单 POST | 跨站顶层 GET 导航 | 跨站 iframe / img / fetch |
| --- | --- | --- | --- |
| `Strict` | 不带 | 不带 | 不带 |
| `Lax` | 不带 | 带 | 不带 |
| `None; Secure` | 带 | 带 | 带 |

`Lax` 是 Chrome 从 80 版本起的默认值,现在也是规范里的默认。没写 SameSite 的 Cookie 等价于 `Lax`,这一条就挡掉了绝大多数 POST 型 CSRF。

`Strict` 更严,但会带来一个用户体验问题:从外部站点(邮件、搜索引擎、合作方)点链接进来,首次导航不带 Cookie,页面显示未登录;刷新一次才正常。对登录态敏感的后台可以用,面向公众的站点一般不适合。

`None` 是显式退出保护,跨站必须携带时才用。现代浏览器要求 `SameSite=None` 必须同时有 `Secure`,否则整条 Cookie 被丢弃,控制台会提示 `This Set-Cookie was blocked`。

还有一处容易被忽略:Chrome 对未声明 SameSite 的 Cookie 有一个过渡行为,创建后 2 分钟内允许跨站顶层 POST 携带(`Lax-allowing-unsafe`)。这给老站点留了兼容窗口,不能当安全保证,自己声明清楚。

## Cookie 的作用域

CSRF 的前提是 Cookie 会被自动带上,所以缩小 Cookie 的作用范围本身就是防御。

| 属性 | 作用 |
| --- | --- |
| `Domain` | 不写则只对当前主机生效;写了 `.example.com` 则所有子域共享 |
| `Path` | 限制路径前缀,`/admin` 的 Cookie 不会发往 `/api` |
| `Secure` | 只在 HTTPS 下发送 |
| `HttpOnly` | 脚本读不到,`document.cookie` 为空 |
| `Max-Age` / `Expires` | 不写则是会话 Cookie,关浏览器即失效 |

`Domain` 别乱写。一旦设成父域,任何子域的 XSS 都能读到它,而且子域被接管时攻击者能直接种一个同名 Cookie 覆盖。会话 Cookie 只给当前主机,配 `__Host-` 前缀最稳:

```http
Set-Cookie: __Host-sid=abc; Secure; HttpOnly; Path=/; SameSite=Lax
```

`__Host-` 要求 `Secure` + `Path=/` + 不带 `Domain`,三条缺一条浏览器就丢弃。这意味着没有子域能覆盖它。

`Path` 不是安全边界,只是发送范围的提示。同源的脚本可以往任意路径写 Cookie,也可以用一个隐藏的 `iframe` 指向 `/admin` 让 Cookie 被带上。不要用 `Path` 当权限隔离。

## 同步器令牌

SameSite 是浏览器层的,老浏览器、非浏览器客户端、以及同站子域的场景都可能绕过。服务端还得自己验一次。

同步器令牌(synchronizer token)的做法:会话建立时生成一个随机串存在服务端,渲染页面时把它写进表单或 `meta`;提交时带上,服务端比对。

```html
<meta name="csrf-token" content="8f3c...随机 32 字节" />
<form method="POST" action="/api/profile">
  <input type="hidden" name="_csrf" value="8f3c...随机 32 字节" />
</form>
```

```js
const token = document.querySelector('meta[name="csrf-token"]').content;

await fetch('/api/profile', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
  body: JSON.stringify(payload),
});
```

它为什么有效:攻击者的页面在 `evil.com`,受同源策略限制,读不到 `bank.example.com` 页面里的 `meta` 内容,也就拿不到令牌。而令牌必须出现在请求里,表单自动提交带不上。

三个实现要点:

- 令牌要绑定会话,不能全局共用一个常量;
- 用 `crypto.randomUUID()` 不够,32 字节以上随机值才够,服务端用 `crypto.randomBytes(32)` 之类;
- 登录成功后要换一个新令牌,防会话固定。

## 双提交与签名双提交

同步器令牌要在服务端存状态,分布式部署时得共享存储。双提交(double submit)换了个思路:把同一个随机值同时写进 Cookie 和请求参数,服务端比对两者是否一致。

攻击者能带上 Cookie(浏览器自动带),但读不到 Cookie 的值,也就无法把相同的值放进请求参数。

问题在于子域。子域可以往父域写 Cookie,一旦有任何一个子域被攻陷,攻击者就能种一个自己知道的 Cookie 值,双提交失效。补救是签名双提交:Cookie 里放 `随机值 + HMAC(随机值, 服务端密钥)`,服务端验签,子域没有密钥就伪造不出来。

能存服务端状态时,优先用同步器令牌,逻辑更直白。

## Origin 与 Referer 校验

浏览器在跨源请求上会带 `Origin` 头,它由浏览器写入,页面脚本改不了。服务端直接比对:

```js
function checkOrigin(req, res, next) {
  const origin = req.get('origin');
  const allowed = ['https://app.example.com'];

  if (origin) {
    if (!allowed.includes(origin)) return res.status(403).end();
    return next();
  }

  // 老客户端可能只有 Referer
  const referer = req.get('referer');
  if (referer && !allowed.some((o) => referer.startsWith(`${o}/`))) {
    return res.status(403).end();
  }
  return next();
}
```

要注意 `Origin` 可能是字符串 `null`,出现在沙箱 iframe、`file://` 页面、以及某些跨源重定向之后。把 `null` 当合法值放行等于没校验。

`Referer` 会被 `Referrer-Policy: no-referrer` 剥掉,也可能被代理删改,只能当兜底,不能当唯一依据。两者都缺失时,对写操作直接拒绝比放行安全。

这一层适合放在网关或中间件上,对所有非 GET 请求统一执行,不依赖每个接口自己记得。

## GET 不该有副作用

`<img src="https://bank.example.com/transfer?to=x&amount=10000">` 这一行没有任何脚本,页面加载就会发请求。`<link rel="prefetch">`、`<link rel="preload">`、CSS 里的 `url()` 都能做到同样的事。

这类请求是顶层导航之外的子资源请求,`Lax` 不带 Cookie,能挡下来。但如果有人为了兼容把关键 Cookie 设成 `None`,或者服务端允许 GET 写数据,这条路就通了。

所以规则是硬的:GET、HEAD 只读。删除、转账、状态变更一律 POST/PUT/DELETE,并且要求令牌或 Origin 校验。改接口时把「用 GET 图省事」当成 bug 处理。

顺带一层:要求写接口必须带自定义头(比如 `X-Requested-With` 或 `X-CSRF-Token`)。自定义头会让请求变成非简单请求,必须先过预检,而预检发生在请求发出之前,攻击者的源拿不到 `Access-Control-Allow-Origin` 的授权就发不出去。这层和令牌叠加,成本很低。

## 小结

- CSRF 靠浏览器自动带 Cookie 成立,攻击者不需要读响应;
- `SameSite=Lax` 已是默认值,挡掉大部分跨站 POST;`Strict` 会打断外链进来的登录态;`None` 必须配 `Secure`;
- Cookie 作用域越小越好,会话 Cookie 用 `__Host-` 前缀,别设父域 `Domain`;
- 同步器令牌要求攻击者读不到页面内容,是最可靠的一层;双提交省状态但对子域敏感;
- `Origin` 校验由浏览器写入且脚本改不了,注意 `null` 与缺失的情况;
- GET 只读,写操作一律 POST 起,并叠加令牌或自定义头。
