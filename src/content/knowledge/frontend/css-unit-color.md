---
title: 单位与颜色：px / em / rem / vw、hsl 与 oklch
summary: '长度单位分为绝对单位与相对单位：px 是 CSS 像素，em 基于当前字号，rem 基于根字号，百分比基于包含块的对应属性，vw/vh 基于视口，dvh/svh 应对移动端地址栏伸缩，ch 适合控制行宽。颜色可用关键字、hex、rgb()、hsl() 与 oklch() 表示，alpha 控制透明度，currentColor 复用当前文字色。'
category: frontend
node: frontend-css-unit-color
order: 13
level: 入门
tags: [CSS, 长度单位, 颜色, rem, oklch]
updated: 2026-11-19
mindmap: css-unit-color.mindmap.json
terms: []
sources:
  - title: MDN · CSS 值与单位
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_values_and_units
    note: 长度、百分比与颜色值的完整参考。
  - title: MDN · color
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value
    note: rgb()、hsl()、oklch() 等颜色函数的语法。
  - title: 'web.dev · Learn CSS: Color'
    url: https://web.dev/learn/css/color
    note: 颜色模型与透明度的入门讲解。
---

上一篇量出了盒子的尺寸，尺寸的数值需要单位。长度和颜色是 CSS 值系统中最常用的两类，这一篇分别说明它们的表示方式与选择依据。

## 绝对单位 px

`px` 是 CSS 像素，不等于物理像素。在普通屏幕上 1 个 CSS 像素对应 1 个设备像素；在高分屏上，浏览器用多个设备像素绘制 1 个 CSS 像素，使元素在不同屏幕上保持相近的视觉大小。

绝对单位还有 `cm`、`mm`、`in`、`pt`，它们基于固定的物理换算，主要用于打印样式。屏幕界面里基本只用 `px`，适合边框、阴影偏移这类不应随字号缩放的细节。

## 相对单位：em、rem 与百分比

相对单位的计算基准各不相同。

`em` 基于当前元素的 `font-size`。用在 `font-size` 属性上时，基准是父元素的字号：

```css
.card {
  font-size: 20px;
  padding: 1em;          /* 20px */
  margin-bottom: 0.5em;  /* 10px */
}
```

`rem` 基于根元素 `html` 的字号，默认 16px。它不受当前元素字号影响，适合统一间距与字号：

```css
html { font-size: 100%; }   /* 跟随浏览器设置,通常为 16px */
.card { font-size: 1.25rem; } /* 20px */
.card { padding: 1rem; }      /* 16px */
```

百分比的基准取决于属性。`width` 的百分比基于包含块的宽度；`padding` 与 `margin` 的百分比无论水平还是垂直，都基于包含块的宽度；`font-size` 的百分比基于父元素字号；`line-height` 的百分比基于当前元素字号。

`em` 的一个易错点是逐层相乘：

```css
.list { font-size: 0.875em; }
.list .list { font-size: 0.875em; }  /* 实际为父级的 0.875 倍,嵌套越深越小 */
```

字号与间距改用 `rem` 可以避免这种累积，代价是失去了「跟随当前组件字号」的能力。组件的内部间距用 `em`、全局尺度用 `rem`，是常见的分工。

## 视口单位与 ch

`vw` 与 `vh` 分别是视口宽度、高度的 1%。`1vw` 等于视口宽度的百分之一，`100vw` 等于整个视口宽度。

移动浏览器的地址栏会伸缩，`100vh` 在地址栏展开时可能高于可见区域，导致内容被遮挡。`dvh`(动态视口)随地址栏变化，`svh`(小视口)取地址栏展开时的最小值，适合需要稳定高度的区域：

```css
.hero { min-height: 100svh; }   /* 首屏区域不会被地址栏裁掉 */
.prose { max-width: 70ch; }     /* 约 70 个字符宽,控制阅读行长 */
```

