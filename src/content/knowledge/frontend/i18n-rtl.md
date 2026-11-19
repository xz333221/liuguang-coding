---
title: RTL 与本地化布局
summary: '阿拉伯语和希伯来语从右往左排,靠 dir 属性而不是硬编码坐标。布局用逻辑属性,flex 与 grid 随 dir 翻转而 left 与 translateX 不会;方向性图标要镜像,数字与代码保持 LTR。'
category: frontend
node: frontend-i18n-rtl
order: 106
level: 进阶
tags: [国际化, RTL, CSS, 逻辑属性, 双向文本]
updated: 2026-11-19
mindmap: i18n-rtl.mindmap.json
terms: []
sources:
  - title: MDN · CSS 逻辑属性
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_logical_properties_and_values
    note: 用 inline 与 block 轴替代 left、right 的属性体系。
  - title: W3C · 国际化最佳实践
    url: https://www.w3.org/International/quicktips/
    note: 语言标记、文字方向与双向文本的处理建议。
  - title: MDN · dir
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/dir
    note: ltr、rtl、auto 三个取值与继承规则。
---

上一篇把文案、日期和数字交给 `Intl`,页面文字仍然默认从左往右排。阿拉伯语、希伯来语、波斯语的使用者看到的是镜像的界面:导航在右侧,进度条从右往左走,图标指向反方向。这一篇讲怎么让布局跟着方向走。

## dir 决定书写方向

方向的源头是 `dir` 属性,标在 `html` 上:

```html
<html lang="ar" dir="rtl">
  <body>
    <nav>...</nav>
    <main>...</main>
  </body>
</html>
```

`dir` 可继承,子元素默认跟随父级。需要局部改变方向的场景不多,常见的是嵌入一段英文引用,给它加 `dir="ltr"`。

第三个取值 `dir="auto"` 让浏览器看内容的第一个强方向字符来决定方向。它适合用户生成的内容:评论区里一段中文、一段阿拉伯语混在一起,写死 `rtl` 会把中文也翻过去。一条评论用 `dir="auto"`,中文评论按 LTR 排,阿拉伯语评论按 RTL 排,不用在后端猜。

不要把方向交给 CSS 的 `direction: rtl`。`dir` 属性会继承,也会被读屏和表单控件识别;只写 CSS 改的是样式,语义层面仍然是 LTR,两处不一致时排查成本很高。方向统一用属性表达。

## 逻辑属性替代 left 与 right

物理属性写死了方向,`margin-left` 在 RTL 里永远在左边,而那里已经是内容的末尾。逻辑属性用 inline 与 block 两个轴描述位置,方向变了自动跟着换:

| 物理属性 | 逻辑属性 | 说明 |
|---|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` | inline 轴是文字的横向轴 |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` | 简写为 `padding-inline` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` | 定位偏移 |
| `width` | `inline-size` | 横向尺寸 |
| `border-left` | `border-inline-start` | 单边边框 |
| `text-align: left` | `text-align: start` | 文字对齐 |
| `float: left` | `float: inline-start` | 浮动方向 |

```css
/* 错:图标永远在左,文字间距永远在左 */
.item {
  padding-left: 12px;
  border-left: 2px solid #d0d7de;
}

