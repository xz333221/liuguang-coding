---
title: 文档流与 display
summary: '正常流是浏览器的默认排版规则：块级盒子从上到下堆叠并占满包含块宽度，行内盒子从左到右排列并按内容换行。display 决定盒子参与哪种格式化上下文，float、absolute、fixed 会让元素脱离正常流，代价是父容器高度塌陷与后续元素重叠，现代布局应优先用 Flex 或 Grid。'
category: frontend
node: frontend-css-flow
order: 16
level: 入门
tags: [文档流, display, BFC, float]
updated: 2026-11-19
mindmap: css-flow.mindmap.json
terms: []
sources:
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: display 各取值与格式化上下文的规范说明。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: 正常流、display 与布局基础的系统讲解。
  - title: MDN CSS Flexbox
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout
    note: 用 Flex 替代 float 做多栏布局的参照。
---

上一节讲完了背景、边框、圆角与阴影这些绘制属性，从这一节开始处理版面：元素占多大地方、按什么顺序排列。

## 正常流是什么

正常流(normal flow)是浏览器在没有额外布局声明时使用的默认排版规则。它把盒子分成两类：

- 块级盒子(block-level box):在包含块内从上到下堆叠，默认占满包含块宽度，高度由内容决定；
- 行内盒子(inline-level box):在同一行内从左到右排列，宽度由内容决定，一行放不下就在行盒(line box)边界换行。

包含块(containing block)是元素计算尺寸与定位的参照矩形。普通块级元素的包含块通常是最近的块级祖先的内容盒。

```html
<div class="block">块级元素独占一行</div>
<div class="block">第二个块级元素另起一行</div>
<p>段落里可以放 <span>行内元素</span>,它们<em>排在同一行</em>。</p>
```

```css
.block {
  background: #e8f0fe;
  padding: 8px;
}
span, em {
  background: #fde8e8;
}
```

预期结果：两个 div 各占一行且宽度撑满容器；span 与 em 和周围文字在同一行，背景只覆盖文字本身。

## display 的常用取值

display 决定盒子生成哪种类型的盒子，以及内部使用哪种格式化上下文。

- block:块级盒子，可设置宽高与四个方向的 margin;
- inline:行内盒子，width 和 height 不生效，垂直方向的 margin 不占据空间，盒子高度由 font-size 与 line-height 决定；
- inline-block:外部按行内元素参与同行排列，内部按块级容器处理，可以设置宽高；
- none:不生成盒子，从渲染树中移除，不占空间；
- flow-root:生成块级盒子并创建新的 BFC，是替代 clearfix 的现代写法。

```css
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
}
.hidden {
  display: none;
}
```

inline-block 元素底部会出现基线留白，原因是它按行内基线对齐。把 vertical-align 设为 middle 或 top 可以去掉这段空隙。display: none 与 visibility: hidden 的区别在于后者保留盒子与占位，只是不可见。

## 脱离文档流的三种方式

元素不再参与正常流排布，称为脱离文档流(out of flow)。常见有三种：

1. float:盒子浮动到当前行的左侧或右侧，后续行内内容绕排，块级盒子会忽略它的高度；
2. position: absolute:相对最近的定位祖先定位，完全脱离流，不保留原位置；
3. position: fixed:相对视口定位，页面滚动时位置不变。

代价主要有三项：

- 父容器高度塌陷：父元素只包含浮动子元素时，计算高度不会把浮动计入，父容器高度变成 0;
- 后续元素重叠：absolute 元素原来的位置被收回，后面的元素会顶上来；
- 维护成本：清除浮动、定位祖先与层叠顺序都需要额外声明。

## float 与清除浮动

float 最初用于文字环绕图片，后来被用来做多栏布局。它的副作用需要用 clear 清除。

```css
.clearfix::after {
  content: "";
  display: block;
  clear: both;
}
```

clear: both 让元素移动到所有浮动元素的下方。::after 生成一个块级伪元素承担这个动作，父容器就能包住浮动子元素。今天更推荐给父元素加 display: flow-root，一行声明创建 BFC，效果相同，也不需要引入伪元素。

## BFC 一句话

BFC(Block Formatting Context，块级格式化上下文)是一块独立的布局区域：内部元素的排列不影响外部，外部浮动也进不来；它能包住内部浮动，并阻止相邻块级元素的外边距合并。flow-root、float、absolute、overflow 非 visible 都会创建 BFC。日常只需要记住：父容器高度塌陷时，display: flow-root 是最直接的修复方式。

## 两栏布局：从 float 到 flex

float 版本的侧栏加主内容：

```html
<div class="layout">
  <aside class="sidebar">侧栏</aside>
  <main class="main">主内容</main>
</div>
```

```css
.layout {
  display: flow-root;
}
.sidebar {
  float: left;
  width: 200px;
}
.main {
  margin-left: 200px;
}
```

侧栏宽度写死，主内容与侧栏的间距要靠 margin 补齐，元素顺序也受浮动方向限制。

flex 版本：

```css
.layout {
  display: flex;
  gap: 16px;
}
.sidebar {
  flex: 0 0 200px;
}
.main {
  flex: 1;
  min-width: 0;
}
```

HTML 结构完全一致，后者不需要清除浮动，不需要手算 margin，主内容自动占满剩余宽度。侧栏要固定宽度用 flex: 0 0 200px，允许收缩则改成 flex: 0 1 200px。

## 小结

- 正常流：块级从上到下、行内从左到右，是浏览器的默认排版规则；
- display 决定盒子的外部类型与内部格式化上下文，flow-root 可替代 clearfix;
- float、absolute、fixed 会脱离文档流，带来高度塌陷与元素重叠；
- 清除浮动用 flow-root 最简洁，伪元素 clearfix 属于历史写法；
- 多栏布局优先用 Flex 或 Grid，不再让 float 承担版面职责。
