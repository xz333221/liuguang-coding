---
title: fetch、响应流与上传下载
summary: 'fetch 只在网络层失败时 reject,404 与 500 都正常 resolve，判断成功要看 response.ok。响应体是 ReadableStream，可以边下边读；取消靠 AbortSignal；上传用 FormData 不能设 Content-Type，下载用 Blob 加 createObjectURL 后要 revoke。'
category: frontend
node: frontend-dom-fetch
order: 46
level: 进阶
tags: [DOM, fetch, ReadableStream, 上传下载]
updated: 2026-11-19
mindmap: dom-fetch.mindmap.json
terms: []
sources:
  - title: MDN · 使用 Fetch
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch
    note: 请求配置、响应处理与 body 只能读一次的限制。
  - title: MDN · Response
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Response
    note: ok、status、body 与 bodyUsed 的语义。
  - title: web.dev · 流式请求
    url: https://web.dev/articles/fetch-streaming-requests
    note: ReadableStream 与请求体流式发送的实践。
---

上一篇把数据留在了浏览器本地。数据要真正到达服务端，或者从服务端取回文件，走的是 `fetch`。它的行为跟直觉有出入，尤其是「什么时候算失败」这一点。

## 只有网络层失败才 reject

`fetch` 返回的 Promise 在两种情况下会 reject:请求发不出去(断网、DNS 失败、连接被拒)，或者被 CORS 拦下。这两种都表现为一个 `TypeError`,`message` 是 `Failed to fetch`。

HTTP 状态码不在其中。404、500、401 全都会让 Promise 正常 resolve,`response.status` 如实反映：

```js
const res = await fetch('/api/user/1');
console.log(res.status);  // 404
console.log(res.ok);      // false
```

`response.ok` 在 `status` 落在 200-299 时为 `true`。业务代码里 `await fetch(...)` 之后直接 `res.json()`，在 500 时拿到的是错误页的 HTML,`JSON.parse` 抛 `SyntaxError: Unexpected token '<'`。这是最常被误判成「接口挂了」的一种情况，实际是代码没检查状态码。

正确写法是先看 `ok`，再读 body:

```js
async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}
```

还有一类 `status: 0` 的响应，出现在 `mode: 'no-cors'` 的请求里。这种响应是 opaque 的，`ok` 恒为 `false`,`status` 恒为 `0`,body 读不出来。跨域要拿数据就得让对方配 CORS,`no-cors` 只能用来发一些不关心结果的请求。

## 请求配置

几个字段决定了请求长什么样：

| 配置 | 作用 | 默认值 |
| --- | --- | --- |
| `method` | 请求方法 | `GET` |
| `headers` | 请求头，`Headers` 对象或普通对象 | 空 |
| `body` | 请求体，只允许在非 GET/HEAD 上出现 | 无 |
| `credentials` | 是否携带 Cookie | `same-origin` |
| `signal` | 取消信号 | 无 |

跨域请求要带 Cookie 时，`credentials` 必须显式写成 `'include'`，同时服务端要返回 `Access-Control-Allow-Credentials: true` 且不能把 `Access-Control-Allow-Origin` 设成 `*`。少任何一个，响应都拿不到。

发 JSON 要自己序列化并声明类型：

```js
await fetch('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sku: 'A-1', qty: 2 }),
});
```

`Content-Type: application/json` 会触发 CORS 预检，浏览器先发一个 `OPTIONS` 问服务端是否允许。这一步是自动的，但服务端不处理 `OPTIONS` 就会看到「请求根本没到业务接口」。

## body 是流，只能读一次

`response.body` 是一个 `ReadableStream`，不是字符串。`res.json()`、`res.text()`、`res.blob()` 都是把整条流读完再转换，读完流就关闭了，`res.bodyUsed` 变成 `true`。再调用一次 `res.json()` 会抛 `TypeError: Body has already been consumed`。

需要读两遍时先克隆：

```js
const res = await fetch('/api/log');
const copy = res.clone();
const data = await copy.json();      // 一份用于解析
console.log(await res.text());       // 另一份留作日志
```

`clone()` 会把整个 body 缓冲在内存里，大文件不要这么做。

