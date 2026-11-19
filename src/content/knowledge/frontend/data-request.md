---
title: 请求层封装：错误、超时与重试
summary: 'fetch 只在网络层出错时 reject, 4xx 与 5xx 都是正常返回, 所以错误必须自己判。一次请求要分开三层错误: 网络失败、HTTP 状态码、业务码。超时用 AbortSignal.timeout, 重试只给幂等请求, 配合指数退避与 Retry-After, 否则重试会把一次下单变成三次。'
category: frontend
node: frontend-data-request
order: 74
level: 进阶
tags: [数据请求, fetch, 错误处理, 重试]
updated: 2026-11-19
mindmap: data-request.mindmap.json
terms: []
sources:
  - title: MDN · Fetch API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API
    note: fetch 的 Promise 何时 reject、Response.ok 的含义。
  - title: MDN · AbortSignal.timeout()
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal/timeout_static
    note: 超时触发时 reason 为 TimeoutError。
  - title: MDN · HTTP 响应状态码
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status
    note: 429 与 5xx 的语义, 决定哪些状态可以重试。
---

第 12 章最后一篇《渲染模式:CSR / SSR / SSG / islands》把「HTML 在哪一端生成」拆成了四种, 但四种模式都躲不开同一个问题: 数据从哪来。服务端渲染那次请求失败, 用户拿到的是 500 页面; 客户端渲染那次请求失败, 用户盯着骨架屏一直转。`fetch` 只给了一行 API, 剩下的判断全在业务侧。

## fetch 不看状态码

```js
const res = await fetch('/api/orders/999'); // 服务端返回 404
console.log(res.status); // 404
console.log(res.ok);     // false
// 没有进 catch, 控制台一行报错都没有
```

`fetch` 的 Promise 只在网络层失败时 reject: 断网、DNS 解析不出来、被 CORS 拦下、请求被 abort。只要响应头到了, 哪怕是 500, Promise 也是 fulfilled。

于是「接口挂了但页面没反应」几乎都是这个原因: 代码写在 `catch` 里判断失败, 而 4xx 根本不走 `catch`。`res.json()` 拿到的是错误响应的正文, 类型不符合预期, 后面在渲染处炸掉, 报错位置离真正的原因隔了好几层。

正确的入口只有一条: 先看 `res.ok`, 再决定要不要读正文。

## 三层错误

一次请求其实有三种失败, 处理方法各不相同。

| 层次 | 典型表现 | 怎么发现 | 能不能重试 |
| --- | --- | --- | --- |
| 网络层 | 断网、DNS 失败、CORS 拒绝 | `fetch` reject, `TypeError` | 网络恢复后可重试 |
| HTTP 层 | 404、401、500、503 | `res.ok === false` | 429 与 5xx 可重试, 4xx 不行 |
| 业务层 | 200 + `{ code: 40001 }` | 自己判响应体 | 一般不可, 重试也是同样结果 |

业务层那行最容易被漏掉。很多后端约定 HTTP 状态永远是 200, 用 `code` 字段区分成败, 前端如果只判 `res.ok`, 会把「余额不足」当成成功, 把 `null` 当成数据塞进列表。

还有一种混合情况: 网关返回 200, 里面的 `code` 是 `500`。这时代码必须两层都判, 不能只看一层。

## 一个能用的 request

```ts
class ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;

  constructor(message: string, init: { status?: number; code?: string; retryAfter?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status ?? 0;
    this.code = init.code;
    this.retryAfter = init.retryAfter;
  }
}

async function request<T>(url: string, init: RequestInit & { timeout?: number } = {}): Promise<T> {
  const { timeout = 8000, headers, ...rest } = init;

  const res = await fetch(url, {
    ...rest,
    headers: { 'content-type': 'application/json', ...headers },
    signal: AbortSignal.timeout(timeout),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? `HTTP ${res.status}`, {
      status: res.status,
      code: body?.code,
      retryAfter: Number(res.headers.get('retry-after')) || undefined,
    });
  }

  if (res.status === 204) return undefined as T; // 没有正文, 直接 json() 会抛错

  const data = await res.json();
  if (data?.code !== undefined && data.code !== 0 && data.code !== '0') {
    throw new ApiError(data.message ?? '业务失败', { status: res.status, code: String(data.code) });
  }
  return data as T;
}
```

