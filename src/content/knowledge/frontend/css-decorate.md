---
title: 背景、边框、圆角与阴影
summary: 'background 由颜色、图片、渐变、位置、尺寸与重复方式组成，多层背景用逗号分隔并按层匹配参数；border 需要同时给出宽度与样式，border-radius 控制圆角；outline 不占空间，用于焦点指示；box-shadow 可叠加多层并支持内阴影；filter 处理元素本身，backdrop-filter 处理元素背后的内容。'
category: frontend
node: frontend-css-decorate
order: 15
level: 入门
tags: [CSS, background, border, box-shadow, 圆角]
updated: 2026-11-19
mindmap: css-decorate.mindmap.json
terms: []
sources:
  - title: MDN · CSS 背景与边框
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_backgrounds_and_borders
    note: background、border、border-radius 与 box-shadow 的参考。
  - title: 'web.dev · Learn CSS: Backgrounds'
    url: https://web.dev/learn/css/backgrounds
    note: 背景层、渐变与多重背景的讲解。
  - title: W3C · CSS
    url: https://www.w3.org/Style/CSS/
    note: CSS 规范与工作组入口。
---

上一篇处理完文字本身，页面还缺少包裹内容的表面。背景、边框、圆角与阴影负责盒子的外观，这一篇把它们组合成可复用的卡片与按钮样式。

## background 的组成

`background` 是一组子属性的简写，常用的有：

- `background-color`:背景色；
- `background-image`:背景图或渐变；
- `background-position`:图片在盒子中的位置；
- `background-size`:图片的缩放方式，`cover` 铺满并裁剪，`contain` 完整显示；
- `background-repeat`:是否平铺。

```css
.hero { background: linear-gradient(120deg, hsl(215 70% 25%), hsl(190 60% 35%)) center / cover no-repeat; }
```

渐变是浏览器绘制的图片，不需要图片资源。`linear-gradient(方向, 起点色, 终点色)` 生成线性渐变，`radial-gradient` 生成径向渐变。

多个背景层用逗号分隔，先写的那一层在最上面：

```css
.badge {
  background: url("/icons/check.svg") 8px center / 16px no-repeat,
              linear-gradient(#0a7, #086) center / cover no-repeat;
}
```

每个子属性按顺序与背景层对应：第一层是图标，固定 16px 并靠左居中；第二层是渐变，铺满整个盒子。层数不一致时，列表会循环取值。

## 边框与圆角

`border` 需要宽度、样式、颜色三个部分，样式缺省时边框不显示：

```css
.card { border: 1px solid hsl(220 10% 85%); border-radius: 12px; }
```

`border: 1px #ddd` 写出来看不到线，原因是缺少 `solid` 这样的样式值。常用样式还有 `dashed`、`dotted`、`none`。

`border-radius` 控制圆角半径，四个角可以分别设置：

```css
.avatar { width: 48px; height: 48px; border-radius: 50%; }  /* 正方形变成圆形 */
.pill { border-radius: 999px; }                             /* 胶囊形状 */
```

百分比半径按盒子的宽高分别计算，`50%` 在正方形上是圆，在长方形上是椭圆。斜杠语法 `border-radius: 50% / 20%` 可以分别指定水平与垂直半径。

边框会占用盒子的空间。上一节的 `border-box` 让 `width` 包含边框，否则需要把边框宽度加进尺寸计算。

## outline 与焦点

`outline` 画在盒子外侧，不占布局空间，也不影响相邻元素的位置。它主要用于键盘焦点的指示：

```css
:focus-visible { outline: 2px solid hsl(215 80% 45%); outline-offset: 2px; }
```

`:focus-visible` 只在浏览器判断需要显示焦点时匹配，键盘 Tab 会触发，鼠标点击通常不会。`outline-offset` 让轮廓与边框之间留出间隙。

不要直接写 `outline: none` 去掉焦点框。如果设计上不想用默认样式，应提供同等可见的替代，例如改变背景色或加阴影，否则键盘用户无法判断焦点位置。

## box-shadow

`box-shadow` 的参数依次是水平偏移、垂直偏移、模糊半径、扩散半径与颜色：

```css
.card { box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.08); }
.card--pressed { box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.12); }
```

两层阴影叠加，近处一层勾勒边缘，远处一层形成柔和的投影，比单层大模糊更接近真实光照。加 `inset` 关键字变为内阴影，用于按压态或输入框的凹陷感。

阴影不占布局空间，绘制在盒子外侧，可能覆盖相邻元素。偏移与模糊值越大，性能开销越高，列表中大量卡片应控制阴影层数。

## filter 与 backdrop-filter

`filter` 对元素本身及其子树应用图形效果，例如灰度、模糊、亮度：

```css
.thumb { filter: grayscale(1) contrast(1.1); }
.dialog { background: rgb(255 255 255 / 0.7); backdrop-filter: blur(8px); }
```

`backdrop-filter` 处理元素背后的内容，常用于半透明面板的毛玻璃效果。背景必须有一定透明度，否则看不到背后的模糊结果。

## 溢出裁剪与圆角

`border-radius` 只改变盒子的绘制轮廓，不自动裁剪子元素。图片放在圆角容器里会露出直角，需要配合 `overflow: hidden`:

```css
.media { border-radius: 12px; overflow: hidden; }
.media img { display: block; width: 100%; height: auto; }
```

裁剪范围是 padding box 的圆角轮廓，图片的四个角随之变圆。如果容器还要显示外阴影，把裁剪放在内层元素上，阴影留在外层，否则阴影也会被裁掉。

## 一张卡片与一个按钮

```html
<style>
  .card {
    width: min(320px, 100%);
    border: 1px solid hsl(220 12% 88%);
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 / 0.08);
  }
  .media img { display: block; width: 100%; height: 160px; object-fit: cover; }
  .body { padding: 16px; }
  .btn {
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 16px;
    background: hsl(215 80% 45%);
    color: #fff;
    cursor: pointer;
  }
  .btn:hover { background: hsl(215 80% 38%); }
  .btn:focus-visible { outline: 2px solid hsl(215 80% 45%); outline-offset: 2px; }
</style>
<article class="card">
  <div class="media"><img src="/cover.jpg" alt="封面"></div>
  <div class="body">
    <h3>渲染流水线</h3>
    <p>从解析到合成,浏览器如何把标记变成像素。</p>
    <button class="btn">查看详情</button>
  </div>
</article>
```

预期结果：卡片有 12px 圆角，封面图铺满顶部并被裁成圆角，底部内边距 16px，两层阴影形成轻微悬浮感；按钮在悬停时加深，键盘聚焦时显示外轮廓。`object-fit: cover` 让图片按比例填满固定高度，不拉伸变形。

## 小结

- `background` 管理颜色、图片、渐变、位置、尺寸与重复，多层背景用逗号分隔；
- `border` 必须给出样式才能显示，`border-radius` 用长度或百分比控制圆角；
- `outline` 不占空间，焦点样式应保留可见的轮廓或等价替代；
- `box-shadow` 支持多层与 `inset`;`filter` 作用于元素自身，`backdrop-filter` 作用于背后内容；
- 圆角容器裁剪子元素需要 `overflow: hidden`，阴影与裁剪应分层放置；
- 这些装饰属性解决单个盒子的外观，多个盒子如何排列由下一章的文档流、Flex 与 Grid 负责。
