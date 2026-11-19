---
title: 实时数据：WebSocket 与 SSE
summary: '要「别人改了我也能看到」, 三条路: 轮询、SSE、WebSocket。SSE 是服务端单向推送, 走普通 HTTP, EventSource 只支持 GET 且会自动重连, 靠 Last-Event-ID 续传。WebSocket 是全双工, 握手一次 101 之后走帧协议。两者都要自己补心跳和退避重连, 否则中间设备一断, 页面就一直静默。'
category: frontend
node: frontend-data-realtime
order: 78
level: 进阶
tags: [WebSocket, SSE, 实时, 重连]
updated: 2026-11-19
mindmap: data-realtime.mindmap.json
terms: [protocol]
sources:
  - title: MDN · WebSocket
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket
    note: 构造函数、readyState 与 close 状态码。
  - title: MDN · 使用服务器发送事件
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events/Using_server-sent_events
    note: text/event-stream 的字段格式与重连行为。
  - title: MDN · EventSource
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource
    note: 只能发 GET、自动重连与 Last-Event-ID。
---

第 13 章讲乐观更新那篇的乐观更新让「我自己的操作」立刻可见, 但「别人改了什么」还是得等下一次请求。协作编辑、订单状态、消息通知这类场景, 靠刷新拿不到及时性, 得让服务端主动推。

## 三种方案

| | 短轮询 | SSE | WebSocket |
| --- | --- | --- | --- |
| 方向 | 客户端拉 | 服务端推 | 双向 |
| 协议 | HTTP | HTTP | 握手后升级为帧协议 |
| 自动重连 | 无 | 有, 内置 | 无, 自己写 |
| 消息格式 | 任意 | 文本 | 文本或二进制 |
| 典型场景 | 低频状态查询 | 通知、日志、行情 | 聊天、协作、游戏 |

短轮询是每 5 秒发一次请求问「有新的吗」。实现最省事, 代价是空请求多、延迟最多等于间隔。数据几分钟才变一次的场景, 它反而是最合适的。

SSE 与 WebSocket 都保持一条长连接, 区别在方向与协议。只需要服务端往下推的, 选 SSE: 它就是个不结束的 HTTP 响应, 网关、鉴权、日志都按 HTTP 处理, 运维成本低。

## WebSocket 握手

`new WebSocket('wss://example.com/chat')` 发出去的其实是一个 HTTP GET, 带三个额外的头:

```text
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务端同意就返回 `101 Switching Protocols`, 并带上用 key 算出来的 `Sec-WebSocket-Accept`。之后这条 TCP 连接不再走 HTTP, 改成帧 (frame) 格式, 双向都能主动发。

`ws://` 与 `wss://` 的关系和 `http://` 与 `https://` 一样。https 页面里连 `ws://` 会被当成混合内容拦掉, 所以线上只能用 `wss://`。

浏览器的 API 很小: `send()` 发, `onmessage` 收, `close()` 关, `readyState` 是 0 到 3。

```js
const ws = new WebSocket('wss://example.com/chat');

ws.onopen = () => ws.send(JSON.stringify({ type: 'join', room: 'general' }));
ws.onmessage = (e) => handle(JSON.parse(e.data));
ws.onclose = (e) => console.log('关闭', e.code, e.reason);

console.log(ws.readyState); // 0 CONNECTING, 1 OPEN, 2 CLOSING, 3 CLOSED
```

`send()` 在 `CONNECTING` 状态下调用会抛 `InvalidStateError`。常见写法是先把要发的消息攒进数组, `onopen` 里一次性 flush。

## 心跳

TCP 连接可以被中间的代理、负载均衡悄悄回收。两端都不知道, 一边以为还连着, 发出去的消息全部落进黑洞。这就是为什么需要心跳。

浏览器的 `WebSocket` **没有 `ping()` 方法**。协议层确实有 ping/pong 帧, 浏览器收到 ping 会自动回 pong, 但 JS 看不到也发不出。所以应用层要自己造一个:

```js
let heartbeat;
let lastSeen = Date.now();      // ws.onmessage 里每次收到消息都刷一下

function startHeartbeat(ws) {
  heartbeat = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));

    // 两个心跳周期没有任何下行数据, 说明这条连接已经死了
    if (Date.now() - lastSeen > 60_000) ws.close(4000, 'heartbeat timeout');
  }, 25_000);
}

function stopHeartbeat() {
  clearInterval(heartbeat);
}
```

间隔要比中间设备的空闲超时短。Nginx 的 `proxy_read_timeout` 默认 60 秒, 云负载均衡常见 60 到 300 秒, 所以 25 到 30 秒发一次是安全的。

只发 ping 不检查 pong 的心跳是假心跳: 连接已经断了, `readyState` 还是 `OPEN`, 定时器照样在往一条死连接里写。真正可靠的信号只有一个, 就是「最近有没有收到数据」。

