---
title: 深浅色、对比度与响应式排版
summary: '深色主题是另一组语义令牌加 color-scheme，手动切换靠 data-theme 加一个 <head> 里的内联脚本避免白闪；正文对比度 4.5:1、大字号 3:1；字号用 rem 与 clamp 组织，才不会被用户调大的系统字体卡死。'
category: frontend
node: frontend-style-theme
order: 81
level: 进阶
tags: [深色模式, 对比度, WCAG, 流体排版]
updated: 2026-11-19
mindmap: style-theme.mindmap.json
terms: []
sources:
  - title: MDN · prefers-color-scheme
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@media/prefers-color-scheme
    note: 跟随系统浅色或深色偏好的媒体查询。
  - title: MDN · color-scheme
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/color-scheme
    note: 让浏览器自绘控件使用对应配色。
  - title: W3C · WCAG 2.2 对比度（最低要求）
    url: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
    note: 4.5:1 与 3:1 两个阈值的适用范围。
---

上一篇选定了样式以什么形态交付，主题在那时还只是「能换」；换成什么样才不刺眼、才读得清，是另一件事。深色模式做错会在 OLED 屏上发糊，字号写死在用户调大系统字体时会挤成一团。

## 一套结构，两套值

主题切换不动结构，只动语义层。浅色写在 `:root`，深色在 `prefers-color-scheme` 里覆盖一遍，再给两个显式主题各留一块，值完全相同，只是触发条件不同。

```css
:root {
  color-scheme: light;
  --color-bg: #ffffff;
  --color-surface: #f6f8fa;
  --color-text: #1f2328;
  --color-muted: #57606a;
  --color-border: #d0d7de;
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --color-bg: #0d1117;
    --color-surface: #161b22;
    --color-text: #e6edf3;
    --color-muted: #9198a1;
    --color-border: #30363d;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  /* 与媒体查询块里的键相同, 只换值 */
  --color-bg: #0d1117;
  --color-surface: #161b22;
  --color-text: #e6edf3;
  --color-muted: #9198a1;
  --color-border: #30363d;
}
```

第 5 章讲自定义属性那篇讲过这里的权重： `:root[data-theme="dark"]` 是 (0,2,0)，媒体查询里的 `:root` 是 (0,1,0)，所以手动选择总能盖住系统偏好，与源码先后无关。`data-theme="light"` 那一块同样要写，否则系统是深色时用户选浅色会被媒体查询盖回去。

深色的调整不只是换色值：

- 底色不用纯黑，正文不用纯白。`#0d1117` 配 `#e6edf3` 比 `#000` 配 `#fff` 对比度略低但可读，眩光小得多。
- 浅色下靠 `box-shadow` 表达的层级，深色下改用更亮的 surface。黑底上的阴影看不出来。
- 饱和色要降一档。`#2f6fed` 放在 `#0d1117` 上会「发光」，深色主题里换成明度更高的蓝，比如 `#6ea8fe`。
- 图片、`<iframe>`、代码高亮主题都有各自的深色版本，别只换 CSS 变量就以为完事。

## 跟随系统与手动切换

三态： 未设置表示跟随系统，用户点了才写入明确值。

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var dark = matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = saved || (dark ? 'dark' : 'light');
    } catch (e) {
      /* localStorage 在隐私模式下可能抛错, 忽略, 走默认 */
    }
  })();
</script>
```

这个脚本必须放在 `<head>` 里、样式表之前，并且不能加 `defer`。放到 `</body>` 前或 `defer` 之后，首帧已经用浅色画完了，再切深色就是一次白闪。

三个具体的坑：

- 服务器渲染的页面，首屏 HTML 里可以直接带 `data-theme`，脚本只负责读本地存储纠正，这样连脚本都不需要等。
- `localStorage` 在部分浏览器的隐私模式下 `setItem` 抛 `QuotaExceededError`，不包 `try` 会让整段脚本中断，后续逻辑全不执行。
- 切换时给 `html` 加一个 `transition: background-color 200ms` 会产生「整页渐变」的观感，变慢且闪；不要给根元素加过渡。

切换本身只是改一个属性：

```js
const root = document.documentElement
const mq = matchMedia('(prefers-color-scheme: dark)')