`ch` 是数字 `0` 在当前字体下的宽度，适合按字符数量限制行宽。中文正文每行 35 到 45 个汉字比较易读，英文在 45 到 75 个字符之间。

`100vw` 包含滚动条占用的宽度，可能出现横向滚动；需要满宽时优先用 `width: 100%`，或配合 `overflow-x: hidden` 检查实际效果。

## 颜色的写法

CSS 支持多种颜色表示，常用的有五类：

- 关键字：`red`、`transparent`、`rebeccapurple`;
- 十六进制：`#f00`、`#ff0000`、`#ff000080`(末两位是 alpha);
- `rgb()`:`rgb(255 0 0)`、`rgb(255 0 0 / 50%)`;
- `hsl()`:`hsl(0 100% 50%)`，依次是色相、饱和度、亮度；
- `oklch()`:`oklch(63% 0.25 29)`，依次是感知亮度、彩度、色相。

```css
.button {
  background: hsl(210 80% 45%);
  color: #fff;
}

.button:hover {
  background: hsl(210 80% 35%);
}

.overlay {
  background: rgb(0 0 0 / 60%);
}

.badge {
  background: oklch(70% 0.12 250 / 0.2);
  color: oklch(45% 0.12 250);
}
```

`hsl()` 便于按同一色相调整深浅：降低亮度得到悬停态，提高亮度得到浅色背景。`oklch()` 的亮度与人眼感知更一致，同一亮度值在不同色相下看起来明暗接近，适合程序化生成一组色阶。旧写法 `rgba()` 与 `hsla()` 仍然有效，现在可以直接在 `rgb()`、`hsl()` 中用斜杠附加 alpha。

## 透明度与 currentColor

alpha 的取值范围是 0 到 1，也可以写百分比，0 表示完全透明。`transparent` 等价于 `rgb(0 0 0 / 0)`。

`opacity` 作用于整个元素及其子树，`background: rgb(0 0 0 / 50%)` 只让背景半透明，文字仍保持不透明。做遮罩层时优先用颜色 alpha，避免子元素一起变淡。

`currentColor` 取当前元素的 `color` 值，用于让边框、图标与文字保持同色：

```css
.icon-button {
  color: hsl(210 80% 45%);
  border: 1px solid currentColor;
}
```

改 `color` 一处，边框与图标同步变化。内联 SVG 的 `fill="currentColor"` 也遵循同一规则。

颜色的可读性用对比度衡量。WCAG AA 要求正文与背景的对比度不低于 4.5:1，大号文字不低于 3:1。DevTools 的颜色选择器会显示对比度数值，这里只需知道存在这个下限。

## 一组主题色示例

把字号与颜色组合成一套基础设置：

```css
:root {
  color-scheme: light dark;
}

body {
  background: hsl(210 20% 98%);
  color: hsl(215 16% 18%);
  font-size: 1rem;
  line-height: 1.6;
}

.link {
  color: hsl(215 80% 42%);
}

.card {
  background: #fff;
  border: 1px solid hsl(215 15% 88%);
  border-radius: 0.5rem;
  padding: 1rem;
}
```

预期结果：浅灰背景上的深灰正文，链接为蓝色，卡片为白色并带浅色边框。三个蓝色只改了亮度，色相一致，视觉上属于同一套主题。把常用色值集中定义成自定义属性，可以在改主题时只动一处，这部分在样式进阶中展开。

## 小结

- `px` 是 CSS 像素，适合边框等不随字号缩放的细节；
- `em` 基于当前元素字号，`rem` 基于根字号，百分比基于包含块的对应属性；
- `vw`/`vh` 基于视口，`dvh`/`svh` 应对移动端地址栏伸缩，`ch` 适合控制行宽；
- 颜色可用关键字、hex、`rgb()`、`hsl()` 与 `oklch()`，后两者便于生成成套色阶；
- alpha 只影响颜色本身，`opacity` 影响整个元素与子树；
- `currentColor` 复用当前文字色，主题色按同一色相调整亮度即可。