`res.json()` 在正文为空时抛 `SyntaxError: Unexpected end of JSON input`, 204 和 205 必须提前返回。同理, 接口返回 `text/plain` 或 HTML 错误页时也会在这里炸, 所以 `catch(() => null)` 不是可选的美化, 而是必要的兜底。

`AbortSignal.timeout` 触发的拒绝 `name` 是 `TimeoutError`, 和用户主动取消的 `AbortError` 分开, 埋点时能看出是超时多还是用户跑得快。

## 重试的前提是幂等

幂等 (idempotent) 指同一个请求发一次和发十次, 服务端的结果一样。GET、HEAD、PUT、DELETE 幂等, POST 不幂等, PATCH 看具体实现。

所以「统一给所有请求加重试」是个危险的默认值: 用户点了一次「提交订单」, 第一次请求超时但服务端已经建单, 重试又建了一单。前端看到的是一次点击, 用户收到两条发货通知。

```js
const RETRYABLE = new Set([408, 429, 502, 503, 504]);

function shouldRetry(err) {
  if (err?.name === 'AbortError') return false;      // 用户取消, 别重试
  if (err?.name === 'TimeoutError') return true;     // 超时可以再来一次
  if (err instanceof TypeError) return true;         // 网络层失败
  if (err instanceof ApiError) return RETRYABLE.has(err.status);
  return false;
}
```

值得重试的是「这次不行, 下次可能行」: 429 限流、502 网关错误、503 服务不可用、504 网关超时。400、401、403、404、422 重试多少次都是同一个结果, 401 还要走刷新令牌的流程, 直接重试会打成死循环。

500 通常也不该重试。它是服务端代码抛异常, 不是临时拥塞, 重试只会让日志多几倍。

## 退避与 Retry-After

重试不能立刻发。服务刚被打挂, 三毫秒后同时回来一百个重试, 只会再挂一次。

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, { retries = 2, base = 300, cap = 8000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;

      const backoff = Math.min(cap, base * 2 ** attempt); // 300, 600, 1200 ...
      const jitter = backoff * (0.5 + Math.random());     // 打散同时重连的客户端
      const wait = err.retryAfter ? err.retryAfter * 1000 : jitter;

      await sleep(wait);
    }
  }
}
```

`2 ** attempt` 是指数退避, `cap` 防止退到几十秒。加随机抖动是因为一批客户端往往在同一时刻失败, 没有抖动它们会一起回来。

`Retry-After` 是服务端给的答案, 优先级高于自己算的值。它的值有两种格式: 秒数 (`Retry-After: 120`) 和 HTTP 日期 (`Retry-After: Wed, 21 Oct 2026 07:28:00 GMT`)。上面只处理了秒数, 遇到日期格式 `Number()` 会得到 `NaN`, 走回退分支。真要严谨, 先 `Number.isFinite` 判一次, 不是数字就 `Date.parse`。

## 坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 接口 500 页面毫无反应 | 只在 `catch` 里处理失败 | 先判 `res.ok` |
| 一次点击产生两笔订单 | 给 POST 加了自动重试 | 只给幂等请求重试, 或带幂等键 |
| 401 之后请求疯狂重复 | 401 被当成可重试状态 | 401 走刷新令牌, 不重试 |
| 重试次数用完, 用户等了 20 秒 | 退避没有上限 | `cap` 封顶, 总时长控制在 10 秒内 |
| 前端超时了, 服务端还在跑 | 超时只是断开了等待 | 关键写操作配幂等键, 见第 13 章讲乐观更新那篇 |

超时时间要分层: 列表页 5 秒, 详情页 8 秒, 导出这类长任务走异步接口, 不要靠把 `timeout` 调到 60 秒解决。用户不会等, 只会刷新。

## 小结

- `fetch` 只在网络层失败时 reject, 4xx 与 5xx 都是 fulfilled, 必须自己判 `res.ok`;
- 错误分三层: 网络、HTTP 状态码、业务码, 封装时把三者收进同一个错误类型;
- 超时用 `AbortSignal.timeout`, `TimeoutError` 与 `AbortError` 要分开处理;
- 重试只对幂等请求, 408、429、502、503、504 与网络失败可重试, 4xx 不行;
- 退避用 `base * 2 ** n` 加随机抖动, 有 `Retry-After` 时优先听服务端的;
- 204 没有正文, 读 JSON 之前先返回, 否则报的是 JSON 解析错误而不是业务问题。
