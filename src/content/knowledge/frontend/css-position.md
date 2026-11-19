---
title: 定位、层叠上下文与 z-index
summary: 'position 决定元素是否脱离文档流以及相对谁定位:relative 保留原位置,absolute 相对最近的定位祖先,fixed 相对视口,sticky 在阈值内正常排列、越过阈值后固定。z-index 只在定位元素或创建层叠上下文的元素上参与比较,祖先创建层叠上下文后,子元素的 z-index 无法越过该祖先的层级。'
category: frontend
node: frontend-css-position
order: 19
level: 入门
tags: [position, 层叠上下文, z-index, sticky]
updated: 2026-11-19
mindmap: css-position.mindmap.json
terms: []
sources:
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: position、inset 与 z-index 的取值与适用条件。
  - title: MDN CSS position
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/position
    note: 定位取值、包含块与 sticky 的说明。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: 定位与层叠的入门讲解。
---

上一节用 Grid 搭出了页面骨架,骨架里的顶部导航要吸顶、弹层要覆盖内容,这类需求由定位与层叠规则处理。

## 五种 position

position 决定元素的定位方式,默认值是 static。

| 取值 | 是否脱离流 | 定位参照 |
| --- | --- | --- |
| static | 否 | 不定位,top 等属性无效 |
| relative | 否 | 自身原来的位置 |
| absolute | 是 | 最近的定位祖先的 padding box |
| fixed | 是 | 视口 |
| sticky | 否 | 最近的滚动祖先,越过阈值后固定 |

relative 偏移后原位置仍然占着,后面的元素不会补位,因此它常用来做绝对定位的参照物,或做小幅视觉微调。

absolute 完全脱离文档流,原来的位置被收回。它的包含块是最近一个 position 不为 static 的祖先;找不到时回退到初始包含块。

fixed 的包含块是视口,滚动页面时位置不变。祖先设置了 transform、filter 或 contain: paint 时,fixed 会改为相对该祖先定位,这是弹层位置错位的常见原因。

sticky 是相对定位与固定定位的混合:在滚动容器内,元素先按正常流排列,滚到 top 等阈值后固定,直到父容器边界把它推走。

## 包含块与 inset

top、right、bottom、left 统称 inset 属性,现在可以用 inset: 0 一次写四个方向。它们的百分比相对包含块的宽高计算。

```css
.cover {
  position: absolute;
  inset: 0;
}
```

以上声明让元素铺满最近的定位祖先。居中一个绝对定位元素时,同时设置 inset: 0 与 margin: auto,再给出固定宽高即可:

```css
.dialog {
  position: absolute;
  inset: 0;
  width: 320px;
  height: 200px;
  margin: auto;
}
```

同时设置 left 与 right 且 width 为 auto 时,元素会被拉伸到两端,这条规则常用于全宽遮罩。

## z-index 与层叠上下文

z-index 只在参与层叠的元素上生效:定位元素(position 不为 static),以及 Flex 与 Grid 的子项。给 static 元素写 z-index 不会改变任何显示结果。

层叠上下文(stacking context)是一个独立的层叠单位,内部元素的 z-index 只在上下文内部比较,整个上下文作为一个整体参与父级上下文的排序。以下情况会创建层叠上下文:

- 根元素 html;
- position 为 relative 或 absolute,且 z-index 不为 auto;
- position 为 fixed 或 sticky;
- opacity 小于 1;
- transform、filter、perspective、backdrop-filter 不为 none;
- isolation: isolate;
- will-change 指定了上述任一属性;
- contain 为 layout 或 paint;
- mix-blend-mode 不为 normal。

## 为什么 z-index: 9999 也压不住

原因在于比较范围。看这个结构:

```html
<div class="modal-wrap">
  <div class="modal">弹窗</div>
</div>
<div class="toast">提示</div>
```

```css
.modal-wrap {
  position: relative;
  z-index: 1;
  transform: translateZ(0);
}
.modal {
  position: absolute;
  z-index: 9999;
}
.toast {
  position: fixed;
  z-index: 10;
}
```

modal-wrap 的 z-index 是 1,toast 是 10,两者在根上下文里比较,toast 在上。modal 的 9999 只在 modal-wrap 内部有效,它无法越过父级去和 toast 比较,所以弹窗仍然被提示盖住。

修复方式有三种:提高 modal-wrap 的层级,让它高于 toast;把弹层挂到 body 下,脱离原来的上下文;或者使用 dialog 元素的 showModal() 与 popover 属性,它们渲染在顶层(top layer),不受 z-index 影响。

## sticky 的生效条件

sticky 容易写了却不生效,检查以下几点:

1. 必须指定阈值,至少写 top、bottom、left、right 中的一个,只写 position: sticky 不会产生任何效果;
2. 最近的滚动祖先必须是真正滚动的那一层,祖先设置 overflow: hidden 或 overflow: auto 会改变参照,甚至让 sticky 失效;
3. 父容器必须有足够高度,元素滚到父容器末端就会被带走,父容器与元素等高时没有可固定的区间;
4. 元素自身不能是 display: inline,行内盒不适合作为 sticky 容器。

## 吸顶导航示例

```html
<header class="topbar">站点标题</header>
<main>
  <p>正文内容</p>
</main>
```

```css
body {
  margin: 0;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #ddd;
}
```

预期结果:页面初始时 topbar 在顶部正常占位;向下滚动到它触碰视口顶部后,它固定在顶部,正文从下方滚过;滚动到 main 结束时,topbar 随父容器一起离开。背景色必须是不透明的,否则正文会透出来。

需要固定在整个视口、不随任何容器结束而离开时,改用 position: fixed,并给正文加 padding-top 补偿导航高度。

## 小结

- relative 保留原位置,absolute 相对最近定位祖先,fixed 相对视口,sticky 越过阈值后固定;
- 包含块决定 inset 百分比的参照,inset: 0 可铺满包含块;
- z-index 只对定位元素与 Flex、Grid 子项生效;
- transform、opacity、isolation 等都会创建层叠上下文,子元素的 z-index 无法越过父级;
- sticky 需要阈值、可滚动祖先与足够高的父容器,缺一不可。
