---
title: 过渡与关键帧动画
summary: 'transition 在两个状态之间插值，animation 配合 @keyframes 处理多段与循环；transform 与 opacity 能交给合成阶段，尺寸与位置属性会触发布局，降级由 prefers-reduced-motion 负责。'
category: frontend
node: frontend-css-motion
order: 24
level: 进阶
tags: [CSS, transition, animation, 性能]
updated: 2026-11-19
mindmap: css-motion.mindmap.json
terms: []
sources:
  - title: MDN · transition
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/transition
    note: 过渡属性、时长、缓动与延迟的语法。
  - title: MDN · animation
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/animation
    note: 简写顺序、填充模式与迭代控制。
  - title: MDN · prefers-reduced-motion
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-reduced-motion
    note: 减少动态效果的系统偏好与媒体查询写法。
---

上一篇把覆盖顺序交给层，样式之间的关系稳定后，状态切换还需要时间维度；这一篇讲过渡与关键帧动画。

## transition 的四个部分

`transition` 让某个属性在两个值之间按时间插值。简写包含属性、时长、缓动函数、延迟：

```css
.button {
  background-color: #2f6fed;
  transform: translateY(0);
  transition: background-color 160ms ease, transform 160ms ease;
}

.button:hover { background-color: #1f5bd7; }
.button:active { transform: translateY(1px); }
```

- `transition-property`: 参与过渡的属性，`all` 会监听全部可动画属性，调试成本高，按需列出；
- `transition-duration`: 时长，默认 `0s`，不写时长就没有动画；
- `transition-timing-function`: 缓动，默认 `ease`;
- `transition-delay`: 延迟，可为负值，表示从动画中间开始。

过渡只在属性值发生变化时触发。元素从 `display: none` 变为可见、页面首次渲染，都不会产生过渡。需要入场动画时，使用 `@keyframes` 或 `@starting-style`。

## 可动画属性与代价

可动画属性按渲染阶段分三类：

- 布局： `width`、`height`、`top`、`left`、`margin`、`font-size`，每帧都要重新计算布局；
- 绘制： `color`、`background-color`、`box-shadow`，布局不变但要重绘；
- 合成： `transform`、`opacity`，可以只更新合成层，代价最低。

```css
/* 触发布局 */
.panel { width: 200px; transition: width 200ms ease; }
.panel.open { width: 320px; }

/* 只改变合成属性 */
.panel { transform: translateX(-100%); transition: transform 200ms ease; }
.panel.open { transform: translateX(0); }
```

两段代码的视觉目标不同：前者改变占位，后者让面板滑入。如果确实需要改变占位，把动画范围限制在小块区域，并接受布局代价；能用 `transform` 表达的效果，优先用 `transform`。

## @keyframes 与 animation

`@keyframes` 定义时间轴上的关键帧，`animation` 把动画应用到元素：

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #d0d7de;
  border-top-color: #2f6fed;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}
```

简写顺序为 `name duration timing-function delay iteration-count direction fill-mode play-state`。两个时间值中，第一个是时长，第二个是延迟：

```css
animation: fade-in 240ms ease-out 80ms 1 both;
```

拆分属性更易读： `animation-name`、`animation-duration`、`animation-delay`、`animation-iteration-count`、`animation-direction`、`animation-fill-mode`、`animation-play-state`。多个动画用逗号分隔，各属性按顺序对应。

## animation-fill-mode

`animation-fill-mode` 决定动画开始前与结束后是否保留关键帧的值：

- `none`: 不保留，回到元素原本的样式；
- `forwards`: 结束后保留最后一帧；
- `backwards`: 延迟期间先应用第一帧；
- `both`: 前后都保留。

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.toast {
  animation: fade-in 240ms ease-out 120ms both;
}
```

没有 `backwards` 时，延迟期间元素按原本样式显示，动画一开始会突然跳到 `from` 的状态。若结束帧与原本样式不同，还需要 `forwards` 保留终值。

## steps() 与逐帧动画

`steps(n, jump-term)` 把插值切成 n 个离散台阶，适合逐帧切换：

```css
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.cursor {
  animation: blink 1s steps(1, end) infinite;
}
```

`steps(4, end)` 用于四帧雪碧图或数字跳动；`step-start` 等价于 `steps(1, start)`,`step-end` 等价于 `steps(1, end)`。连续插值会产生中间帧，逐帧动画需要离散切换时只能用 `steps()`。

## prefers-reduced-motion

系统开启「减少动态效果」后，应降低或去掉位移、缩放、视差，保留即时状态变化：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

时长设为接近零，而非 `0`，保证 `animationend` 与 `transitionend` 仍会触发，依赖这些事件的逻辑不会中断。更细的做法是按组件替换效果，例如把滑入改为淡入；焦点框与加载指示器不能直接删除。

## 小结

- `transition` 只处理两个状态之间的插值，没有时长就不会动；
- 可动画属性中 `transform` 与 `opacity` 代价最低，尺寸与位置属性会触发布局；
- `@keyframes` 描述多段过程，`animation` 控制时长、循环、方向与填充；
- `animation-fill-mode: both` 同时处理延迟期与结束后的状态；
- `steps()` 用于逐帧与离散切换；
- `prefers-reduced-motion` 降级到接近零的时长，并保留事件触发。
