---
title: 图片、字体与媒体
summary: '首屏字节里图片和字体占大头。选对格式、用 srcset 按屏给尺寸、给图片写死宽高比，再用 font-display 与字体子集避免文字闪动，这几步通常比改打包配置收益更直接。'
category: frontend
node: frontend-performance-media
order: 86
level: 进阶
tags: [性能, 图片, 字体, AVIF, 懒加载]
updated: 2026-11-19
mindmap: performance-media.mindmap.json
terms: []
sources:
  - title: web.dev · Serve responsive images
    url: https://web.dev/articles/serve-responsive-images
    note: srcset 与 sizes 的写法,以及按视口选图的规则。
  - title: web.dev · Optimize web fonts
    url: https://web.dev/articles/optimize-web-fonts
    note: 字体子集化、preload 与 font-display 的取舍。
  - title: MDN · Responsive images
    url: https://developer.mozilla.org/zh-CN/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images
    note: picture、srcset 与 sizes 的语义差异。
---

上一篇把连接和请求时机安排好了，但请求真正下载多少字节，取决于资源本身。首屏传输里图片常常过半，字体紧随其后。这一篇从格式、尺寸、加载时机三处往下压。

## 先选格式

同一张照片，格式不同体积能差几倍：

| 格式 | 相对体积 | 透明 | 适用 |
| --- | --- | --- | --- |
| JPEG | 基准 | 否 | 老浏览器兜底，照片 |
| WebP | 通常比 JPEG 小 25%-35% | 是 | 现在的主力格式 |
| AVIF | 通常比 WebP 再小一截 | 是 | 追求体积，接受稍慢的编解码 |
| PNG | 大 | 是 | 需要无损、需要精确像素 |
| SVG | 取决于路径复杂度 | 是 | 图标、插画、Logo |

AVIF 压缩率最好，但编码慢，解码也比 WebP 费一点 CPU。图片量大时在构建期预先生成，不要放到运行时转。图标优先用 SVG，矢量在任何 DPR 下都清晰，体积还常常小于一张位图。

## 按屏给尺寸

一张 2000px 宽的图塞进 320px 的卡片，下载的像素有八成被丢掉。`srcset` 提供多个候选，`sizes` 告诉浏览器它会被渲染多宽，由浏览器自己选：

```html
<img
  src="/photos/city-800.jpg"
  srcset="/photos/city-480.jpg 480w,
          /photos/city-800.jpg 800w,
          /photos/city-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 800px"
  width="800" height="450"
  alt="夜景">
```

`sizes` 描述的是布局宽度，不是图片的像素宽度。上面的写法意思是：窄屏时占满视口，宽屏时占 800px。浏览器再乘上设备像素比，在候选里挑最接近的一档。

漏写 `sizes`,`srcset` 里的 `w` 描述符就失去参考，浏览器会按 `100vw` 估算，手机上容易选到大图。`width` 与 `height` 这两个属性仍要写，它们让浏览器提前算出宽高比，给图片留好位置，否则图片加载完把内容顶下去，CLS 直接超标。

## 懒加载的边界

`loading="lazy"` 让图片接近视口时才发请求，首屏请求数能少一大截：

```html
<!-- 折叠线以下,可以懒加载 -->
<img src="/list/1.avif" alt="" loading="lazy" decoding="async" width="320" height="240">

<!-- 首屏主图,绝对不要懒加载 -->
<img src="/hero.avif" alt="" fetchpriority="high" width="1200" height="600">
```

懒加载的判定依赖浏览器对滚动位置的预测，给首屏图加上它，等于把 LCP 往后推一个网络往返。判断标准是「这张图在初始视口内吗」，在就正常加载，不在才懒加载。

`decoding="async"` 是另一个提示：让浏览器把解码放到主线程之外，避免大图解码时卡住一帧。它不改变下载时机，只影响解码调度。

## 用 picture 做格式回退

`srcset` 只能在同一格式里选，要按格式回退得用 `<picture>`:

```html
<picture>
  <source type="image/avif" srcset="/hero-800.avif 800w, /hero-1600.avif 1600w" sizes="100vw">
  <source type="image/webp" srcset="/hero-800.webp 800w, /hero-1600.webp 1600w" sizes="100vw">
  <img src="/hero-800.jpg" alt="" width="800" height="450" fetchpriority="high">
</picture>
```

浏览器按顺序取第一个能解码的 `<source>`。AVIF 不认识就落到 WebP，再不行用 `<img>` 里的 JPEG。`<img>` 不能省，它既是兜底，也是实际渲染的元素——`alt`、`width`、`height` 都写在它身上。

## 字体：先别让它挡住文字

网页字体默认是「先等，等不到再用后备字体」，这段等待期文字不可见(FOIT)，用户看到的就是一片空白。`font-display` 决定这段等待怎么处理：

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-subset.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF, U+4E00-9FFF;
}
```

- `swap`:立刻用后备字体显示，自定义字体到了再换，文字一直可见，代价是一次字体切换；
- `optional`:给字体很短的时间窗，来不及就整页都用后备字体，本次访问不再切换；
- `block`:短暂不可见，最长约 3s，不推荐；
- `fallback`:介于 `block` 与 `swap` 之间。

正文用 `swap` 还是 `optional`，取决于字体对品牌有多重要。`optional` 的体验最稳，不会有切换闪动，但弱网用户可能永远看不到自定义字体。

切换带来的位移可以用 `size-adjust` 与 `ascent-override` 这类描述符压小：给后备字体声明一个调整过的度量，让它和自定义字体的行高、字宽接近，切换时行数变化就少。

体积上做三件事：只留需要的字重、按 `unicode-range` 切分子集、优先 `woff2`。中文字体全量动辄几 MB，不做子集化基本没法用在首屏。

```html
<link rel="preload" href="/fonts/inter-subset.woff2" as="font" type="font/woff2" crossorigin>
```

首屏用到的字体值得 `preload`，同样别忘了 `crossorigin`。折叠线以下才用的字重不用预加载，`font-display: swap` 已经够。

## 视频与动图

`<video>` 默认会预加载元数据甚至一部分内容，一个自动播放的背景视频能轻松吃掉几 MB:

```html
<video src="/loop.mp4" poster="/loop-poster.avif" preload="none"
       autoplay muted loop playsinline width="1280" height="720"></video>
```

- `preload="none"`:只等播放再下载，配 `poster` 保证首屏有画面；
- `muted` 加 `playsinline`:移动端自动播放的前提，少了任何一个都不会自动播；
- `width` 与 `height` 仍然要写，给视频占好位置。

动图优先换成 `<video>` 或 AVIF 序列。一张几 MB 的 GIF 换成同等画质的 MP4，体积常能降到十分之一，还能被浏览器按需解码。

## 小结

- 照片优先 WebP，追求体积用 AVIF，图标用 SVG,PNG 只留给需要精确像素的场景；
- `srcset` 配 `sizes` 才能让浏览器选对尺寸，`width`/`height` 用来占位防 CLS;
- `loading="lazy"` 只给折叠线以下的资源，首屏图用了会直接拖慢 LCP;
- `<picture>` 负责格式回退，兜底的 `<img>` 必须写全属性；
- 字体用 `font-display: swap` 或 `optional`，配合子集化与 `preload` 减少等待；
- 视频设 `preload="none"` 加 `poster`，自动播放需要 `muted` 与 `playsinline`。
