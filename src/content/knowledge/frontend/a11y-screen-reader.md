---
title: 屏幕阅读器、对比度与动效偏好
summary: 'ARIA 写对不等于好用，还得在 NVDA 或 VoiceOver 里听一遍。读屏分浏览与表单两种模式，对比度 AA 要求正文 4.5:1、大字与控件 3:1，动效与配色跟随系统偏好。'
category: frontend
node: frontend-a11y-screen-reader
order: 104
level: 进阶
tags: [可访问性, 屏幕阅读器, 对比度, 动效偏好, WCAG]
updated: 2026-11-19
mindmap: a11y-screen-reader.mindmap.json
terms: []
sources:
  - title: W3C WAI · 对比度最低要求
    url: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
    note: AA 级正文 4.5:1、大字 3:1 的判定与大字定义。
  - title: MDN · prefers-contrast
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-contrast
    note: 系统对比度偏好的媒体查询。
  - title: web.dev · Learn Accessibility
    url: https://web.dev/learn/accessibility
    note: 对比度、焦点与辅助技术测试的入门课程。
---

上一篇把 ARIA 写对了，但属性正确只说明「读屏能拿到信息」，读出来是否清楚还得真的听一遍。这一篇讲屏幕阅读器的工作方式，以及视觉层面绕不过去的两个硬指标：对比度和动效偏好。

## 浏览模式与表单模式

屏幕阅读器有两种状态，行为差别很大：

- 浏览模式(虚拟光标):按键交给读屏，方向键逐行、逐标题移动，按字母跳到下一个链接。网页原本的键盘事件基本收不到；
- 表单模式(焦点模式):按键交给页面，方向键在输入框内移动光标，输入正常。

进入输入框、按钮组等控件时，NVDA 会自动切到表单模式，离开后切回浏览模式；手动切换用 NVDA+空格。VoiceOver 靠转子(VO+U)在标题、链接、表单控件之间跳转，方向键读完整个页面。

这解释了一个常见困惑：开发者在 `div` 上监听方向键做自定义控件，自己用鼠标测没问题，读屏用户却完全按不动——浏览模式把方向键截走了。自定义组合控件要么用规范的 ARIA 角色(读屏会切到表单模式)，要么别做。

测试环境按平台选：NVDA 配 Firefox 或 Chrome,VoiceOver 配 Safari。Safari 默认 Tab 只停在表单控件上，要到链接和按钮得按 Option+Tab，或者改偏好设置。这个默认值让不少人误以为链接「不可聚焦」。

## 听一遍会暴露的问题

同一段代码，视觉正常，读屏听起来可能是另一回事：

| 写法 | 读屏输出 | 问题 |
|---|---|---|
| 图标按钮无名称 | 「按钮」 | 不知道按了会发生什么 |
| 链接文字「点击这里」 | 「链接 点击这里」 | 脱离上下文无法区分 |
| `h1` 后直接 `h3` | 「三级标题」 | 大纲断层，跳转混乱 |
| `tabindex="1"` | 焦点顺序错乱 | 与阅读顺序不一致 |
| 图片 `alt` 写文件名 | 「IMG_2043.jpg」 | 等于没有替代文本 |
| 自定义控件无角色 | 读成一串文本 | 不知道可以操作 |

其中「链接文字」和「标题层级」用眼睛看不出来，只有听才明显。检查方式很直接：打开读屏，把页面从头到尾听一遍，遇到听不懂的地方就记下来。

## 对比度是两个数

WCAG 的对比度用相对亮度算，公式是 `(L1 + 0.05) / (L2 + 0.05)`,`L1` 是较亮色的亮度。AA 级的门槛：

| 内容 | 最低对比度 | 说明 |
|---|---|---|
| 正文文字 | 4.5:1 | 小于 24px 的常规字重 |
| 大字 | 3:1 | 至少 24px，或 18.66px 加粗 |
| 图标与控件边框 | 3:1 | 需要看清才能操作的图形 |
| 装饰性元素 | 无要求 | 不影响理解 |

灰色文字是最容易出问题的地方。白底上 `#767676` 的对比度是 4.54:1，刚好过线；再浅一档的 `#777777` 只有 4.48:1，差 0.02 就失败。设计稿里「再淡一点」的需求，往往就是在 4.5 附近反复试探。