/* 对:方向由 dir 决定 */
.item {
  padding-inline-start: 12px;
  border-inline-start: 2px solid #d0d7de;
}
```

`text-align: start` 和 `text-align: end` 是最省事的一对。很多样式表里写 `text-align: left`,在 RTL 下标题会贴左,和正文错位。

逻辑属性在主流浏览器里已经全面支持,新项目没有理由再用物理属性写左右。改存量代码时,`margin-left` 这类声明可以按上表逐个替换,视觉在 LTR 下完全不变。

## flex 与 grid 跟随方向

`flex-direction: row` 的主轴起点就是 inline 轴的起点。RTL 下起点在右边,整个顺序自动镜像,不需要写 `row-reverse`。一个 `display: flex` 加 `gap: 8px` 的工具栏,LTR 下从左往右排,RTL 下从右往左排,样式表一个字都不用改。

坑在于用 `row-reverse` 去实现「图标在右」的布局。这样写等于把方向写死在代码里:RTL 下起点已经在右,再 reverse 一次,图标跑回左边,变成双重翻转。

grid 同理,自动排列从 inline-start 开始,RTL 下第一列在右侧。`grid-template-columns: 200px 1fr` 在 RTL 下,固定的 200px 那一列就跑到右边,模板不用改。

`order` 属性只调整项目顺序,不改变轴向,在 RTL 下沿反转后的轴生效。用它做布局同样是把视觉顺序交给 CSS,和 DOM 顺序脱节,键盘焦点顺序会不一致,第 18 章第一篇讲过这个问题。

## 镜像什么,不镜像什么

方向性图形要跟着翻,非方向性的不要:

| 元素 | 处理 |
|---|---|
| 返回、前进、下一页箭头 | 镜像 |
| 面包屑分隔符、列表符号缩进 | 镜像 |
| 进度条、轮播方向、侧边抽屉滑入方向 | 镜像 |
| 播放、暂停、时钟、勾选 | 不镜像 |
| 品牌 logo、含文字的图标 | 不镜像 |
| 数字、公式、图表坐标轴 | 不镜像 |

镜像图标有两种做法:准备一套 RTL 图标资源,或者用 `transform: scaleX(-1)`:

```css
[dir="rtl"] .icon-back {
  transform: scaleX(-1);
}
```

`scaleX(-1)` 会把整个图形左右翻转,带描边或渐变的图标看起来会有点不对,细节要求高时还是各出一套。品牌 logo 被翻转是事故,选择器要限定在方向性图标上,不要写成 `[dir="rtl"] img`。

## 双向文本混排

RTL 段落里出现英文单词、数字、URL 时,浏览器用 Unicode 双向算法排布。多数情况结果正确,但边界上会出错:

- 电话号码、订单号在阿拉伯语句子里被拆开重排;
- 用户昵称含阿拉伯字母和拉丁字母,和后面的标点粘在一起;
- 代码片段里的括号跑到反方向。

修法是给这段内容一个独立的方向,用 `<bdi>` 或 `dir` 属性:

```html
<p dir="rtl">
  订单号 <bdi>2026-11-19-0042</bdi> 已发货
</p>

<p dir="rtl">
  示例代码:<code dir="ltr">const total = 0</code>
</p>
```

`bdi` 是双向隔离元素,自动判断内容方向并且与上下文隔离,适合放用户名这类未知内容。已知要保持 LTR 的代码、URL、邮箱,直接加 `dir="ltr"`。

不要用 U+200E、U+202B 这些不可见的 Unicode 控制符调方向。它们在编辑器里看不见,复制粘贴会丢,维护的人根本不知道问题出在哪。用元素和属性,语义清楚。

## 定位与 transform 的坑

绝对定位的偏移是物理的。徽标用 `right: -4px` 挂在右上角,RTL 下它仍在右上,而右上已经成了内容的起始侧:

```css
/* 错:写死右侧 */
.badge { position: absolute; top: 0; right: -4px; }

/* 对:跟随 inline 轴 */
.badge { position: absolute; top: 0; inset-inline-end: -4px; }
```

`transform` 也不感知方向。抽屉从左侧滑入写 `translateX(-100%)` 到 `translateX(0)`,RTL 下应该从右侧滑入,值是正的。CSS 变量能省一点重复,但值本身还是得按方向给两套:

```css
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease;
}
.drawer.open { transform: translateX(0); }

[dir="rtl"] .drawer {
  transform: translateX(100%);
}
[dir="rtl"] .drawer.open { transform: translateX(0); }
```

`translate` 的百分比相对元素自身尺寸,和 `left` 的百分比含义不同,替换时别混用。

## 怎么测

不用装阿拉伯语系统也能测大半:在 DevTools 里把 `<html>` 的 `dir` 改成 `rtl`,刷新,截一张图。看四件事:导航是否到了右侧、图标是否指向正确、文字是否都贴右、有没有元素重叠或溢出。

再进一步,把 `lang` 改成 `ar`,用 `Intl` 的那部分会跟着变成阿拉伯语格式,日期和数字的排布问题会一起暴露。

伪本地化工具会把文案替换成带重音的变体并加长三成,能测出布局对长文本的容忍度,也能暴露硬编码的字符串。RTL 加长文本,才是最难看的组合。

## 小结

- 方向由 `dir` 属性控制,标在 `html` 上,用户生成内容用 `dir="auto"`;
- 布局用逻辑属性,`margin-inline-start`、`text-align: start`、`inset-inline-end` 自动跟随方向;
- flex 与 grid 的主轴随 `dir` 翻转,不要再用 `row-reverse` 手工镜像;
- 方向性图标要镜像,播放键、时钟、logo、数字不镜像;
- 混排的号码、代码、URL 用 `bdi` 或 `dir="ltr"` 隔离,不用不可见控制符;
- `left`、`translateX` 不感知方向,定位与滑入动画要按 `dir` 单独处理。
