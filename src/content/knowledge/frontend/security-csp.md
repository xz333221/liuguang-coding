---
title: CSP 与 Trusted Types
summary: 'CSP 用响应头声明允许加载和执行的资源来源,把 XSS 从「随便执行」压成「只能加载白名单里的东西」。nonce 与 hash 是主流做法,strict-dynamic 配合现代打包器;unsafe-inline 与 nonce 同时出现时会被忽略;Trusted Types 从 sink 侧收口,目前只有 Chromium 系支持。'
category: frontend
node: frontend-security-csp
order: 99
level: 进阶
tags: [安全, CSP, Trusted Types, 响应头]
updated: 2026-11-19
mindmap: security-csp.mindmap.json
terms: []
sources:
  - title: MDN · 内容安全策略(CSP)
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
    note: 指令列表、回退关系与报告机制。
  - title: web.dev · Content security policy
    url: https://web.dev/articles/csp
    note: nonce、strict-dynamic 与迁移路径的实践说明。
  - title: MDN · Trusted Types API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Trusted_Types_API
    note: require-trusted-types-for 与策略创建方式。
---

上一篇的防御都落在服务端和 Cookie 上,能挡住「借用户身份发请求」,挡不住「脚本已经在页面里跑了」。CSP 补的是这一块:即使有一处输出没转义,也让注入进来的脚本跑不起来。

CSP(Content Security Policy,内容安全策略)是一条响应头,声明这个页面允许从哪加载什么、允许执行什么。

## 一条响应头

```http
Content-Security-Policy: default-src 'self'; img-src 'self' https://cdn.example.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
```

语义是白名单:没被列出的来源一律拒绝。`'self'` 表示同源,`'none'` 表示什么都不许。

生效范围是这个文档里发起的一切加载与执行,包括 `script`、`style`、`img`、`font`、`connect`(`fetch`、XHR、WebSocket)、`frame`。违规时浏览器拦截请求,控制台报 `Refused to load ... because it violates the following Content Security Policy directive`。

多个同名头会取交集,更严的那个生效。也可以用 `;` 分隔写成一条策略。

## default-src 的继承

没写的指令会回退到 `default-src`,但不是所有指令都回退。

| 会回退到 `default-src` | 不会回退,必须单写 |
| --- | --- |
| `script-src`、`style-src`、`img-src`、`font-src` | `base-uri` |
| `connect-src`、`media-src`、`object-src`、`frame-src` | `form-action` |
| `worker-src`、`manifest-src`、`prefetch-src` | `frame-ancestors`、`report-uri` |
| `child-src` | `sandbox`、`require-trusted-types-for` |

`frame-ancestors` 不回退这条很关键。只写 `default-src 'self'` 并不能阻止别人用 iframe 嵌你的页面,要点名写 `frame-ancestors 'none'`。它是 `X-Frame-Options` 的替代品,后者只有 `DENY` 和 `SAMEORIGIN` 两个值。

`base-uri` 也要单写。页面里如果被注入了 `<base href="https://evil.com/">`,所有相对路径的脚本和表单都会指向攻击者的域,而 `default-src 'self'` 管不到这个。

`object-src 'none'` 建议无脑加上,`<object>`、`<embed>` 现在几乎没有正当用途,却是历史上不少绕过的入口。

## nonce:每次响应一个新值

域名白名单的问题在于,只要某个 CDN 上有一个能上传文件的路径,攻击者就能把脚本传上去,再从你的白名单域名加载。

nonce 换了个思路:只允许带指定随机值的 `<script>` 执行。

```html
<!-- 响应头: script-src 'nonce-r4nd0mB64' 'strict-dynamic' -->
<script nonce="r4nd0mB64" src="/assets/main.js"></script>
<script nonce="r4nd0mB64">
  window.__INITIAL_STATE__ = {"user":"tom"};
</script>
```

要点:

- nonce 必须每次响应重新生成,至少 128 位随机,base64 编码;
- 不能缓存复用,CDN 缓存 HTML 时要么跳过 HTML,要么保证 nonce 跟着请求变;
- 属性里的值与头里的值必须逐字节一致,包括大小写。

生成放在服务端中间件里,不要让模板各自拼:

