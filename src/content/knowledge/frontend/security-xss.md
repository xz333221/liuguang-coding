---
title: XSS：注入点与防御
summary: 'XSS 是把不可信输入当代码执行,分存储型、反射型、DOM 型三类,区别在 payload 从哪来、在哪被执行。innerHTML、eval、document.write 是主要注入点,textContent 安全;编码必须按上下文分开做,富文本用白名单库;HttpOnly 挡不住 XSS 发起的同源请求。'
category: frontend
node: frontend-security-xss
order: 97
level: 深入
tags: [安全, XSS, 注入, 富文本]
updated: 2026-11-19
mindmap: security-xss.mindmap.json
terms: []
sources:
  - title: OWASP · Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
    note: 按上下文分类的编码规则与输出点清单。
  - title: MDN · Element.innerHTML
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Element/innerHTML
    note: innerHTML 解析字符串为 HTML 的行为,以及脚本不执行的例外。
  - title: MDN · 内容安全策略(CSP)
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
    note: 作为纵深防御的 CSP 配置说明。
---

第 16 章最后一篇讲覆盖率与 CI 门禁,测试保证改动不回归。测试管的是「代码改坏了没有」,管不到「输入越界了没有」。一条用户昵称从数据库流到页面上,中间没经过任何测试能发现的错误,但它可以在另一个用户的浏览器里执行任意脚本。

这就是 XSS(Cross-Site Scripting,跨站脚本)。名字里的「跨站」容易误导,它跟跨域没关系,本质是把自己的数据当成别人的代码跑了。

## 三类 XSS 的差别

按 payload(攻击载荷)的来源和落点分三类:

| 类型 | payload 存在哪 | 谁把它拼进页面 | 典型入口 |
| --- | --- | --- | --- |
| 存储型 | 服务端数据库 | 服务端模板或前端渲染 | 评论、昵称、工单、个人简介 |
| 反射型 | URL 参数 | 服务端 | 搜索结果页回显关键词 |
| DOM 型 | URL 片段或参数 | 前端 JS | `location.hash` 驱动的路由 |

存储型危害最大,一次提交对所有访问者生效,不需要额外诱导。

反射型要受害者点一个构造好的链接,服务端把参数原样写进 HTML 才成立。它依赖服务端拼接,现代框架的自动转义基本堵住了这条路。

DOM 型全程不经过服务端。payload 放在 `#` 后面,连访问日志里都没有,服务端的 WAF(Web Application Firewall,Web 应用防火墙)看不到,只能在前端解决。

防御动作也因此不同:前两类在输出点编码就能挡住,DOM 型必须管住 JS 里那些把字符串当 HTML 或代码处理的位置。

## 危险的 sink

sink 指「把字符串当代码或 HTML 处理」的那个函数。输入(source)本身无害,流到 sink 才出事。

| 写法 | 实际行为 | 该换成 |
| --- | --- | --- |
| `el.innerHTML = s` | 解析 s 为 HTML | `el.textContent = s` |
| `el.outerHTML = s` | 同上,连元素自身一起换 | DOM API 重建节点 |
| `el.insertAdjacentHTML(pos, s)` | 同上 | `insertAdjacentText` |
| `document.write(s)` | 往文档流里写并解析 | 用 DOM API 插入 |
| `eval(s)` / `new Function(s)` | 执行任意代码 | `JSON.parse` 或真正的解析器 |
| `setTimeout(s, 0)` | 字符串形式等同 eval | 传函数 `setTimeout(fn, 0)` |
| `el.setAttribute('href', s)` | `javascript:` 伪协议可执行 | 白名单校验协议 |

前四个是 HTML 上下文,后三个是代码上下文,防御手段不同。

最常写错的一行:

```js
// 错:昵称里带 <img src=x onerror=alert(document.cookie)> 就直接执行
list.innerHTML = items.map((it) => `<li>${it.nickname}</li>`).join('');

// 对:结构用 DOM 建,文本用 textContent
const ul = document.createElement('ul');
for (const it of items) {
  const li = document.createElement('li');
  li.textContent = it.nickname;
  ul.append(li);
}
list.replaceChildren(ul);
```

`textContent` 把 `<` 当普通字符写进文本节点,浏览器不会重新解析。角括号在页面上照常显示为 `<`,如果需要显示成 `&lt;` 是渲染细节,不需要自己转。

`setAttribute('href', ...)` 这一条常被漏掉。属性名合法不代表属性值合法:

```js
// 用户输入 "javascript:alert(document.cookie)"
link.setAttribute('href', userInput);

// 先解析成 URL,只放行白名单协议
function safeHref(input) {
  let url;
  try {
    url = new URL(input, location.origin);
  } catch {
    return '#';
  }
  const allowed = ['http:', 'https:', 'mailto:'];
  return allowed.includes(url.protocol) ? url.href : '#';
}
```

`new URL` 会把 `java\tscript:alert(1)` 这类夹杂控制字符的写法归一化,得到的 `protocol` 是 `javascript:`,直接落进黑名单之外的分支。手写正则匹配 `^javascript:` 会漏掉大小写、前导空白、`\t` `\n` 等变体,不要自己拼。

`data:text/html,<script>...` 也是同一类问题,`iframe` 的 `src` 和 `srcdoc` 都要按 URL 处理。

## 上下文决定编码方式

同一个字符串,放进不同的位置需要不同的转义。用一套 HTML 实体编码应付所有位置,在属性里会失效。

