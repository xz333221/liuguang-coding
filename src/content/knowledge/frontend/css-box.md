---
title: 盒模型与 box-sizing
summary: '每个元素都被渲染成一个由 content、padding、border、margin 组成的矩形盒。默认的 content-box 让 width 只作用于内容区,加内边距和边框后盒子变大;border-box 让 width 包含内容、内边距与边框。相邻与父子之间的垂直 margin 会折叠,overflow 决定溢出内容如何裁剪。'
category: frontend
node: frontend-css-box
order: 12
level: 入门
tags: [CSS, 盒模型, box-sizing, margin, overflow]
updated: 2026-11-19
mindmap: css-box.mindmap.json
terms: []
sources:
  - title: MDN · CSS 盒模型
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_box_model
    note: 四个区域、box-sizing 与 margin 折叠的定义。
  - title: 'web.dev · Learn CSS: The box model'
    url: https://web.dev/learn/css/box-model
    note: 盒模型的入门讲解与示意。
  - title: W3C · CSS
    url: https://www.w3.org/Style/CSS/
    note: CSS 规范与工作组入口。
---

上一篇解决了「谁生效」,这一篇解决「占多大空间」。CSS 把每个元素渲染成一个矩形盒,布局从这个盒子开始计算。

## 盒子的四个区域

```text
margin → border → padding → content  (由外到内)
```

- content:内容区,文字、图片或子元素实际占据的部分;
- padding:内边距,内容与边框之间的空白,背景色会延伸到这里;
- border:边框,围绕内边距;
- margin:外边距,盒子与其他盒子之间的空白,始终透明。

## box-sizing:content-box 与 border-box

`width` 和 `height` 到底指哪一层,由 `box-sizing` 决定。

默认值 `content-box` 下,`width` 只设置内容区宽度,内边距与边框额外增加:

```css
.card { box-sizing: content-box; width: 200px; padding: 16px; border: 1px solid #ddd; }
```

盒子的实际宽度是 `200 + 16 × 2 + 1 × 2 = 234px`。设置了固定宽度却因为加内边距而溢出容器,通常就是这个原因。

`border-box` 下,`width` 包含内容、内边距和边框,内容区自动缩小:

```css
.card { box-sizing: border-box; width: 300px; padding: 16px; border: 1px solid #ddd; }
```

此时外部宽度就是 300px,内容区宽度为 `300 - 32 - 2 = 266px`。给所有元素统一设置,可以避免逐处换算:

```css
*, *::before, *::after { box-sizing: border-box; }
```

这是新项目常见的基础重置。它改变的是整个文档的默认假设,引入依赖旧假设的第三方样式时需要确认。

## 块级盒与行内盒

块级盒(block)独占一行,宽度默认 `auto`,填满包含块,可以设置 `width`、`height`,垂直方向的 margin 生效。`div`、`p`、`h1`、`section` 默认是块级。

行内盒(inline)随文字流排列,宽高由内容决定,`width`、`height` 不生效;垂直方向的 padding 与 border 会绘制出来,但不撑开行高;垂直 margin 不生效。`span`、`a`、`strong` 默认是行内。

需要行内排列又能设置宽高时,用 `inline-block`:

```html
<style>
  .tag { display: inline-block; padding: 2px 8px; background: #eef; border-radius: 4px; }
</style>
<p>状态 <span class="tag">已发布</span> 于今天更新</p>
```

标签跟随文字排列,同时内边距与圆角完整生效。

## width、height 与 min/max

块级元素的 `width: auto` 表示占满可用宽度,不是 0。`height: auto` 由内容撑开,这也是推荐做法,内容变化时不会溢出。

`min-width`、`max-width`、`min-height`、`max-height` 给尺寸设置边界。图片与首屏区域常用:

```css
img { max-width: 100%; height: auto; }
.hero { min-height: 240px; }
```

`max-width: 100%` 让图片最宽不超过容器,`height: auto` 保持原始比例,避免变形。百分比高度要求父元素有确定的高度,否则按 `auto` 处理。

## margin 折叠

垂直方向的相邻 margin 会合并成一个,取其中较大的值,这个过程叫 margin 折叠(margin collapsing)。

```html
<style>
  .a { margin-bottom: 24px; }
  .b { margin-top: 16px; }
</style>
<div class="a">A</div>
<div class="b">B</div>
```

两个盒子之间的间距是 24px,不是 40px。父子之间也会折叠:父元素没有上内边距、上边框和行内内容时,第一个子元素的上 margin 会穿出父元素,表现为父元素整体下移。

阻止折叠的常用方法是给父元素建立独立的块级格式化上下文:

```css
.wrapper { display: flow-root; }
```

也可以给父元素加 padding 或 border,但会改变尺寸。Flex 与 Grid 容器的子项不参与 margin 折叠,这也是布局常用这两种方式的原因之一。

## overflow

当内容超出盒子的 content 区,`overflow` 决定如何处理:

- `visible`:默认值,内容溢出到盒子外;
- `hidden`:裁剪溢出部分,不显示滚动条;
- `scroll`:总是显示滚动条;
- `auto`:需要时显示滚动条。

```css
.panel { max-height: 200px; overflow: auto; }
```

`overflow: auto` 配合 `max-height` 是最常见的滚动区域写法,内容不足时不出现滚动条。`overflow: hidden` 还会裁剪到圆角范围内,这一点下一篇讲背景与圆角时用到。

## 用 DevTools 看盒模型

DevTools 的 Elements 面板选中元素后,Computed 标签页底部有一张盒模型图,从内到外标出 content、padding、border、margin 的数值。点击某个数值可以直接编辑,用来验证是哪一层导致溢出。

把前面的规则拼成一张卡片:

```html
<style>
  .card {
    box-sizing: border-box;
    width: min(320px, 100%);
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 16px auto;
  }
  .card h3 { margin: 0 0 8px; }
  .card p { margin: 0; }
</style>
<article class="card">
  <h3>标题</h3>
  <p>正文内容。</p>
</article>
```

预期结果:卡片含边框总宽 320px,在容器中水平居中;标题与正文间距 8px,标题与段落自身的默认 margin 已经清除,不会出现额外的折叠间距。`min(320px, 100%)` 保证窄屏时不超过容器。

## 小结

- 盒子由 content、padding、border、margin 四层组成;
- `content-box` 的 width 只算内容,`border-box` 的 width 包含内边距与边框;
- 块级盒独占一行且可设宽高,行内盒随文字流动,`inline-block` 兼顾两者;
- `max-width: 100%` 与 `height: auto` 是图片自适应的基础写法;
- 垂直 margin 会在相邻兄弟和父子之间折叠,`display: flow-root` 可以阻止;
- `overflow` 控制溢出内容的裁剪与滚动,DevTools 的盒模型图能直接读出四层数值。
