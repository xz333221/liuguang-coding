---
title: 重排、重绘与合成层
summary: '改几何触发重排，改外观触发重绘，改变换与透明度可能只走合成。区别在于属性是否影响布局，以及元素有没有独立合成层；读写分离、批量写入和克制地使用 will-change 决定了一帧要重做几步。'
category: frontend
node: frontend-browser-reflow
order: 51
level: 深入
tags: [浏览器, 重排, 重绘, 合成层]
updated: 2026-11-19
mindmap: browser-reflow.mindmap.json
terms: []
sources:
  - title: web.dev · Rendering performance
    url: https://web.dev/articles/rendering-performance
    note: 布局、绘制与合成三段的代价划分。
  - title: web.dev · Avoid large, complex layouts and layout thrashing
    url: https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing
    note: 强制同步布局的成因与读写分离的写法。
  - title: MDN · will-change
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/will-change
    note: 提升合成层的提示属性与使用注意事项。
---

上一篇把一帧拆成样式、布局、绘制、光栅化、合成五段，那里讲的是一次完整的渲染。真实页面里，每次交互只会让其中某几段重跑；改一个类名到底重做哪几步，取决于改的是哪个属性。

## 三种代价

浏览器把改动分成三档，代价依次降低：

- 重排(reflow，即 layout):几何变了，重新算位置与尺寸，通常连带重绘与重新合成；
- 重绘(repaint):几何没变，颜色、背景、阴影变了，重新生成绘制指令并光栅化；
- 只合成(composite):只改变换或透明度，合成线程直接处理，主线程不参与。

| 改动 | 布局 | 绘制 | 合成 | 例子 |
| --- | --- | --- | --- | --- |
| 尺寸与间距 | 是 | 是 | 是 | `width`、`margin`、`padding` |
| 定位偏移 | 是 | 是 | 是 | 非合成层上的 `top`、`left` |
| 字体与行高 | 是 | 是 | 是 | `font-size`、`line-height` |
| 颜色与背景 | 否 | 是 | 是 | `color`、`background-color` |
| 阴影与圆角 | 否 | 是 | 是 | `box-shadow`、`border-radius` |
| 变换与透明度 | 否 | 否 | 是 | 合成层上的 `transform`、`opacity` |

最后一行的前提是元素在独立合成层上。`transform` 本身不改变布局，元素没有提升时，变化仍要在主线程重绘。

## 什么触发重排

几何相关属性都算：`width`、`height`、`margin`、`padding`、`border-width`、`font-size`、`line-height`、`display`、`position`、`float`、`grid-template-columns` 等。增删节点、修改文本内容同样会触发。

读取几何也会触发，这一点常被忽略。布局结果平时是惰性的：样式改了先标脏，等下次需要时才计算。一旦脚本读取 `offsetHeight`、`scrollTop`、`getBoundingClientRect()`，浏览器必须立刻把脏的布局算完才能回答。

```js
// 反例:读一次写一次,每次读都强制同步布局
for (const item of items) {
  item.style.width = item.offsetWidth + 10 + 'px';
}

// 改法:先把读做完,再统一写
const widths = items.map((item) => item.offsetWidth);
items.forEach((item, i) => {
  item.style.width = widths[i] + 10 + 'px';
});
```

元素越多，前一种写法越慢，DevTools 会在对应任务上标出 「Forced reflow is a likely performance bottleneck」。改成读写两段之后，一帧里只发生一次布局。

更彻底的做法是一次性改类名，把数值交给 CSS，只写一次样式。读写分离的原则不变：一帧里读和写各成一段，不要交替。

## 重排的影响范围

浏览器不会每次都重排整页。它给变化的部分打脏标记，从最近的公共祖先开始重新布局。但范围不一定小：

- 常规流里，元素变高会推走后面的兄弟，也会撑高父元素，脏标记一路向上；
- 绝对定位、固定定位脱离常规流，影响通常限于自身子树；
- 表格与多列布局要参考整体内容，局部改动常引起整表重算；
- 用了 `contain: layout` 或 `content-visibility: auto`，浏览器可以把布局限制在容器内。

```css
.card {
  contain: layout paint;
}
```

`contain: layout` 表示容器内外的布局互不影响，容器的尺寸仍可由内容决定；`contain: size` 才是尺寸隔离，容器必须显式给出高度或宽高比。`content-visibility: auto` 更进一步，屏幕外的子树连布局都可以跳过。

## 重绘的边界

