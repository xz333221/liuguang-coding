---
title: 字体、行高与文本排版
summary: 'font-family 按回退链选择字体，末尾要写通用族；字号用 rem 跟随用户设置；line-height 用无单位值，让子元素按自身字号等比继承；字重取决于字体提供的档位，可变字体可以连续调节。white-space 控制空白与换行，单行与多行截断各有固定的属性组合。'
category: frontend
node: frontend-css-typography
order: 14
level: 入门
tags: [CSS, 字体, 行高, 排版, 文本溢出]
updated: 2026-11-19
mindmap: css-typography.mindmap.json
terms: []
sources:
  - title: MDN · CSS 字体
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_fonts
    note: font-family、font-size、line-height 等属性的参考。
  - title: MDN · line-height
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/line-height
    note: 无单位值、百分比与长度值的继承差异。
  - title: 'web.dev · Learn CSS: Typography'
    url: https://web.dev/learn/css/typography
    note: 字体选择、行高与文本排版的入门讲解。
---

上一篇给盒子定好了尺寸与颜色，其中的字仍然使用浏览器默认外观。字体、行高与对齐方式决定一段文字是否易读，这一篇集中处理文本排版。

## font-family 回退链

`font-family` 接受一个字体列表，浏览器按顺序选择第一个可用字体。列表末尾应写通用族，保证所有平台都有可用字体：

```css
body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
```

通用的字体族有 `serif`(衬线)、`sans-serif`(无衬线)、`monospace`(等宽)、`system-ui`(系统界面字体)与 `cursive`、`fantasy`。界面正文通常用无衬线，代码与对齐数据用等宽。

字体名包含空格时必须加引号，例如 `"PingFang SC"`。回退是按字符进行的：某个字体缺少当前字符时，浏览器从后续字体中寻找，因此中英文混排时西文用一个字体、汉字用另一个字体是正常现象。自定义字体通过 `@font-face` 加载，并用 `font-display: swap` 让文字先用回退字体显示，避免首屏空白。

## font-size 与 rem

字号用 `rem` 可以让页面跟随用户在浏览器中设置的基准字号。多数浏览器默认 16px，用户调大后，`1rem` 也随之变大：

```css
html { font-size: 100%; }        /* 尊重用户设置,不要固定成 10px */
body { font-size: 1rem; }
h1 { font-size: 2rem; }          /* 32px */
.small { font-size: 0.875rem; }  /* 14px */
```

把根字号改成 `62.5%` 以便用 `0.1rem` 表示 1px 的写法曾经流行，代价是绕过用户的字号偏好，并让依赖 `rem` 的第三方组件整体偏小，不建议在新项目使用。

## line-height 无单位值

`line-height` 设置行盒的高度，决定多行文字之间的间距。推荐使用无单位数值：

```css
body { line-height: 1.6; }
h2 { line-height: 1.25; }
```
无单位值在继承时保留比例，子元素按自身字号重新计算。父元素字号 16px、行高 1.6 时为 25.6px；子元素字号 32px 时行高自动变为 51.2px。

写成 `line-height: 25.6px` 或 `160%` 时，继承下去的是计算后的固定值，子元素字号变大而行高不变，文字会显得拥挤。正文 1.5 到 1.7、标题 1.2 到 1.3，是常用的取值区间。

## 字重与可变字体

`font-weight` 取 100 到 900,`normal` 对应 400,`bold` 对应 700。实际能显示的档位取决于字体文件：只提供 400 与 700 的字体，请求 500 时浏览器会在两者中挑一个，必要时合成加粗，笔画容易失真。

可变字体(variable font)用一个文件提供连续的轴，可以精确使用 550 这样的中间值：

```css
.heading { font-family: "Inter", system-ui, sans-serif; font-weight: 550; }
```

代价是字体文件体积较大，是否使用取决于项目对字重精度的要求。正文用 400、强调用 600 到 700，通常足够。

## 字距与对齐

`letter-spacing` 调整字符间距，正值变松，负值变紧。大号标题略微收紧可以更紧凑，正文不建议改动：

```css
h1 { letter-spacing: -0.01em; }
.prose p { text-indent: 2em; }  /* 首行缩进两个汉字 */
```

`text-align` 控制行内内容的水平对齐，常用 `left`、`center`、`right` 与 `justify`。`justify` 让两端对齐，西文需要配合连字符断词，中文段落可以直接使用。

`text-indent` 只影响块的第一行，`2em` 等于两个当前字号，正好是两个汉字。

## white-space 与换行

`white-space` 决定空白字符与换行符如何处理：

- `normal`:默认值，连续空白折叠为一个空格，自动换行；
- `nowrap`:空白折叠，但不自动换行；
- `pre`:保留空格与换行，不自动换行；
- `pre-wrap`:保留空格与换行，同时自动换行；
- `pre-line`:折叠连续空格，保留换行，自动换行。

```css
pre, code { white-space: pre-wrap; }  /* 保留缩进,长行自动折行 */
.nowrap { white-space: nowrap; }
```

展示用户输入的多行文本时用 `pre-wrap`，既保留换行又不会撑破容器。

## 文本溢出省略号

单行截断需要三个属性配合：

```css
.ellipsis { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
```

`white-space: nowrap` 阻止换行，`overflow: hidden` 裁掉超出部分，`text-overflow: ellipsis` 在裁剪处画省略号。少任何一个，效果都不出现。

多行截断使用 `-webkit-line-clamp`:

```css
.clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;   /* 最多显示三行 */
  overflow: hidden;
}
```

预期结果：超过三行的文字在第三行末尾显示省略号。这三个 `-webkit-` 前缀属性在所有主流浏览器中可用，`line-clamp` 的标准属性仍在推进中。

## 一段排版示例

```html
<style>
  .prose {
    max-width: 68ch;
    font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 1rem;
    line-height: 1.7;
    color: hsl(220 12% 20%);
  }
  .prose h2 {
    font-size: 1.5rem;
    line-height: 1.3;
    letter-spacing: -0.01em;
    margin: 1.5em 0 0.5em;
  }
  .prose p { margin: 0 0 1em; }
</style>
<article class="prose">
  <h2>渲染流水线</h2>
  <p>浏览器把 HTML 解析成 DOM,把 CSS 解析成 CSSOM,两者合并后计算每个盒子的位置与尺寸。</p>
  <p>布局完成后进入绘制与合成,最终显示在屏幕上。</p>
</article>
```

预期结果：正文每行约 68 个字符，行距 1.7，标题 24px 且行距更紧，段间距 1em。标题的上外边距用 `em` 表示，跟随标题自身字号缩放。

## 小结

- `font-family` 按回退链取第一个可用字体，末尾写通用族，含空格的字体名加引号；
- 字号用 `rem` 跟随用户设置，根字号保持 100%;
- `line-height` 用无单位值，继承时按子元素字号重新计算；
- 字重取决于字体提供的档位，可变字体支持连续调节；
- `white-space` 控制空白与换行，单行截断需要 overflow、nowrap、text-overflow 三个属性；
- 行宽控制在 45 到 75 个字符，正文行高取 1.5 到 1.7。
