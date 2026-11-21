---
title: :has / :is / :where 与现代选择器
summary: ':where() 的权重恒为零，:is() 取参数中最高权重，:has() 按后代或兄弟的状态反向匹配父元素；这些伪类减少重复，也改变了对优先级的控制方式。'
category: frontend
node: frontend-css-modern-selector
order: 26
level: 进阶
tags: [CSS, 选择器, ':has', 优先级]
updated: 2026-11-19
mindmap: css-modern-selector.mindmap.json
terms: [syntax-sugar]
sources:
  - title: MDN · :has
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/:has
    note: 相对选择器参数、限制与性能提示。
  - title: MDN · :is
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/:is
    note: 参数列表与权重取最高项的规则。
  - title: MDN · :where
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/:where
    note: 权重恒为零的用途。
---

上一篇的 transform 处理元素自身的几何，选择器决定规则落到哪些元素；这一篇看近几年进入主流的几个伪类。

## :is() 与 :where()

`:is()` 匹配参数列表中的任意一个选择器，适合合并重复：

```css
:is(h1, h2, h3) + p {
  margin-top: 8px;
}
```

等价于把选择器逐条展开，但写法短得多。`:is()` 的权重取参数中最高的一项，不是各项之和。第一条的权重来自 `h1` 的 (0,0,1)，不是三个选择器相加。

`:where()` 的参数与 `:is()` 相同，权重恒为 0:

```css
:where(article, section, aside) h2 {
  margin-block: 24px 8px;
}
```

这条规则对 `h2` 的权重只有 (0,0,1)，来自 `h2` 本身。`:where()` 适合 reset 与基础样式：它们不该和组件样式争夺优先级，组件里一个普通类就能覆盖。

`:is()` 不是语法糖，它改变了权重的计算方式；把它当成简写，可能在覆盖时得到意外结果。

## :has()

`:has()` 根据后代或后续兄弟的状态匹配元素，也就是常说的父选择器：

```css
.card:has(> img) {
  padding-top: 0;
}

h2:has(+ p) {
  margin-bottom: 4px;
}

label:has(+ input:focus) {
  color: #2f6fed;
}
```

- `:has(> img)` 选择直接包含图片的卡片；
- `:has(+ p)` 选择后面紧跟段落的标题；
- `:has(+ input:focus)` 选择后面输入框获得焦点的标签。

`:has()` 的参数是相对选择器，可以带组合符。它不能嵌套在另一个 `:has()` 内，也不能出现在伪元素里。

性能上，`:has()` 需要针对候选元素检查其子树或兄弟。参数越宽，检查成本越高。避免 `*:has(...)` 这类全量匹配，把范围收在前面的选择器上，例如使用 `.list:has(...)`。

兼容性：Chrome 105、Safari 15.4、Firefox 121 起可用，当前主流浏览器均已支持。

## :not() 的参数列表

`:not()` 接受选择器列表，表示不匹配其中任何一个：

```css
.button:not(.is-disabled, .is-loading) {
  cursor: pointer;
}
```

权重同样取参数中最高的一项。旧规范只允许简单选择器，现在可以传复合选择器与列表。需要排除多个状态时，不必再写多段 `:not()` 链。

## :nth-child(An+B of S)

`:nth-child()` 可以用 `of S` 限定计数范围，只统计匹配 S 的兄弟元素：

```css
li:nth-child(2n of .is-visible) {
  background: #f6f8fa;
}

li:nth-child(3n + 1 of :not([hidden])) {
  border-top: 1px solid #d0d7de;
}
```

第一条给第 2、4、6… 个可见项加背景，隐藏项不占计数。第二条每隔三个未隐藏项加分隔边框。`:nth-last-child()` 支持同样的语法，从末尾计数。

## 关系选择器

关系选择器描述元素之间的结构关系：

- `A B`: 后代，任意深度；
- `A > B`: 直接子元素；
- `A + B`: 紧邻的后一个兄弟；
- `A ~ B`: 后面任意兄弟。

```css
.form > .field + .field { margin-top: 12px; }
```

这条规则只给直接子级中相邻的字段加间距，不会影响嵌套字段。关系选择器与 `:has()` 组合时，可以表达「某状态出现后影响后续元素」，例如 `.field:has(input:invalid) + .hint`。

## 表单校验示例

```html
<form class="form">
  <label class="field">
    <span>邮箱</span>
    <input type="email" required placeholder="you@example.com">
  </label>
</form>
```

```css
.field {
  display: grid;
  gap: 4px;
}

.field:has(input:invalid:not(:placeholder-shown)) {
  color: #b42318;
}

.field:has(input:invalid:not(:placeholder-shown)) input {
  border-color: #b42318;
}

.field:has(input:valid:not(:placeholder-shown)) input {
  border-color: #1a7f37;
}
```

预期结果：输入框为空时虽然有 `required`，但 `:placeholder-shown` 为真，不显示错误；输入内容后格式不合法，标签与边框变红；格式合法后边框变绿。`:placeholder-shown` 需要 `placeholder` 属性存在；没有占位文本时改用 `:user-invalid`，它只在用户交互后生效。

## 渐进增强与常见误用

- 旧浏览器不认识 `:has()`，含它的整条规则被丢弃，其余规则不受影响；把增强样式写在基础样式之后；
- 用 `:is()` 合并选择器会抬高权重，想保持低权重时用 `:where()`;
- `:not()` 与 `:is()` 的权重取最高参数，长列表不会累加；
- `:has()` 参数保持简单，避免在大列表上做全量子树检查；
- `:nth-child(... of S)` 的 `S` 不能省略，只写 `An+B` 时按全部兄弟计数。

## 小结

- `:is()` 合并选择器，权重取参数最高项；
- `:where()` 权重恒为零，适合基础样式与重置；
- `:has()` 按后代或兄弟状态匹配父元素，参数要收窄；
- `:not()` 支持列表，权重规则与 `:is()` 相同；
- `:nth-child(An+B of S)` 只统计匹配 S 的兄弟；
- 新选择器按渐进增强使用，旧浏览器丢弃整条规则而不影响其他样式。