```js
import { randomBytes } from 'node:crypto';

app.use((req, res, next) => {
  const nonce = randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'self'`,
  );
  next();
});
```

静态站没有服务端,做不到每请求一个新 nonce。这种场景用 hash,或者退回到域名白名单。

## hash 与 strict-dynamic

`'sha256-...'` 是对脚本内容做 SHA-256 再 base64,内容不变就永远有效,适合内联的固定脚本。

```bash
# 用文件原始字节,不要多带换行
openssl dgst -sha256 -binary main.js | openssl base64 -A
```

hash 只覆盖脚本的完整内容。打包产物每次构建都变,hash 也就每次都变,得让构建脚本自动注入,手工维护必然出错。

现代打包器还会动态插入 `<script>` 加载 chunk,这些 URL 带 hash,预先写不进白名单。`'strict-dynamic'` 解决这个:带 nonce 或匹配 hash 的脚本被信任,它用 `document.createElement('script')` 插入的脚本自动被信任,一层层传递。

同时,`'strict-dynamic'` 存在时,`script-src` 里的主机白名单(包括 `'self'`)和 `'unsafe-inline'` 全部被忽略。这是刻意的:让策略只依赖 nonce,免疫「CDN 上有可上传文件」这类问题。

两个例外:`document.write` 插入的脚本、以及通过 `innerHTML` 写进去的内联脚本,不受信任传递,仍然会被拦。

老浏览器不认识 `'strict-dynamic'` 时按未知值忽略,退回域名白名单,所以策略里要保留 `'self'` 兜底。

## unsafe-inline 的陷阱

`'unsafe-inline'` 允许内联脚本执行,它一出现,CSP 对 XSS 的防护基本归零。

更常踩的坑是组合写法:`script-src 'self' 'unsafe-inline' 'nonce-abc123'`。很多人以为这样能「新浏览器用 nonce,老浏览器退到 unsafe-inline」。实际行为相反:nonce 或 hash 存在时,浏览器**忽略** `'unsafe-inline'`。新浏览器严格,老浏览器宽松,于是本地测试一切正常,线上某类用户的 XSS 照样能跑,而你不知道。

要么去掉 `'unsafe-inline'`,要么承认没有脚本级防护,不要混着写。

`eval`、`new Function`、字符串版 `setTimeout` 需要单独开 `'unsafe-eval'`,它会打开一串绕过路径。升级到 CSP 时最常见的报错是 `EvalError: Refused to evaluate a string as JavaScript`,来源通常是老版本的地图库、模板引擎,或者 `webpack` 的 `eval` devtool,生产构建换成 `source-map` 就能解决。

Vue 的运行时编译(模板字符串)也用 `new Function`,换成构建时编译的版本可以避开。

## 报告与灰度上线

直接上强制策略会把站点打挂,先跑只报告模式:

```http
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'nonce-abc'; report-to csp-endpoint
Reporting-Endpoints: csp-endpoint="https://app.example.com/csp-report"
```

`Report-Only` 只收集不拦截,违规事件照常发生,浏览器往指定地址 POST 一份报告。先在预发环境跑一周,把报告里的来源一个个补进白名单或改掉,再换成强制模式。

`report-uri` 是旧机制,已被 `report-to`(基于 Reporting API)取代,但两者浏览器支持并不一致,过渡期常常两个都写,报告体格式也不同。

报告里带被拦的 URL、命中的指令和 `document-uri`,这些 URL 可能包含用户数据,收集端要脱敏,别把报告原样写进日志。

## Trusted Types

CSP 管的是「从哪加载」,Trusted Types 管的是「往哪写」。它把 `innerHTML`、`eval`、`script.src` 这些 sink 变成只接受特殊类型:

```js
const policy = trustedTypes.createPolicy('app-policy', {
  createHTML: (input) => DOMPurify.sanitize(input),
  createScriptURL: (input) => {
    const url = new URL(input, location.origin);
    if (url.origin !== location.origin) throw new Error('blocked');
    return url.href;
  },
});

el.innerHTML = policy.createHTML(userHtml);  // 合法
el.innerHTML = userHtml;                     // TypeError
```

配合 `require-trusted-types-for 'script'; trusted-types app-policy`,直接赋字符串会抛 `TypeError: Failed to set the 'innerHTML' property`,不是被清洗,是被类型系统拒绝。任何绕过都必须显式调用策略,而策略名受 `trusted-types` 指令限制,写 `'none'` 表示一个都不许建。

注意 `trusted-types default` 会允许创建名为 `default` 的策略,而 `default` 会被所有 sink 隐式调用,等于把口子开回去了。只给具体名字。

浏览器支持:Chrome、Edge 支持,Firefox 与 Safari 到目前没有实现。它是渐进增强,不能作为唯一防线,写策略时保证「不支持也能跑」。

## 小结

- CSP 是白名单响应头,没列出的来源一律拒绝,多个策略取交集;
- `default-src` 不覆盖 `base-uri`、`form-action`、`frame-ancestors`,这几个必须单写;
- nonce 每请求重新生成且不能被缓存复用,静态站改用 hash;
- `'strict-dynamic'` 让 nonce 脚本动态插入的脚本自动受信,同时忽略域名白名单;
- `'unsafe-inline'` 与 nonce 同时写时会被忽略,这是线上事故的常见来源;
- 先用 `Report-Only` 收集再上强制,报告要脱敏;
- Trusted Types 从写入侧收口,只有 Chromium 系支持,当增强而非基线。
