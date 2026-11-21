---
title: 图标、字体与静态资源
summary: '图标优先内联 SVG 或 sprite，并让描边跟着 currentColor 走；字体用 font-display: swap 换首屏可读性，用 size-adjust 与 unicode-range 控住抖动和体积；preload 只给首屏真正用到的那一份，中文全量字体绝不能预加载。'
category: frontend
node: frontend-style-assets
order: 83
level: 入门
tags: [SVG, 字体, 图标, 静态资源]
updated: 2026-11-19
mindmap: style-assets.mindmap.json
terms: []
sources:
  - title: MDN · @font-face font-display
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@font-face/font-display
    note: auto、block、swap、fallback、optional 五个取值的加载行为。
  - title: MDN · @font-face unicode-range
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@font-face/unicode-range
    note: 按字符区间切分字体文件,浏览器按需下载。
  - title: MDN · SVG symbol
    url: https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/symbol
    note: 可被 use 复用的图形模板与 viewBox 定义。
---

上一篇把动效收进可控范围，系统要求减少动态时最多只花 0.01ms；界面怎么变、变多快都定了，剩下的问题在体积上： 图标、字体和图片。第 15 章讲预算与指标，这一篇只管这三类资源怎么引入才不出错。

## 图标的三种形态

| 形态 | 体积 | 换色 | 可访问性 | 适合 |
| --- | --- | --- | --- | --- |
| 内联 SVG | 跟着 HTML 走，gzip 后很小 | `currentColor` | 可控 | 少量、需要单独动画 |
| SVG sprite | 一个文件加多次 `<use>` | `currentColor` | 可控 | 几十个图标、同一页面复用 |
| 图标字体 | 一个字体文件，几十 KB | `color` | 差 | 只适合存量项目 |

图标字体的问题不是体积，是语义： 字符落在 Unicode 私有使用区，读屏会把它读成一个莫名其妙的字或者干脆不读，某个字符缺字时显示成方框，而 `font-display` 的时机还会让图标闪一下。新项目不要再用。

## SVG sprite 与 currentColor

```html
<svg xmlns="http://www.w3.org/2000/svg" hidden>
  <symbol id="icon-close" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </symbol>
</svg>

<button class="icon-button" type="button" aria-label="关闭">
  <svg class="icon" aria-hidden="true"><use href="#icon-close" /></svg>
</button>
```

```css
.icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: -0.125em;
}

.icon-button {
  color: var(--color-muted);
}

.icon-button:hover {
  color: var(--color-text);
}
```

三处细节决定这套东西能不能用：

- `stroke="currentColor"` 写在 `symbol` 上，图标才会跟着父元素的 `color` 走。写成 `#333`，深色主题里就是一块黑。
- `width: 1em` 让图标与旁边的文字同高。用固定 `16px` 时，用户把字号调到 20px，图标会明显偏小。
- `viewBox` 必须与图形坐标一致。同一套图标统一到 24×24 网格，否则并排时会一大一小。

`sprite` 内联在页面顶部时，`<use href="#id">` 是同文档引用，没有跨域问题。引用外部文件 `<use href="/sprite.svg#icon-close">` 会受同源策略限制，`currentColor` 的继承在跨文档时也不可靠，所以要么内联 sprite，要么把图标做成组件。

`symbol` 的 `id` 全页唯一。两个 sprite 里有同名 `id` 时，后定义的会覆盖先定义的，现象是某个图标「串成了别的图」，而且构建工具不会报错。