两个连带的坑。半透明文字要按叠加后的实际颜色算，`rgba(0, 0, 0, 0.4)` 落在白底上等效于 `#999999`，对比度只有 2.85:1，不是「40% 的黑」听着那么深。占位符文字同样要满足 4.5:1，很多组件库默认的 `#999` 并不达标。

禁用状态的按钮是例外：WCAG 允许禁用控件不满足对比度。但如果它看起来只是「淡一点的可用按钮」，用户会去点，那就该按普通控件要求。

## 不能只靠颜色

红字表示错误、绿色表示成功，色觉障碍用户分不出来；链接和正文只差颜色，用户找不到哪段可点。规则是：颜色可以作为附加信息，不能是唯一信息。

```html
<!-- 错:只有一个红框 -->
<input aria-invalid="true">

<!-- 对:图标 + 文字 + 边框,三重提示 -->
<div class="field error">
  <label for="email">邮箱</label>
  <input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
  <p id="email-error" class="error-text">
    <svg aria-hidden="true">...</svg>
    邮箱格式不正确,应包含 @
  </p>
</div>
```

`aria-invalid="true"` 让读屏报「无效」,`aria-describedby` 把错误文案关联到输入框，视觉上的图标和文字让色觉障碍用户也能判断。三者各管一段，不能互相替代。

链接同理：正文里的链接要保留下划线，或者至少加粗并保证 3:1 的对比。只靠 `#2f6fed` 和黑色正文的色差，很多人分不出来。

## 动效与对比度偏好

系统里有两个和可访问性直接相关的偏好设置，网页可以读到：

```css
/* 减少动态效果:去掉位移与缩放,保留状态变化 */
@media (prefers-reduced-motion: reduce) {
  .card {
    transition: opacity 120ms linear;
    transform: none;
  }
}

/* 提高对比度:加深文字、加粗边框 */
@media (prefers-contrast: more) {
  .card {
    border: 2px solid #1f2328;
  }
  .muted {
    color: #3d444d;
  }
}
```

`prefers-reduced-motion` 在第 5 章讲动画那篇里写过，这里补一个常被忽略的点：视差滚动、自动轮播、循环闪烁都算动态效果，不只是 `transition`。前庭功能敏感的用户会因为大面积位移而眩晕，`transform: none` 比把时长改成 0 更彻底。

Windows 的高对比度模式走的是另一条路径，`forced-colors: active` 会把页面颜色强制替换成系统色板：

```css
@media (forced-colors: active) {
  .card {
    border: 1px solid CanvasText;
  }
  .card:focus-visible {
    outline: 2px solid Highlight;
  }
}
```

在这个模式下，背景图和 `box-shadow` 会被丢弃，靠阴影区分的卡片会粘成一片。用 `CanvasText`、`Canvas`、`Highlight`、`ButtonFace` 这些系统颜色，让浏览器决定具体色值。焦点环千万不要在这个模式下被 `outline: none` 干掉，否则键盘用户彻底失去位置。

## 自动化工具能查什么

axe、Lighthouse 的可访问性审计能查出机械性问题：图片缺 `alt`、按钮无可访问名称、`aria-hidden` 里有可聚焦元素、对比度不足、表单控件缺 `label`、重复 id。

```bash
npx @axe-core/cli http://localhost:4321
```

一条命令跑完整个页面，输出按严重程度分组。把它接进 CI，挡掉回归很划算。

但自动化查不了判断类问题：标题层级是否合理、链接文字是否有意义、键盘顺序是否符合阅读顺序、错误提示是否说清了怎么改。业界常说自动化能覆盖三到五成的检查项，剩下的要靠人。

所以最低限度的手动清单是：只用 Tab 走完页面、只开读屏听一遍主要流程、把窗口缩到 320px 看有没有横向滚动、在系统里打开「减少动态效果」再看一遍动画。

## 小结

- 读屏分浏览模式与表单模式，自定义控件要让读屏能切到表单模式，否则方向键收不到；
- 用 NVDA 配 Firefox、VoiceOver 配 Safari 听一遍主流程，能发现视觉上看不出的问题；
- 对比度 AA 要求正文 4.5:1、大字与控件 3:1,`#767676` 在白底上刚好过线；
- 颜色只能作为附加信息，错误和链接都要有文字或图形兜底；
- `prefers-reduced-motion` 与 `prefers-contrast` 按系统偏好降级，`forced-colors` 下用系统色；
- 自动化工具查机械问题，顺序与语义合理性只能人工判断。