function apply(mode) {
  root.dataset.theme = mode || (mq.matches ? 'dark' : 'light')
  if (!mode) delete root.dataset.theme // 回到跟随系统
}

mq.addEventListener('change', () => {
  if (!localStorage.getItem('theme')) apply(null)
})
```

`<meta name="color-scheme" content="light dark">` 可以提前告诉浏览器两套配色都支持，让首屏滚动条与表单控件不闪；项目里已经有 `color-scheme` 属性时，这行不是必须的。

## 对比度

WCAG 的 AA 门槛是两档数字，记不住会写错：

| 内容 | 最低对比度 | 说明 |
| --- | --- | --- |
| 正文与小字号文本 | 4.5:1 | 小于 24px，或小于 18.66px 的粗体 |
| 大字号文本 | 3:1 | ≥ 24px，或 ≥ 18.66px 的粗体 |
| 图标、输入框边框、焦点环 | 3:1 | 非文本对比度要求 |
| 占位符、禁用态说明文字 | 4.5:1 | 属于文本，不是装饰 |

`#999999` 在白色上是 2.85:1，不够。`#767676` 在白色上约 4.54:1，刚好过线，这也是很多设计系统把次要文字定在这个灰度的原因。

容易漏的几处：

- **半透明文字要按合成后的颜色算**。`rgb(255 255 255 / 0.6)` 叠在 `#161b22` 上，实际颜色是混合结果，不是 60% 的白。
- **焦点环别用 `outline: none`**。要用 `outline: 2px solid var(--color-accent); outline-offset: 2px`，并保证它与相邻背景有 3:1。
- **禁用态可以豁免**，但别用「低对比度」表达「不可用但需要读」的信息，比如表单校验失败的说明文字。
- **深色主题要重新测一遍**。同一组令牌在浅色下 5.2:1，在深色下可能掉到 3.8:1。

## 流体排版

固定断点的字号在小屏和大屏之间是跳变的，`clamp()` 把字号写成随视口连续变化的区间：

```css
:root {
  --step-0: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
  --step-1: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2: clamp(1.5rem, 1.3rem + 1vw, 2rem);
  --step-3: clamp(1.75rem, 1.4rem + 1.75vw, 2.5rem);
}

body {
  font-size: var(--step-0);
  line-height: 1.6;
}

h1 { font-size: var(--step-3); line-height: 1.2 }
h2 { font-size: var(--step-2); line-height: 1.3 }
```

`clamp(最小值, 首选值, 最大值)`，浏览器取三者中间那个。首选值写成 `rem + vw`，原因是纯 `vw` 完全不理会用户把浏览器默认字号从 16px 调到 20px 这件事，而 `rem` 会跟随。

三条硬规则：

1. `clamp()` 的上下限用 `rem`，不用 `px`。`clamp(14px, 2vw, 18px)` 在用户放大字号时一点不变，等于把可访问性设置废掉。
2. 行高用无单位值。`line-height: 1.6` 会按各自字号重算，`1.6em` 在继承时按父级字号算死，换字号后行距失控。
3. 中文标题在最大字号处容易一行只剩四五个字。给标题加 `max-width: 20em`，或用 `text-wrap: balance` 作渐进增强，不支持时不影响阅读。

字号之外，`letter-spacing` 别写固定 px。小字号需要略微加宽、大字号需要略微收紧，用 `em` 才有相对关系： `h1 { letter-spacing: -0.01em }`。

## 小结

- 深色主题是另一套语义令牌加 `color-scheme`，结构、组件与原始色板都不动；
- `data-theme` 的权重高于媒体查询里的 `:root`，手动选择天然覆盖系统偏好，但要显式写 `light` 那块；
- 首屏防白闪靠 `<head>` 里的同步内联脚本，`defer` 与放在 body 结尾都太晚；
- 正文对比度 4.5:1，大字号与图形 3:1，半透明颜色按合成结果算；
- 字号以 `rem` 为基准，`clamp()` 的上下限也用 `rem`，否则不跟随用户设置；
- 行高用无单位值，字距用 `em`，别用固定像素。