## 字体加载

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin.woff2') format('woff2');
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+2000-206F;
}
```

`font-display` 的五个取值差别在「阻塞多久」和「之后换不换」:

| 取值 | 阻塞期 | 之后 |
| --- | --- | --- |
| `auto` | 由浏览器决定，通常接近 `block` | 换 |
| `block` | 约 3s，期间文字不可见 | 换 |
| `swap` | 约 0，立即用后备字体 | 换，产生 FOUT |
| `fallback` | 约 100ms | 3s 内到就换，之后不换 |
| `optional` | 约 100ms | 由浏览器决定，弱网下可能整次不用 |

正文用 `swap`: 首屏立刻可读，字体到了再替换。标题可以用 `optional`，避免大字号替换时整块跳动。

`swap` 的代价是布局抖动： 后备字体与 web 字体的字宽不同，替换瞬间换行位置全变。用 `size-adjust` 把后备字体的度量调到接近：

```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}

body {
  font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
}
```

`size-adjust` 按百分比缩放字形，`ascent-override` 与 `descent-override` 改行框的上下边界。这三个数字要用工具或实测得出，上面的值只是示意，直接抄会得到另一种错位。

中文的体量问题靠 `unicode-range` 解决： 把一份字体切成上百个区间，页面只用到的字所在的区间会被下载，其余不发请求。Google Fonts 的中文就是这么做，自建时用 `subfont` 或 `glyphhanger` 切分。副作用是请求数变多，HTTP/2 下可以接受，HTTP/1.1 下要谨慎。

## preload 要克制

```html
<link rel="preload" href="/fonts/inter-latin.woff2"
      as="font" type="font/woff2" crossorigin>
```

`as="font"` 与 `type` 都不能省，`crossorigin` 更是必须写： 字体请求按 CORS 规则发起，漏了 `crossorigin` 浏览器会认为预加载的文件与实际请求的不是同一个，再下载一次，预加载等于白做，控制台还会给出警告。

其余三条：

- 只预加载首屏第一屏真正渲染的那个字重与字集。预加载 5 个字重就是 5 个高优先级请求，和关键 CSS、首屏 JS 抢带宽。
- 中文全量字体动辄几 MB，预加载它会让 LCP 直接往后推，得不偿失。
- 用了 `unicode-range` 切片的字体，预加载整份文件会绕过分片，把「按需下载」的好处抵消掉。

预加载了但 3 秒内没用上，控制台会提示 resource was preloaded but not used，这类警告基本都是配置残留。

## 图片与静态资源

```html
<img
  src="/cover-800.avif"
  srcset="/cover-400.avif 400w, /cover-800.avif 800w, /cover-1600.avif 1600w"
  sizes="(min-width: 960px) 640px, 100vw"
  width="1600" height="900"
  alt="产品截图"
  fetchpriority="high"
  decoding="async">
```

- `width` 与 `height` 给出宽高比，浏览器提前预留空间，图片到达时不推动内容。CSS 里配 `img { max-width: 100%; height: auto }` 保持比例。
- `srcset` 与 `sizes` 让浏览器按实际显示宽度挑文件。只写 `srcset` 不写 `sizes`，默认按 100vw 算，窄容器里会挑过大的图。
- 首屏图用 `fetchpriority="high"`，其余图 `loading="lazy"`。给首屏图加 `lazy` 是常见的反模式，会把加载推迟到布局完成之后。
- 文件名带内容哈希(`app.3f9a1c.css`)，才能配 `Cache-Control: max-age=31536000, immutable`；文件名不变就只能用短缓存。

字体与图片都要注意授权： 商用字体分 web 授权与客户端授权，只打包有 web 授权的子集；图标库要确认许可证是否要求保留署名。

## 小结

- 图标用内联 SVG 或 sprite,`stroke="currentColor"` 加 `width: 1em`，自动跟随文字颜色与字号；
- sprite 的 `symbol` id 必须全页唯一，跨文档 `<use>` 有同源与样式继承限制；
- 正文 `font-display: swap`，标题可用 `optional`,`size-adjust` 减小替换时的抖动；
- 中文靠 `unicode-range` 切片按需下载，切片后不要整份 preload;
- 字体 preload 必须带 `as="font"`、`type` 与 `crossorigin`，只给首屏真正用的那一份；
- 图片给宽高比、给 `srcset` 与 `sizes`，首屏图不要 `lazy`。
