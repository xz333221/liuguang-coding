---
title: Flexbox：主轴、换行与弹性
summary: 'Flexbox 把容器内的子项排成一条主轴，用 justify-content 分配主轴空间、align-items 对齐交叉轴、flex-wrap 控制换行，再用 flex-grow、flex-shrink、flex-basis 决定每一项如何伸缩。它适合一维排列，配合 gap 可以替代大量 margin 计算。'
category: frontend
node: frontend-css-flex
order: 17
level: 入门
tags: [Flexbox, 主轴, flex-grow, 布局]
updated: 2026-11-19
mindmap: css-flex.mindmap.json
terms: []
sources:
  - title: MDN CSS Flexbox
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_flexible_box_layout
    note: 主轴、交叉轴、伸缩属性与对齐属性的完整说明。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: Flexbox 布局模式的入门讲解与示例。
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: flex 简写与各长属性的取值定义。
---

上一节说明了正常流如何排列元素，也提到 float 需要额外清除；这一节用 Flexbox 处理一维排列，也就是一行或一列内的对齐与空间分配。

## 主轴与交叉轴

Flex 容器有两条轴。主轴(main axis)由 flex-direction 决定，子项沿主轴依次排列；交叉轴(cross axis)与主轴垂直。默认 flex-direction: row，主轴水平向右，交叉轴垂直向下。

所有对齐属性都相对这两条轴，所以理解属性前先确认主轴方向：

- justify-content 作用于主轴；
- align-items 与 align-self 作用于交叉轴。

## 容器上的属性

display: flex 让元素成为 Flex 容器，直接子元素成为 Flex 项目(flex item)。项目的外侧 display 值被块级化，但内部布局方式不变。

```html
<nav class="nav">
  <a href="/">首页</a>
  <a href="/docs">文档</a>
  <a href="/about">关于</a>
  <button class="login">登录</button>
</nav>
```

```css
.nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 20px;
  border-bottom: 1px solid #ddd;
}
.nav .login {
  margin-left: auto;
}
```

预期结果：三个链接靠左，登录按钮被 margin-left: auto 推到最右侧，所有项目在交叉轴上垂直居中。

flex-direction 取 row、row-reverse、column、column-reverse，决定主轴方向与项目顺序。移动端的卡片列表常用 column。

flex-wrap 默认 nowrap，项目会被压缩到一行；设为 wrap 后允许换行，此时 align-content 控制多行之间的分布，取值与 justify-content 类似。

justify-content 常用 flex-start、center、space-between、space-around、space-evenly。space-between 让首尾贴边、剩余空间平均放在项目之间；space-evenly 让项目之间与两端的空间完全相等。

align-items 常用 stretch、flex-start、center、baseline。默认 stretch，项目在交叉轴方向拉满容器高度，这也是等高栏不需要额外声明的原因。

gap 同时设置行列间距，替代过去用 margin 拼凑间距的写法，也不会在容器首尾产生多余空隙。

## 项目上的属性

flex-grow 定义剩余空间的分配比例，默认 0，表示不参与分配。flex-shrink 定义空间不足时的收缩比例，默认 1。flex-basis 定义项目在主轴上的初始尺寸，默认 auto，即回退到 width 或内容宽度。

三者的简写是 flex。常用组合：

- flex: 1 等价于 1 1 0%，项目平分剩余空间，初始尺寸从 0 开始；
- flex: auto 等价于 1 1 auto，先按内容宽度分配，再平分剩余空间；
- flex: none 等价于 0 0 auto，尺寸完全由内容与 width 决定；
- flex: 0 0 200px，固定 200px，不放大也不收缩。

显式设置的 flex-basis 优先于 width。想让侧栏固定 200px，用 flex: 0 0 200px 比只写 width: 200px 更可靠，因为后者仍可能被 flex-shrink 压缩。

align-self 覆盖单个项目在交叉轴上的对齐方式。导航栏中让某个图标顶端对齐时，给它单独设置 align-self: flex-start 即可。

## 常见布局

**居中。** 一行声明让单个子元素在容器内水平垂直居中：

```css
.center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
```

**等高分栏。** 默认 align-items: stretch 会让同一行的项目在交叉轴方向拉满，各栏高度自动相等；给各栏 flex: 1 分配宽度即可，不需要额外声明高度。

**圣杯布局。** 页头、页脚固定，中间三栏自适应，主内容优先占满剩余宽度：

```html
<div class="holy">
  <header>页头</header>
  <div class="body">
    <nav>侧栏</nav>
    <main>主内容</main>
    <aside>右栏</aside>
  </div>
  <footer>页脚</footer>
</div>
```

```css
.holy {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.holy .body {
  display: flex;
  flex: 1;
  gap: 16px;
}
.holy main {
  flex: 1;
  min-width: 0;
}
.holy nav, .holy aside {
  flex: 0 0 180px;
}
```

body 用 flex: 1 占满页头页脚之外的高度，main 再占满三栏中的剩余宽度。这里的 min-width: 0 不是可选配置，原因见下一节。

## 陷阱：min-width 与文字溢出

Flex 项目的 min-width 默认是 auto，含义是「不得小于内容的 min-content 尺寸」。当项目里有一长串不换行的文字或一个宽表格时，项目拒绝继续收缩，最终撑破容器并出现横向滚动条。

```css
.card-row {
  display: flex;
  gap: 12px;
}
.card-row .title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

只写 flex: 1 时，white-space: nowrap 让文字的最小内容宽度等于整行文字宽度，省略号不会出现。补上 min-width: 0 后，项目才允许收缩到内容宽度以下，省略号正常显示。这是 Flex 布局最常见的溢出原因，网格项目同理，可以用 minmax(0, 1fr) 处理。

## 小结

- Flex 是一维布局，主轴由 flex-direction 决定，对齐属性分别作用于主轴与交叉轴；
- justify-content 分配主轴空间，align-items 与 align-self 对齐交叉轴，align-content 处理多行；
- 伸缩看 flex-grow、flex-shrink、flex-basis，简写 flex: 1 等价于 1 1 0%;
- gap 替代 margin 控制间距，等高分栏由默认 stretch 完成；
- 项目无法收缩导致溢出时，检查 min-width: auto 并显式设为零。
