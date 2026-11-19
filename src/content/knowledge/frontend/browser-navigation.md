---
title: 导航：DNS、TCP / TLS 与 HTTP 缓存
summary: '页面开始解析之前,浏览器要先解析地址、查询 DNS、建立传输连接并完成一次 HTTP 交换。Cache-Control 与 ETag 决定这次交换能否省掉,Service Worker 则可以在网络之前拦截请求。'
category: frontend
node: frontend-browser-navigation
order: 48
level: 深入
tags: [浏览器, DNS, TLS, HTTP 缓存]
updated: 2026-11-19
mindmap: browser-navigation.mindmap.json
terms: ["protocol"]
sources:
  - title: MDN · Web Performance
    url: https://developer.mozilla.org/zh-CN/docs/Web/Performance
    note: 导航与资源加载各阶段的耗时构成。
  - title: MDN · HTTP 缓存
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching
    note: 强缓存与协商缓存的响应头语义。
  - title: web.dev · Learn Performance
    url: https://web.dev/learn/performance
    note: 关键渲染路径与网络层优化的整体视角。
---

上一篇用 IntersectionObserver 与 History 观察页面和地址的变化,那些 API 读取的是浏览器已有的状态;页面本身从哪里来,还没有交代。这一篇从地址栏按下回车开始,把浏览器拿到第一个字节之前的步骤拆开。

## URL 由哪几部分组成

浏览器先解析地址。一个完整的 URL 可以写成:

```text
https://user:pass@example.com:8443/blog/post?id=42#comments
scheme   userinfo  host       port  path      query  fragment
```

- scheme(协议): `https`,同时决定默认端口与是否加密;
- host: 域名,需要解析成 IP 地址;
- port: 省略时按协议取默认值,HTTP 为 80,HTTPS 为 443;
- path 与 query: 交给服务器定位资源;
- fragment: 以 `#` 开头,只在浏览器内部使用,不会发给服务器。

单页应用的 `#/settings` 正是利用 fragment 不参与请求这一点实现路由。改用 History API 后 path 会变化,服务器需要把未知路径统一回退到同一个 HTML,否则刷新会得到 404。

## DNS 解析与缓存

DNS 把域名解析为 IP 地址。查询按由近到远的顺序命中:

1. 浏览器自身的 DNS 缓存;
2. 操作系统的缓存与 hosts 文件;
3. 本地递归解析器,通常由运营商或公共 DNS 提供;
4. 根域名服务器 → 顶级域服务器 → 权威域名服务器。

解析结果是 A 记录(IPv4)或 AAAA 记录(IPv6);CNAME 记录指向另一个域名,需要继续解析。每条记录带 TTL,决定缓存时长。TTL 内修改解析不会立即生效,迁移服务前要提前调低。

DNS 有固定开销,可以在页面中提前声明:

```html
<link rel="dns-prefetch" href="//cdn.example.com">
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

`dns-prefetch` 只做域名解析;`preconnect` 还会建立 TCP 连接并完成 TLS 握手,代价更高,只对确定会用的关键域名使用。

## TCP 与 TLS 握手

拿到 IP 后建立传输连接。HTTP/1.1 使用 TCP,三次握手:

```text
客户端 → 服务器   SYN
服务器 → 客户端   SYN + ACK
客户端 → 服务器   ACK
```

连接建立后,HTTPS 还要完成 TLS 握手:协商版本与密码套件、验证服务器证书、交换密钥。TLS 1.3 把完整握手压缩到一次往返(1-RTT),会话恢复时可以做到 0-RTT。证书验证包含域名匹配与信任链检查,任何一步失败,浏览器都会中断连接。

HTTP/1.1 默认复用连接(keep-alive);HTTP/2 在一条连接上多路复用多个请求,不必为每个资源单独握手;HTTP/3 把传输层换成基于 UDP 的 QUIC,减少握手轮次与队头阻塞。

## HTTP 请求与响应

HTTP(HyperText Transfer Protocol)是基于文本的应用层协议。连接就绪后发送请求,服务器返回响应:

```http
GET /blog/post?id=42 HTTP/1.1
Host: example.com
Accept: text/html
Accept-Encoding: gzip, br
If-None-Match: "a1b2c3"

HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: max-age=3600
ETag: "a1b2c3"
Content-Encoding: br

<!doctype html>...
```

首字节到达之前的时间称为 TTFB(Time To First Byte),由 DNS、连接、排队与服务器处理共同构成。TTFB 偏高时,先判断瓶颈在网络还是服务端,再决定优化方向。

## 强缓存与协商缓存

缓存命中可以完全省掉请求。按是否需要向服务器确认,分为两类。

**强缓存**在有效期内直接使用本地副本,不发起请求:

```http
Cache-Control: max-age=31536000, immutable
Expires: Wed, 19 Nov 2025 08:00:00 GMT
```

`Cache-Control` 的优先级高于 `Expires`。`max-age` 是相对秒数,不受客户端时钟影响;`Expires` 是 HTTP/1.0 的绝对时间,时钟偏差会导致提前或延后失效。文件名带内容哈希的静态资源适合 `max-age` 加 `immutable`。

**协商缓存**在本地副本过期后带上验证信息询问服务器,未变化则返回 304,不传响应体:

```http
If-None-Match: "a1b2c3"
If-Modified-Since: Tue, 18 Nov 2025 10:00:00 GMT
```

服务器比对 `ETag` 与 `Last-Modified`,命中则回复 `304 Not Modified`。`ETag` 精度更高,优先于时间戳。`no-cache` 表示可以缓存但每次使用前都要验证;`no-store` 表示完全不缓存,两者含义不同。

## Service Worker 与资源提示

Service Worker 是注册在某个源下的脚本,充当页面与网络之间的代理。它监听 `fetch` 事件,可以按策略返回缓存或转发请求,运行在独立线程,不阻塞页面,但只能在 HTTPS 或 localhost 下注册。离线优先与资源分级缓存通常由它实现。

除缓存外,导航还可以借助资源提示:

- `preload`: 提前加载当前页面确定要用的资源,如关键字体与首屏图片;
- `prefetch`: 空闲时预取后续可能访问的资源;
- `prerender`: 预先渲染整个页面,支持范围有限,按浏览器实现。

## 一次完整链路的时序

```text
0ms        URL 解析,检查 HSTS 与 Service Worker
0-2ms      强缓存命中则直接使用副本,导航结束
2-20ms     DNS 解析(缓存命中时接近 0)
20-60ms    TCP 三次握手 + TLS 1.3 握手
60-140ms   发送请求,等待首字节(TTFB)
140-260ms  下载 HTML,进入解析
260ms+     DOMContentLoaded,随后是 load
```

数字随网络环境变化,阶段划分不变。排障时按阶段测量,先定位耗时最长的一段,再选择手段:DNS 慢用 `preconnect`,握手慢看边缘节点,TTFB 高查服务端,HTML 体积大则做压缩与流式输出。

## 小结

- URL 由 scheme、host、port、path、query、fragment 组成,fragment 不参与请求;
- DNS 逐级命中缓存,`dns-prefetch` 与 `preconnect` 可以提前完成解析与连接;
- TCP 三次握手建立连接,TLS 1.3 将完整握手压缩到 1-RTT;
- 强缓存看 `Cache-Control` / `Expires`,协商缓存看 `ETag` / `Last-Modified` 与 304;
- Service Worker 位于页面与网络之间,可以拦截请求并实现离线策略;
- 按阶段测量导航耗时,先定位瓶颈再优化。
