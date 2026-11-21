---
title: 动效与 prefers-reduced-motion
summary: '动效是增强，必须先能关掉；系统声明减少动态时，把时长压到 0.01ms 而不是 animation: none，因为事件仍会派发，依赖 transitionend 收尾的逻辑才不会卡住。'
category: frontend
node: frontend-style-motion
order: 82
level: 入门
tags: [动效, prefers-reduced-motion, 可访问性, transition]
updated: 2026-11-19
mindmap: style-motion.mindmap.json
terms: []
sources:
  - title: MDN · prefers-reduced-motion
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-reduced-motion
    note: reduce 与 no-preference 两个取值,以及常见的降级写法。
  - title: MDN · animation
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/animation
    note: 时长、迭代次数与事件派发的关系。
  - title: web.dev · prefers-reduced-motion
    url: https://web.dev/articles/prefers-reduced-motion
    note: 前庭功能障碍用户对运动敏感的原因与降级策略。
---

上一篇把主题与排版定下来，页面在静态时是稳的；但状态变化发生的那一刻还没有描述。第 5 章讲过渡与动画那篇讲过 `transition` 与 `@keyframes` 的语法和合成层，这一篇换到设计系统的角度： 动效用多久、动哪些属性，以及系统说「减少动态」时怎么降。

## 动效解决什么

只有两件事值得动画： 反馈和空间关系。

反馈指操作被接收了，按压态、按钮变色、加载指示；空间关系指「从哪来、到哪去」，抽屉从右侧滑入、弹层从触发按钮的方向展开、列表项被删除后其余项补位。没有动画这些也能用，只是用户需要多看一眼才确认发生了什么。

这个定位决定了两条约束： 动效缺失不能丢信息，动效期间不能挡住操作。位移与缩放最容易让前庭敏感的人不适，而它们恰好是「从哪来」最常用的表达，所以必须有降级路径。

## 时长与缓动

| 场景 | 时长 | 缓动 |
| --- | --- | --- |
| 按压、开关反馈 | 80-120ms | `ease-out` |
| 颜色、透明度变化 | 120-160ms | `ease-out` |
| 小元素进出场 | 150-200ms | `cubic-bezier(0.2, 0, 0, 1)` |
| 抽屉、面板 | 240-320ms | `cubic-bezier(0.2, 0, 0, 1)` |
| 进度、加载旋转 | 不限 | `linear` |

这些是常见区间，不是规范，团队内统一比精确更重要。一条经验： 位移距离越长，时长越长，但超过 400ms 就会被感觉成「卡」。缓动方向按运动方向定，进场先快后慢(`ease-out`)，出场先慢后快(`ease-in`)，来回切换用 `cubic-bezier(0.2, 0, 0, 1)` 这类两端都收的曲线。`linear` 只用于进度条和无限旋转，因为它看起来是匀速的机械运动。

## 只动 transform 与 opacity

```css
.toast {
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 160ms ease-out,
    transform 160ms cubic-bezier(0.2, 0, 0, 1);
}

.toast.is-visible {
  opacity: 1;
  transform: none;
}
```

这两个属性的变化可以只在合成阶段完成，不触发布局，也不触发重绘。换成 `top`、`height`、`margin` 就是每帧重新布局，在列表里会明显掉帧。

`transition` 声明在元素本身还是声明在 `:hover` 上，结果不同： 写在 `.toast` 上，进场出场都有过渡；写在 `.toast.is-visible` 上，只有进场有，出场是瞬变。要两个方向都平滑，过渡写在常态选择器里。

## 减少动态偏好

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

这段是兜底，覆盖所有第三方库与自己漏掉的动效。要点在「压到 0.01ms」，不是 `animation: none`，也不是 `duration: 0`。

## 为什么是 0.01ms

`transition` 在总时长为 0 时根本不会被启动，`transitionend` 也就不会派发；换成 `animation: none` 更彻底，连 `animationstart` 都没有，`animation-fill-mode` 的效果一起消失。

后果是一类很难查的 bug: 弹层在 `transitionend` 里移除节点，开了减少动态后弹层永远不关；Promise 在过渡结束后 resolve，流程停在等待。

```js
// 关闭按钮: 等过渡真正结束才卸载节点
overlay.addEventListener('transitionend', () => overlay.remove())
```

```css
/* 错误: 时长为 0, 没有过渡被启动, transitionend 永远不来 */
@media (prefers-reduced-motion: reduce) {
  .overlay { transition-duration: 0s !important; }
}

/* 正确: 时长压到几乎为零, 事件照常走完 */
@media (prefers-reduced-motion: reduce) {
  .overlay { transition-duration: 0.01ms !important; }
}
```

`0.01ms` 保留了完整的事件序列： 开始与结束落在同一帧，视觉上等于瞬时，但依赖事件的逻辑照常跑。这就是兜底代码不用 `0` 的原因。

`animation-iteration-count: 1` 会让无限循环的骨架屏与旋转指示器停下，看起来像卡死。加载中的语义不能丢，给它单独放行：

```css
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 1200ms !important;
    animation-iteration-count: infinite !important;
  }
}
```

两条规则都是 `!important`,`*` 的权重是 (0,0,0),`.spinner` 是 (0,1,0)，后者胜出，与书写顺序无关。这类例外要写在兜底规则之后、同一个媒体查询里，否则容易被后来的人当成重复代码删掉。

## 媒体查询管不到的地方

`scroll-behavior: smooth` 只管锚点跳转与 `scrollIntoView`，兜底里的 `auto` 就是为它准备的。JavaScript 驱动的动画完全绕过 CSS 媒体查询，必须自己读偏好：

```js
const mq = matchMedia('(prefers-reduced-motion: reduce)')
let reduced = mq.matches

mq.addEventListener('change', (e) => {
  reduced = e.matches
})

element.animate(
  [{ transform: 'translateX(24px)' }, { transform: 'none' }],
  { duration: reduced ? 1 : 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
)
```

还要一起处理的： 自动播放的轮播与视频(给暂停按钮或默认暂停)、视差滚动、hover 触发的位移、打字机效果。它们的共同点是不由用户触发，用户没有机会中断。

## 过渡与可访问性的交叉点

- `:hover` 规则要用 `@media (hover: hover)` 包起来。触屏设备没有真正的 hover，点一下之后样式会粘住，直到点别处；这类「粘住的 hover」常被误判为动效问题。
- 焦点样式不要加过渡。`:focus-visible` 上写 `transition: outline-color 200ms` 会让焦点环晚出现 200ms，键盘用户看到的是「按了 Tab 没反应」。
- 别用动画承载信息。骨架屏淡出的同时如果还在加载数据，用户会以为已经加载完。
- 位移类动画尽量配一个不位移的替代样式，比如抽屉改成淡入，成本很低。

## 小结

- 动效只负责反馈与空间关系，缺了不丢信息，是增强不是必需；
- 时长按距离定，常见 80-320ms，超过 400ms 会被感知为卡；
- 只动 `transform` 与 `opacity`，其余属性每帧都会触发布局或重绘；
- 减少动态偏好下把时长压到 0.01ms,`transitionend` 仍会派发，收尾逻辑不会卡住；
- `transition-duration: 0s` 与 `animation: none` 会让依赖事件收尾的逻辑永远等下去；
- 无限循环的加载指示器要单独放行，`scroll-behavior`、自动播放与 JS 动画都要各自处理。