要边下边处理，直接拿 reader:

```js
const res = await fetch('/big-file.bin');
const total = Number(res.headers.get('Content-Length')) || 0;
const reader = res.body.getReader();
const chunks = [];
let loaded = 0;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
  loaded += value.byteLength;
  if (total) console.log(`${((loaded / total) * 100).toFixed(1)}%`);
}
```

`reader.read()` 每次返回 `{ done, value }`,`value` 是 `Uint8Array`。拼成文本要用 `TextDecoder`，注意多字节字符可能被切在两个 chunk 之间，得用 `decoder.decode(chunk, { stream: true })` 保留残余字节。

进度条有两个已知偏差：`Content-Length` 是压缩后的大小(响应头带 `Content-Encoding: gzip` 时)，而后面的字节是解压后的，算出来的百分比会虚高；分块传输(chunked)时压根没有 `Content-Length`。精确进度只能在服务端返回准确长度时才有。

## 取消与超时

取消靠 `AbortSignal`，第 7 章讲过的机制在这里直接用：

```js
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 3000);

try {
  const res = await fetch('/api/search?q=vue', { signal: controller.signal });
  console.log(await res.json());
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('已取消或超时');
  } else {
    throw err;
  }
} finally {
  clearTimeout(timer);
}
```

取消时抛出的也是 `DOMException`,`name` 为 `'AbortError'`，和网络失败要分开处理，否则超时会被当成接口错误上报。浏览器另外提供了 `AbortSignal.timeout(3000)`，省掉手动定时器。

注意取消只终止前端的等待，请求可能已经到达服务端并执行了写操作。对 `POST` 做取消，要考虑服务端的幂等。

## 上传：FormData 与 Content-Type

上传文件用 `FormData`，请求体直接传这个对象：

```js
const fd = new FormData();
fd.append('file', input.files[0]);
fd.append('title', '季度报表');

await fetch('/api/upload', { method: 'POST', body: fd });
```

这里**不要**设 `Content-Type`。浏览器会自动写成 `multipart/form-data; boundary=----WebKitFormBoundary...`，后面的 `boundary` 是随机串，用来分隔各个字段。手动设成 `'multipart/form-data'` 会把这段随机串冲掉，服务端无法切分字段，表现为解析报错或者收到空文件。

同理，`Headers` 对象里如果存在 `Content-Type`，浏览器就不再自动补，即使值是空字符串也一样。要设其他头可以设，唯独这个交给浏览器。

`fetch` 没有上传进度。`XMLHttpRequest` 有 `upload.onprogress`，大文件上传要进度条时仍然得用它，或者改用分片上传自己算。

## 下载

下载的做法是把响应转成 `Blob`，再借 `<a download>` 触发：

```js
async function download(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = href;
  a.download = filename;         // 只对同源 URL 生效
  a.click();

  URL.revokeObjectURL(href);     // 用完立即释放
}
```

`URL.createObjectURL` 生成的是 `blob:` 开头的临时地址，它绑定在当前文档上，不手动释放就一直占着内存直到页面卸载。循环下载几十个文件而不 `revoke`，内存会一路涨上去。

`blob()` 会把整个文件读进内存，几百 MB 的文件在低端机上容易崩。大文件更适合让服务端返回直链，或者配合 `Content-Disposition: attachment` 让浏览器原生下载。

跨域下载时 `a.download` 会被忽略，浏览器变成直接打开。想指定文件名，只能靠服务端的 `Content-Disposition`。

## 小结

- `fetch` 只在网络层失败与 CORS 失败时 reject,4xx / 5xx 正常 resolve，判断成功必须看 `response.ok`;
- 响应体是 `ReadableStream`，转换方法读一次就消费掉，`bodyUsed` 为真后再读会报错；
- 流式读取可以边下边算进度，但 `Content-Length` 在压缩与分块场景下不可靠；
- 取消靠 `AbortSignal`，抛出的 `AbortError` 要和真实失败分开处理；
- 上传用 `FormData` 且不设 `Content-Type`,`boundary` 必须由浏览器生成；
- 下载用 `Blob` 加 `URL.createObjectURL`，用完要 `revokeObjectURL`。
