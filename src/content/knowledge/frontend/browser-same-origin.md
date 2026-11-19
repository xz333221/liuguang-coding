---
title: 同源策略、CORS 与 iframe 沙箱
summary: '源由协议、主机、端口决定,同源策略拦的是读取而不是发送。CORS 用 Origin 与预检授权读响应,带凭证时不能用通配符;iframe 靠 sandbox 收紧权限,postMessage 要校验 origin。'
category: frontend
node: frontend-browser-same-origin
order: 53
level: 深入
tags: [浏览器, 同源策略, CORS, iframe]
updated: 2026-11-19
mindmap: browser-same-origin.mindmap.json
terms: []
sources:
  - title: MDN · 同源策略
    url: https://developer.mozilla.org/zh-CN/docs/Web/Security/Same-origin_policy
    note: 源的定义与受限制的跨源操作。
  - title: MDN · 跨源资源共享(CORS)
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS
    note: 简单请求、预检与凭证的完整规则。
  - title: WHATWG · Fetch Standard
    url: https://fetch.spec.whatwg.org/
    note: 跨源请求与响应过滤的规范定义。
---

前面几篇都在单个页面内部,页面与页面之间的边界还没碰。脚本要读另一个域的数据,或者把别人的页面嵌进自己的页面,就会遇到同源策略;它规定了哪些跨源操作可以直接做,哪些必须由对方明确授权。

## 源由三部分组成

源(origin)由协议、主机、端口三者决定,路径、查询、片段都不参与。

| 页面 A | 页面 B | 是否同源 | 原因 |
| --- | --- | --- | --- |
| `https://example.com/a` | `https://example.com/b` | 是 | 路径不同不影响 |
| `https://example.com` | `http://example.com` | 否 | 协议不同 |
| `https://example.com` | `https://example.com:8443` | 否 | 端口不同 |
| `https://example.com` | `https://api.example.com` | 否 | 主机不同 |
| `https://example.com` | `https://example.com:443` | 是 | 443 是 https 的默认端口 |

「源」与「站点」(site)不是一回事。站点按可注册域判断,`a.example.com` 与 `b.example.com` 属于同一站点,但不同源。Cookie 的 `SameSite` 按站点算,同源策略按源算,两套边界经常被混为一谈。

## 同源策略限制什么

它约束的是读取,不是发送:

- `fetch` 与 XHR:跨源请求可以发出,响应默认不能被脚本读取;
- iframe:跨源的 `window` 不能读 `contentDocument`,也读不到 DOM;
- canvas:跨源图片画进画布后画布被污染,`toDataURL`、`getImageData` 抛 `SecurityError`;
- 存储:`localStorage`、`IndexedDB`、`Cache Storage` 按源隔离;
- `script`、`img`、`link`、`video`:可以跨源加载并执行或显示,但脚本读不到它们的内容。

表单提交、`<a>` 跳转、`<img>` 请求都能跨源发出,因为它们是导航或加载,不是读取。CSRF 利用的正是「能发不能读」这一点,所以防 CSRF 要靠 CSRF token 与 `SameSite`,不能指望同源策略。

## CORS:授权与预检

跨源读取的标准方案是 CORS(Cross-Origin Resource Sharing,跨源资源共享)。浏览器自动带上 `Origin`:

```http
GET /api/items HTTP/1.1
Host: api.example.com
Origin: https://app.example.com

HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://app.example.com
Vary: Origin
```

服务器同意时,把请求的来源写进 `Access-Control-Allow-Origin`。这个头可以是具体源,也可以是 `*`。用 `*` 时任何源都能读,适合公开接口;需要按源区分时,服务器读 `Origin` 再回填,并加 `Vary: Origin`,否则中间缓存可能把 A 站的响应发给 B 站。

响应头缺失或源不匹配时,请求已经发出,服务器也可能已经处理,只是浏览器不把响应交给脚本,控制台报 「blocked by CORS policy」。CORS 保护的是读取,不能替代服务端鉴权。

### 简单请求与预检

不是所有跨源请求都要先问一遍。同时满足以下条件的叫简单请求,直接发出:

- 方法是 `GET`、`HEAD`、`POST` 之一;
- 只带 `Accept`、`Accept-Language`、`Content-Language`、`Content-Type` 等少数安全头;
- `Content-Type` 限于 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`。

其余情况先发一个 `OPTIONS` 预检(preflight):

```http
OPTIONS /api/items HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, x-token

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: content-type, x-token
Access-Control-Max-Age: 600
```

预检里 `Access-Control-Request-Method` 与 `Access-Control-Request-Headers` 说明真实请求要用什么,服务器在 `Allow-Methods` 与 `Allow-Headers` 里逐项回答。

`Access-Control-Max-Age` 决定预检结果缓存多少秒,期间同样的请求不再预检。值太大时改配置不容易生效,太小则每次请求多一个往返。

`application/json` 不在简单请求的 `Content-Type` 里,所以「POST 一段 JSON」几乎必然触发预检。这是项目里最常见的预检来源。

## 带凭证的跨源请求

默认情况下跨源请求不带 Cookie。要带,前端得显式开启:

```js
const res = await fetch('https://api.example.com/me', {
  credentials: 'include',
});
```

XHR 对应 `xhr.withCredentials = true`。服务端必须同时满足两条:

- `Access-Control-Allow-Origin` 是具体源,不能是 `*`;
- `Access-Control-Allow-Credentials: true`。

缺一条浏览器都会丢弃响应。这条限制的道理很直接:通配符加凭证等于允许任何站点带着用户身份读数据。

Cookie 本身还要过 `SameSite` 这一关。跨站请求默认只带 `SameSite=Lax` 的 Cookie,而且仅在顶层导航时带;需要跨站携带时设 `SameSite=None`,并且必须加 `Secure`。

响应头默认只有少数几个能读,比如 `Content-Type`、`Cache-Control`。要读自定义头,服务端得用 `Access-Control-Expose-Headers: X-Total-Count` 这样的声明把它暴露出来,前端才能取到。

## iframe 与 sandbox

嵌入第三方页面时,iframe 是独立的浏览上下文,同源策略照样生效:跨源 iframe 的 DOM 读不到。

`sandbox` 属性进一步收紧权限,不写任何 token 时最严格:

```html
<iframe
  src="https://widget.example.com/panel"
  sandbox="allow-scripts allow-forms"
></iframe>
```

| token | 放开的能力 |
| --- | --- |
| `allow-scripts` | 执行脚本 |
| `allow-forms` | 提交表单 |
| `allow-popups` | `window.open` 与弹窗 |
| `allow-same-origin` | 保留原源,可读自身存储与同源资源 |
| `allow-top-navigation` | 导航顶层页面 |
| `allow-modals` | `alert`、`confirm` 等模态框 |
| `allow-downloads` | 触发下载 |

关键坑:`allow-scripts` 与 `allow-same-origin` 同时给,iframe 里的脚本就拿到同源身份,可以访问父页面的 DOM,也可以移除自己的 `sandbox` 属性再刷新,沙箱等于没开。只有内容确实同源、并且完全信任时才这样组合。

对第三方内容,保留 `allow-scripts`,去掉 `allow-same-origin`,让它落在不透明源(opaque origin)上。此时访问 `localStorage`、`IndexedDB`、`document.cookie` 会失败,需要存储就把数据 `postMessage` 给父页面代管。

## postMessage 与来源校验

跨源通信只能走 `postMessage`:

```js
// 父页面:第二个参数限定接收方,不要写 '*'
iframe.contentWindow.postMessage(
  { type: 'init', theme: 'dark' },
  'https://widget.example.com',
);

// iframe 内:两个校验都要做
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.example.com') return;
  if (event.source !== window.parent) return;
  handle(event.data);
});
```

`event.origin` 防伪造来源,`event.source` 确认对方是预期的窗口。只判断 `event.data.type` 不够,任何页面都能向你的窗口发消息。接收方还应把 `data` 当成不可信输入,校验字段类型与取值范围。

发送方的 `targetOrigin` 写成 `'*'`,意味着当前窗口里的任何文档都能收到,消息里有 token 或用户信息就泄露了。调试时图省事写下,上线前一定要改回来。

`document.domain` 曾被用来放宽同源限制,让 `a.example.com` 与 `b.example.com` 互访。这个 setter 已被废弃,现代浏览器逐步禁用,新代码不要再用;需要跨子域通信就用 `postMessage`。

## 跨源隔离与 SharedArrayBuffer

`SharedArrayBuffer` 允许主线程与 Worker 共享同一块内存,但它能构造出高精度计时,曾被用于 Spectre 类攻击。浏览器要求页面处于跨源隔离状态才允许使用。

开启需要两个响应头:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

满足后 `window.crossOriginIsolated` 为 `true`,`SharedArrayBuffer` 与 `performance.measureUserAgentSpecificMemory` 才可用。代价是 COEP 下的所有跨源资源都要显式授权,图片、脚本、iframe 缺 `CORP` 头或 CORS 就会被拦掉,接入前要先把资源清单过一遍。

## 小结

- 源由协议、主机、端口决定,路径不参与,默认端口算同源;
- 同源策略限制读取而不阻止发送,CSRF 与 CORS 是两件不同的事;
- 简单请求直接发,其余先 `OPTIONS` 预检,结果由 `Access-Control-Max-Age` 缓存;
- 带凭证时 `Allow-Origin` 必须是具体源,且 `Allow-Credentials` 为 `true`;
- `sandbox` 里 `allow-scripts` 与 `allow-same-origin` 同时出现,等于没开沙箱;
- `postMessage` 要校验 `origin` 与 `source`,`targetOrigin` 不要写 `*`;
- `SharedArrayBuffer` 需要 COOP 与 COEP 开启跨源隔离。
