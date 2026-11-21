---
title: 缓存策略与 CDN
summary: '带内容哈希的静态资源可以缓存一年并标 immutable,HTML 必须每次验证，接口按可共享性区分 s-maxage 与 private。CDN 的命中率取决于缓存键与 Vary，回源只应该发生在真正失效的时候。'
category: frontend
node: frontend-performance-cache
order: 89
level: 进阶
tags: [性能, 缓存, Cache-Control, CDN, ETag]
updated: 2026-11-19
mindmap: performance-cache.mindmap.json
terms: []
sources:
  - title: MDN · Cache-Control
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Cache-Control
    note: max-age、immutable、stale-while-revalidate 等指令的语义。
  - title: web.dev · HTTP caching
    url: https://web.dev/articles/http-caching
    note: 强缓存与协商缓存的配合,以及带哈希文件名的策略。
  - title: MDN · Vary
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/Vary
    note: 缓存键随请求头变化的机制与命中率影响。
---

前面几篇都在减少一次请求的成本：压字节、切代码、拆任务。还有一条更彻底的路——让第二次访问根本不发请求，或者只发一个几十字节的确认。这一篇讲缓存怎么配，以及 CDN 在这中间扮演什么角色。

## 两级缓存

浏览器缓存分两级，先看有没有「没过期且能用」的副本，没有再问服务器「我这份还能用吗」:

| 类型 | 依据 | 结果 | 典型响应头 |
| --- | --- | --- | --- |
| 强缓存 | `Cache-Control: max-age` | 直接读本地，不发请求 | `max-age=31536000` |
| 协商缓存 | `ETag` / `Last-Modified` | 发请求，服务器回 304 或 200 | `ETag: "a1b2c3"` |

强缓存期间连请求都没有，速度最快，但代价是「过期前改不了」。协商缓存每次都要一个往返，但内容没变时只回 304，没有响应体。

两者的关系是：强缓存先判断，过期后进入协商；服务器回 304 就复用本地副本，回 200 就换新的。

```text
请求资源
  │
  ├─ 本地有副本且未过期 ────────────► 直接用(200 from cache)
  │
  └─ 已过期或必须验证
        │ 带上 If-None-Match
        ▼
      服务器
        ├─ 内容未变 ► 304,复用本地
        └─ 内容已变 ► 200 + 新内容
```

## 内容哈希配 immutable

现代构建产物文件名里带哈希，如 `app.7f3c9a.js`。内容一变文件名就变，所以同一个 URL 的内容永远不会变，可以放心长缓存：

```text
Cache-Control: public, max-age=31536000, immutable
```

`immutable` 的作用是告诉浏览器：在有效期内，即使用户按刷新，也不要发验证请求。少了它，用户点刷新时浏览器仍会发一个条件请求，移动端弱网下这个往返很明显。

前提是文件名真的带哈希，并且构建工具在内容变化时确实改了哈希。如果部署时覆盖了同名文件，用户会在一年内一直拿到旧版本，只能靠手动清缓存解决。

## HTML 反过来

HTML 是入口，它的 URL 通常固定，不能长缓存，否则新版本永远发不出去：

```text
Cache-Control: no-cache
```

`no-cache` 不是「不缓存」，而是「每次使用前必须向服务器确认」。配合 `ETag`，内容没变时回 304，只有几十字节；内容变了回 200 和新 HTML，里面引用的 JS/CSS 已经是新哈希。

几个指令的区别常被搞混：

| 指令 | 存不存 | 每次验证 | 说明 |
| --- | --- | --- | --- |
| `no-store` | 不存 | — | 完全禁止落盘，含隐私数据时用 |
| `no-cache` | 存 | 是 | 需要验证才能用，适合 HTML |
| `max-age=0, must-revalidate` | 存 | 是 | 与 `no-cache` 接近 |
| `max-age=31536000, immutable` | 存 | 否 | 带哈希的静态资源 |

真正的坑是把 `no-store` 当成 `no-cache` 用。前者完全不缓存，每次都是完整下载，首屏会明显变慢；后者才是想表达的「每次都确认一下」。

## stale-while-revalidate

有些资源可以接受「先旧后新」。`stale-while-revalidate` 让浏览器在过期后一段时间内先返回旧副本，同时在后台发起更新：

```text
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

含义是：60 秒内直接用；60 到 660 秒之间先用旧的，同时后台刷新；超过 660 秒才同步等新内容。

这个策略适合变化不频繁但要「尽快反映」的资源，比如配置、字典、商品列表的首屏快照。用户拿到的是稍旧的数据，但完全没有等待。

不适合的是价格、库存、余额这类必须准确的字段，以及带用户身份的响应。

## CDN 的共享缓存

CDN 位于用户与源站之间，它缓存的是共享副本，所以要区分「浏览器能存多久」与「CDN 能存多久」:

```text
Cache-Control: public, max-age=0, s-maxage=600, stale-while-revalidate=60
```

- `max-age` 给浏览器，这里设 0，让浏览器每次都来问；
- `s-maxage` 只对共享缓存(CDN)生效，600 秒内不回源；
- `private` 表示只允许浏览器缓存，CDN 必须不存。带登录态的接口不加这个，可能把一个用户的响应发给另一个用户。

回源次数直接决定源站压力。命中率高的时候，源站只需要处理少量请求；命中率掉下来，CDN 反而成了放大流量的中间层。

## Vary 与缓存键

`Vary` 声明「这个响应随哪些请求头变化」:

```text
Vary: Accept-Encoding
```

意思是同一 URL 下，gzip 与 br 两份内容要分开缓存。漏了它，可能把 brotli 版本发给不支持 brotli 的客户端。

常见错误是 `Vary: User-Agent`。UA 的取值几乎无限，缓存键随之爆炸，命中率接近零，CDN 形同虚设。要按设备分流，用独立的 URL 或 `Vary` 里放一个取值有限的头。

## 验证缓存是否生效

改完配置别只看文档，直接看响应头：

```bash
curl -sI https://example.com/assets/app.7f3c9a.js | grep -i -E 'cache-control|age|etag|x-cache'
```

几个字段的读法：

- `cache-control` 是否就是你配的那串，有没有被中间的代理改写；
- `age` 表示这份副本在缓存里放了多少秒，持续增长说明命中了；
- `x-cache` 是多数 CDN 的命中标记，`HIT` 与 `MISS` 一眼能看出来；
- `etag` 存在与否决定协商缓存能不能生效。

再按一次刷新，看 DevTools 的 Network 面板：Size 列显示 `(disk cache)` 或 `(memory cache)` 是强缓存命中；状态码 304 是协商缓存命中；两者都没有就是完整下载。

## 小结

- 强缓存不发请求，协商缓存发请求但可能只回 304，两者按过期时间衔接；
- 带内容哈希的静态资源配 `max-age=31536000, immutable`，普通刷新也不再验证；
- HTML 用 `no-cache`，靠 ETag 换 304，新版本才能及时发出去；
- `no-store` 是完全不缓存，别拿它当 `no-cache` 用；
- `s-maxage` 控制 CDN,`private` 阻止 CDN 存带身份的响应；
- `Vary` 决定缓存键，`Vary: User-Agent` 会让命中率归零。