颜色、背景、阴影、轮廓、可见性变化只触发重绘。重绘以绘制层为单位：一个元素变化，浏览器重画它所在的那一块，不一定重画整页。

`visibility: hidden` 与 `display: none` 的差别就在这里。前者保留盒子，只跳过绘制，切换时是重绘；后者把元素移出布局树，切换时要重排。做淡入淡出时用前者，做条件渲染时用后者。

大面积阴影、渐变、`filter` 会让重绘变贵，因为光栅化要处理的区域大。动画里避免对整屏元素改这类属性。

## 合成层与 will-change

合成层(compositing layer)是合成线程独立处理的一张图。满足以下条件之一的元素通常会被提升：

- 有 3D 变换，如 `translate3d()`、`rotateX()`;
- 声明了 `will-change: transform` 或 `will-change: opacity`;
- 正在执行 `transform` 或 `opacity` 动画，具体行为随实现；
- `position: fixed` 或 `sticky` 的元素；
- `video`、`canvas`、`iframe` 等替换元素；
- 带 `filter`、`backdrop-filter`、`mix-blend-mode` 等效果；
- 需要单独裁剪或被其它层覆盖的子树。

层内的 `transform` 与 `opacity` 变化只修改层的属性，合成线程就能完成，不需要主线程重绘。这是「位移动画用 `transform` 而不是 `left`」的底层原因。

```css
.toast {
  will-change: transform, opacity;
  transition: transform 200ms ease, opacity 200ms ease;
}
```

坑在于滥用。每个合成层都要按「层尺寸 × 设备像素比」占用显存，给列表里每个单元都加 `will-change` 会造成层爆炸，显存上涨，合成反而变慢。规则是只为确定要做动画的少量元素提前声明，动画结束就撤掉：

```js
el.addEventListener('transitionend', () => {
  el.style.willChange = 'auto';
}, { once: true });
```

`will-change` 只是提示，浏览器可以忽略；写了不保证提升，写多了几乎一定浪费内存。用 Layers 面板确认层是否真的产生，比凭感觉加属性可靠。

## 一次性改完

无论插入节点还是改样式，合并成一次操作都能省掉中间的重排。

```js
// 反例:每次 append 都可能触发一次布局
for (const row of rows) {
  list.appendChild(render(row));
}

// 改法一:在内存里攒好,一次插入
const frag = document.createDocumentFragment();
for (const row of rows) {
  frag.appendChild(render(row));
}
list.appendChild(frag);
```

`DocumentFragment` 不属于文档树，往它里面加节点不触发布局，整体插入时只算一次。改法二是先把容器摘出文档，改完再挂回，代价是两次布局与一次闪烁，适合初始化而不是交互。

改法三是用 `requestAnimationFrame` 把写操作推迟到下一帧开始前：

```js
let pending = false;
function schedule(update) {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    update();
  });
}
```

rAF 回调在样式计算与布局之前执行，此时写入的样式会在同一帧里一次算完，不会产生中间状态。连续的事件(滚动、输入、resize)都适合这样合并。

能用 CSS 动画表达的效果就别用 JS 逐帧算。CSS 动画与 `transition` 由浏览器驱动，动画期间可以完全交给合成线程；JS 版本每帧都要进主线程，一旦有长任务就会顿一下。

## 判断该优化哪一步

在 Performance 面板里按块找问题：

- Layout 块多且耗时长：查几何属性，查循环里的读写交替；
- Recalculate Style 耗时长：选择器太复杂，或者改动了根节点上的类与 CSS 变量；
- Paint 耗时长：大面积阴影、渐变、滤镜；
- 只有 Composite Layers:已在合成线程，通常不用管。

Layout 块旁边出现粉色的 Layout Shift 标记，是元素在没有交互时移动了位置，属于 CLS 的问题，与重排开销不是一回事。前者影响视觉稳定性，后者影响帧耗时。

## 小结

- 改几何触发重排，改外观触发重绘，改变换与透明度可能只走合成；
- 读取 `offsetHeight`、`getBoundingClientRect()` 会强制刷新布局，循环里读写交替最伤；
- 重排范围由脏标记决定，绝对定位与 `contain` 能把影响限制在子树；
- `transform` 与 `opacity` 只有在独立合成层上才能完全交给合成线程；
- 合成层占显存，`will-change` 只给少量确定动画的元素用，用完撤销；
- `DocumentFragment`、批量类名、rAF 都能减少一帧里的布局次数。