## 断线重连

`onclose` 一定会触发, 不管是正常关闭还是网络断了。重连不能立刻重试, 否则服务端重启时几千个客户端会同时回来, 把它再打挂一次。

```js
function connect({ attempt = 0 } = {}) {
  const ws = new WebSocket('wss://example.com/chat');

  ws.onopen = () => {
    attempt = 0;                       // 成功一次就把退避清零
    startHeartbeat(ws);
  };

  ws.onclose = (e) => {
    stopHeartbeat();
    if (e.code === 1000) return;       // 正常关闭, 不再重连

    const wait = Math.min(30_000, 1000 * 2 ** attempt) * (0.5 + Math.random());
    setTimeout(() => connect({ attempt: attempt + 1 }), wait);
  };

  return ws;
}
```

`1000` 是正常关闭, 用户主动退出或页面卸载时会带这个码, 不该重连。`1006` 是异常断开, 这个码只出现在 `onclose` 的事件里, 客户端不能主动发。

退避公式和第 13 章第一篇重试那套是同一个: 指数增长、上限 30 秒、加随机抖动。

还有两件事要补: 页面切到后台时暂停重连 (`document.visibilityState`), 避免十几个后台标签页持续打服务端; 重新连上后要补拉一次全量数据, 因为断线期间的消息收不到。

## SSE

SSE 的服务端响应是一个不结束的 HTTP 报文, `Content-Type` 必须是 `text/event-stream`:

```text
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

retry: 3000
id: 1001
event: order
data: {"id":1001,"status":"paid"}

: 这是一行注释, 用作保活

data: 第一行
data: 第二行
```

规则不多: `data:` 是内容, 多行会拼成一行用 `\n` 连接; `event:` 指定事件名; `id:` 会存下来, 重连时通过 `Last-Event-ID` 请求头发回去; `retry:` 指定重连间隔毫秒数。每条消息之间用一个空行分隔。

```js
const es = new EventSource('/api/stream', { withCredentials: true });

es.onopen = () => console.log('已连接');
es.onmessage = (e) => append(e.data);
es.addEventListener('order', (e) => updateOrder(JSON.parse(e.data)));
es.onerror = () => console.log('断开, 浏览器会自动重连', es.readyState);
```

`EventSource` 的限制很硬: **只能发 GET, 不能自定义请求头**。鉴权只能靠 Cookie (`withCredentials`) 或者把 token 放进 query。要发 POST 或用 `Authorization` 头, 只能用 `fetch` 自己读流, 那就得手动实现解析和重连。

自动重连是内置的, 默认约 3 秒一次, 没有退避。服务端长时间不可用时, 它会一直按固定间隔敲门。要控节奏, 就在服务端下发 `retry:`。

`Last-Event-ID` 是断线续传的关键。浏览器重连时自动带上最后一次收到的 `id`, 服务端读这个请求头, 从它之后的事件开始补发, 中间的消息就不会丢。服务端只要在每次 `res.write` 时带上递增的 `id:`, 续传的逻辑就有了依据。

## 坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 连接看着正常, 但收不到消息 | 只有发送端心跳, 没检测回应 | 记录最后收消息时间, 超时主动 close |
| 服务端重启后瞬间被打满 | 所有客户端同时重连 | 指数退避加随机抖动 |
| SSE 消息一阵一阵地到 | 代理开了缓冲 | 响应头加 `X-Accel-Buffering: no`, 或定期发注释保活 |
| 同一域名第 7 个 SSE 连不上 | HTTP/1.1 同域 6 连接上限 | 走 HTTP/2 或减少长连接 |
| 页面关掉后还在重连 | 定时器没清 | 卸载时 `close()` 并清定时器 |
| https 页面里 WebSocket 连不上 | 用了 `ws://` | 换 `wss://` |

最后补一句选型: 只需要服务端推, 用 SSE, 代码量是 WebSocket 的三分之一; 需要客户端频繁上行, 比如光标位置、按键事件, 才用 WebSocket。两者都可以用, 但别为了「实时」两个字直接上 WebSocket。

## 小结

- 只往下推用 SSE, 要双向用 WebSocket, 低频状态用短轮询反而最省事;
- WebSocket 靠一次 HTTP Upgrade 握手换成帧协议, 线上必须用 `wss://`;
- 浏览器的 WebSocket 没有 ping 方法, 心跳要在应用层做, 并且必须检查回应;
- 重连用指数退避加抖动, `1000` 正常关闭不要重连, 重连后补拉全量数据;
- `EventSource` 只支持 GET、不能自定义头, 自动重连但无退避, 靠 `retry:` 控制;
- `Last-Event-ID` 让 SSE 断线后从断点续传, 服务端必须按它补发。