| 上下文 | 示例 | 处理方式 |
| --- | --- | --- |
| HTML 文本 | `<p>{{x}}</p>` | 转义 `& < > " '` |
| HTML 属性 | `<a title="{{x}}">` | 值加引号 + 属性编码 |
| URL 查询参数 | `/search?q={{x}}` | `encodeURIComponent` |
| URL 协议位 | `<a href="{{x}}">` | 协议白名单,不只是编码 |
| JS 字符串 | `const a = '{{x}}'` | `JSON.stringify` |
| CSS 值 | `style="color:{{x}}"` | 尽量不拼,改用类名 |

两个高频坑。

属性值不加引号:`<a title={{x}}>` 时,输入 `x onmouseover=alert(1)` 里的空格会闭合属性并开一个新属性,后面的编码做得再好也没用。属性值永远加引号。

`encodeURIComponent` 不是万能的:它不转义 `'` `(` `)` `!` `*`,所以拼进单引号包裹的属性里,一个 `'` 就能跳出。它只适合放在 URL 参数位,不适合当通用转义函数。

还有一类反向错误:在入库时转义。把 `Tom & Jerry` 存成 `Tom &amp; Jerry`,页面上再转一次就显示成 `Tom &amp; Jerry`。编码是输出时的事,存储保持原始值,否则导出 CSV、发邮件、给 App 用时全是脏数据。

## 富文本:白名单,不是黑名单

文章正文、邮件预览、Markdown 渲染结果需要保留一部分 HTML,不能整体 `textContent`。这时的做法是先清洗再插入。

黑名单(`on\w+` 属性一律删、`<script>` 一律删)注定失败:

- 事件属性不止 `onerror`、`onclick`,新标签会带来新事件,比如 `<svg><animate onbegin=...>`;
- 标签可以用属性变形绕过,`<img/src=x/onerror=alert(1)>` 不带空格也合法;
- mXSS(mutation XSS)利用浏览器解析与序列化不一致,清洗一遍看起来干净,插进 DOM 后重新解析又变成可执行。

用白名单库,DOMPurify 是事实标准:

```js
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(rawHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
  ALLOWED_ATTR: ['href', 'title'],
});

article.innerHTML = clean;
```

`ALLOWED_TAGS` 之外的一律丢弃,`on*` 事件属性和 `javascript:` 链接默认就在黑名单里。需要放图片时也不要直接放行 `src`,先用 `ADD_DATA_URI_TAGS` 或自定义 hook 校验域名,否则 `img` 的 `onerror` 又回来了。

还要给外链补 `rel`:

```js
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('http')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
```

清理后仍要防「二次插入」:把 `clean` 存回后端再取出来渲染,等于信了上次的结果。只要进 DOM,就当作不可信。

## 框架里的口子

现代框架默认转义插值,`{{ msg }}`、`{msg}`、`v-text` 都是安全的。风险集中在显式声明的「我确定这是 HTML」的开关上。

```jsx
// React:名字已经写了 dangerous
<div dangerouslySetInnerHTML={{ __html: article.content }} />

// 正确做法是先清洗
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }} />
```

Vue 的 `v-html`、Angular 的 `bypassSecurityTrustHtml` 是同一件事,都是一句「跳过转义」。review 时看到这几个词就应该问一句:内容来源是谁写的。

还有几个框架不帮你管的地方:

- `href` 和 `src` 的协议,React 从 16 起对 `javascript:` 有告警,但只是开发环境的 console 提示,不是拦截;
- 服务端渲染时把用户输入拼进 `<title>`、`<meta content>`、内联 `<script>` 的 JSON,这些都不是元素子节点,模板转义规则不覆盖;
- `iframe` 的 `srcdoc` 是完整 HTML 文档,和 `innerHTML` 同级危险。

## HttpOnly 挡不住什么

一个常见误解是「Cookie 设了 HttpOnly,中了 XSS 也没事」。

HttpOnly 只是让 `document.cookie` 读不到这个 Cookie。而 XSS 已经在你的源里执行了,它可以直接 `fetch('/api/transfer', { method: 'POST', ... })`,浏览器照样自动带上 Cookie,响应也照样能读。攻击者根本不需要看到令牌。

如果令牌没设 HttpOnly,攻击者能把它带走,在别的机器上长期使用,影响时间从「页面存活期」拉长到「令牌有效期」。这是 HttpOnly 的真实价值,它降低的是泄露后果,不是阻止攻击。

会话 Cookie 把属性配齐:

```http
Set-Cookie: __Host-session=abc123; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```

带 `__Host-` 前缀的 Cookie 必须同时满足 `Secure`、`Path=/`、且不带 `Domain`,浏览器否则直接丢弃。这样即使某个子域被攻陷,也无法用 `Domain=.example.com` 覆盖它。

`Content-Security-Policy` 是另一层,下一章展开。它能压缩 XSS 的可执行空间,但挡不住 DOM 型的全部形态,只能当纵深防御。

## 小结

- 存储型、反射型、DOM 型的区别在 payload 的来源和落点,防御动作也不同;
- `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write` 是 HTML 注入点,`eval`、`new Function`、字符串版 `setTimeout` 是代码注入点;
- `textContent` 与 DOM API 建节点是安全的默认选择,拼结构不要拼字符串;
- 编码按上下文分开做,属性值必须加引号,URL 协议位要用白名单而不是正则;
- 富文本只能白名单清洗,DOMPurify 是可用基线,清洗结果不要回存;
- `dangerouslySetInnerHTML`、`v-html` 是显式放弃转义,内容来源必须可控;
- `HttpOnly` 挡的是令牌被读走,挡不住 XSS 发起的同源请求。
