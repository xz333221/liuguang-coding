---
title: 选择器、组合器与伪类
summary: 'CSS 选择器按标签、类、ID、属性与状态匹配元素，组合器描述元素之间的结构关系，伪类表达状态，伪元素创建不在 DOM 中的片段。本文讲解三种引入方式、常用选择器、四种组合器与伪类伪元素的写法，并列出滥用 ID、选择器过深等易错点。'
category: frontend
node: frontend-css-selector
order: 10
level: 入门
tags: [CSS, 选择器, 伪类, 组合器]
updated: 2026-11-19
mindmap: css-selector.mindmap.json
terms: []
sources:
  - title: MDN · CSS 选择器
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_selectors
    note: 选择器与组合器的完整语法参考。
  - title: 'web.dev · Learn CSS: Selectors'
    url: https://web.dev/learn/css/selectors
    note: 选择器分类与匹配方式的入门讲解。
  - title: W3C · CSS
    url: https://www.w3.org/Style/CSS/
    note: CSS 规范与工作组入口。
---

上一篇讲完了 HTML 的 meta、viewport 与资源加载顺序：页面有了结构和内容，还没有视觉表现。CSS 要做的第一件事，是说明样式作用在哪些元素上，这件事由选择器完成。

## 引入 CSS 的三种方式

CSS 可以写在三个位置：

```html
<!-- 1. 外链样式表:可以被缓存,多个页面复用 -->
<link rel="stylesheet" href="./style.css">

<!-- 2. style 标签:只对当前文档生效 -->
<style>
  p { color: #333; }
</style>

<!-- 3. 行内 style 属性:只作用于该元素 -->
<p style="color: #333;">正文</p>
```

三者的区别不只是书写位置。外链样式表可以单独缓存，便于多个页面共享，是项目的默认选择。style 标签适合单页演示或首屏关键样式。行内样式的优先级高于选择器，但它把结构与表现混在一起，无法复用，只适合由脚本在运行时写入具体的计算值。上一段说「优先级高」只是大致倾向，完整的比较规则在下一篇层叠里展开。

## 基本选择器

选择器是一个模式，浏览器用它在 DOM 树中查找匹配的元素。常用的几类：

- 类型选择器：`p`、`h1`、`button`，按标签名匹配；
- 类选择器：`.card`，匹配 `class` 中包含该名字的元素；
- ID 选择器：`#site-header`，匹配 `id` 等于该值的唯一元素；
- 属性选择器：`[type="email"]`、`[href^="https"]`，按属性值匹配；
- 通配选择器：`*`，匹配任意元素，常用于重置或占位；
- 伪类与伪元素：`:hover`、`::before`，匹配状态或创建片段，稍后展开。

```css
p { line-height: 1.6; }             /* 所有段落 */
.note { color: #666; }              /* class="note" 的元素 */
#site-header { height: 64px; }      /* id="site-header" 的元素 */
a[href^="https"] { color: #0a7; }   /* 以 https 开头的链接 */
input[type="email"] { border-color: #999; }
```

属性选择器的运算符除了 `^=`(前缀)，还有 `$=`(后缀)、`*=`(包含)与 `~=`(按空格分隔的单词)。给 `<a href="https://example.com">` 加上上面的规则，链接文字会变成绿色。

## 组合器

组合器不改变匹配条件，而是描述两个选择器之间的结构关系。以一段菜单为例：

```html
<ul class="menu">
  <li>首页</li>
  <li class="active">文档</li>
  <li>关于</li>
</ul>
```

```css
.menu li { padding: 8px 12px; }               /* 后代:menu 内任意层级的 li */
.menu > li { border-bottom: 1px solid #eee; }  /* 子:只匹配 menu 的直接子元素 */
li + li { margin-top: 4px; }                   /* 相邻兄弟:紧接在 li 后面的 li */
li.active ~ li { color: #999; }                /* 通用兄弟:active 之后的所有 li */
```

四者的差别在于匹配范围。后代选择器用空格，能跨越任意层级；子选择器用 `>`，只向下看一层；相邻兄弟用 `+`，要求两个元素同级且紧挨；通用兄弟用 `~`，要求同级但不要求紧挨。运行上面的代码，前两条规则给三个 `li` 加上内边距和分隔线，`li + li` 从第二项开始增加上间距，`.active ~ li` 只把「关于」变成灰色。

## 伪类与伪元素

伪类是加到选择器末尾的关键字，用来匹配处于某种状态或位置的元素，不改变 DOM 结构。几个常用的：

- `:hover`:指针悬停在元素上；
- `:focus-visible`:元素获得键盘焦点，且浏览器判断需要显示焦点指示；
- `:first-child` / `:last-child`:元素是父元素的第一个或最后一个子元素；
- `:nth-child(an+b)`:按位置匹配，`2n` 表示偶数，`odd` 表示奇数。

```css
.button:hover { background: #0a7; }
.button:focus-visible { outline: 2px solid #0a7; outline-offset: 2px; }
.list li:first-child { font-weight: 600; }
.list li:nth-child(even) { background: #f7f7f7; }
```

`:nth-child` 只数位置，不看类型。父元素里混排了 `p` 和 `li` 时，`li:nth-child(2)` 要求第二个子元素本身是 `li`，不是「第二个 li」；后者要用 `li:nth-of-type(2)`。

伪元素用于创建不属于 DOM 的片段，必须配合 content 属性才会出现：

```css
.quote::before { content: "「"; color: #999; }
.quote::after { content: "」"; color: #999; }
.clearfix::after { content: ""; display: block; clear: both; }
```

`::before` 与 `::after` 生成的内容参与布局与绘制，也会被部分辅助技术朗读，装饰性的图形应放在 background 中，不要用伪元素承载文本。

## 选择器列表与易错点

多个选择器共享一组声明时，用逗号组成列表：

```css
h1, h2, h3 { line-height: 1.3; margin: 0 0 0.5em; }
```

列表中的选择器逐个匹配，任意一个命中即可。列表中只要有一个选择器无效，整条规则就会被丢弃；`:is()` 与 `:where()` 的列表采用更宽松的解析，可以容忍个别无效项。

三个常见陷阱：

1. **用 ID 写样式。** ID 的优先级高于任何类组合，后续想覆盖只能继续加 ID 或 `!important`。ID 留给锚点与表单的 `for` 关联。
2. **选择器过深。** `.page .content .card .title span` 把结构与样式绑死，改一层 HTML 就要改 CSS，优先级也被抬高。用类直接定位元素。
3. **只靠 `:hover` 传达信息。** 触屏设备没有稳定的悬停状态，信息应在默认状态下就能读到。

## 小结

- CSS 有外链、style 标签、行内三种引入方式，项目优先外链；
- 基本选择器覆盖类型、类、ID、属性、通配，伪类与伪元素补充状态和片段；
- 组合器按后代、子、相邻兄弟、通用兄弟描述结构关系；
- 伪类匹配状态与位置，伪元素必须配合 content;
- 避免用 ID 写样式，避免选择器过深，不要把信息藏在 hover 里；
- 选择器决定「命中谁」，多条规则同时命中时由层叠决定胜负，下一篇展开。
