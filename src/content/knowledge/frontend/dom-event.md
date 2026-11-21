---
title: 事件模型：捕获、冒泡与事件委托
summary: '事件从 window 沿祖先链捕获到目标，再从目标冒泡回 window,addEventListener 的第三个参数决定监听器在哪一阶段执行。事件委托利用冒泡在祖先上统一处理子元素事件，配合 closest 定位来源；stopPropagation 阻止传播，preventDefault 取消默认行为。'
category: frontend
node: frontend-dom-event
order: 43
level: 入门
tags: [DOM, 事件流, 冒泡, 事件委托]
updated: 2026-11-19
mindmap: dom-event.mindmap.json
terms: []
sources:
  - title: MDN · 事件介绍
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events
    note: 事件监听、事件对象与冒泡的入门说明。
  - title: MDN · EventTarget.addEventListener()
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener
    note: 第三个参数 capture、once、passive、signal 的含义。
  - title: DOM 标准 · 事件
    url: https://dom.spec.whatwg.org/#events
    note: 事件传播路径与默认行为的规范定义。
---

上一篇把页面拆成了节点，节点能增删改查，但用户的点击、输入、滚动还没有接上处理逻辑。这类由用户或浏览器发起、带类型与数据的通知叫事件，这一篇讲事件如何传播、如何在正确的节点上处理。

## 事件流的三个阶段

一个事件被触发后，传播路径固定为三段：

1. **捕获阶段**:从 `window` 向下，经过 `document`、`html`、`body`，逐层到达目标元素的父节点；
2. **目标阶段**:到达事件真正发生的元素，即 `event.target`;
3. **冒泡阶段**:从目标元素向上，逐层回到 `window`。

绝大多数事件都会冒泡，`focus`、`blur`、`mouseenter`、`mouseleave` 例外。只有冒泡阶段能让祖先知道子元素上发生了什么，事件委托就建立在这个性质上。

## 注册监听与 capture 参数

`addEventListener(type, listener, options)` 注册监听器。第三个参数常写成布尔值，等价于 `options.capture`:

```js
const outer = document.getElementById('outer');
const inner = document.getElementById('inner');

outer.addEventListener('click', () => console.log('outer 捕获'), true);
inner.addEventListener('click', () => console.log('inner 目标'));
outer.addEventListener('click', () => console.log('outer 冒泡'));

// 点击 inner 的输出顺序:
// outer 捕获
// inner 目标
// outer 冒泡
```

`true` 让监听器在捕获阶段执行，省略或写 `false` 则在冒泡阶段执行。同一个元素上，捕获监听器先于冒泡监听器触发，与注册顺序无关。

`options` 还有三个常用字段：

- `once: true`:监听器执行一次后自动移除；
- `passive: true`:承诺监听器不会调用 `preventDefault`，浏览器因此不必等待它执行完再滚动；
- `signal`:传入 `AbortSignal`，调用 `abort()` 时监听器自动移除，复用第 7 章的取消机制。

## target 与 currentTarget

事件对象上两个属性容易混淆：

- `event.target`:事件最初发生的元素，不随传播改变；
- `event.currentTarget`:当前正在执行监听器的元素，等于 `this`。

给 `ul` 注册监听器、点击内部 `li` 时，`target` 是 `li`,`currentTarget` 是 `ul`。停止传播后，`target` 也不会变。

## 阻止传播与取消默认行为

两个方法名字接近，作用完全不同：

- `event.stopPropagation()`:阻止事件继续沿捕获或冒泡路径传播，祖先上的监听器不再执行；
- `event.preventDefault()`:阻止浏览器对该事件的默认动作，例如链接跳转、表单提交、复选框切换。

```js
const link = document.querySelector('a.read-more');
link.addEventListener('click', (event) => {
  event.preventDefault();  // 不再跳转
  console.log('改为打开弹层');
});
```

`preventDefault` 不会影响传播，祖先监听器照样收到事件。`stopImmediatePropagation()` 在阻止传播之外，还会跳过同一元素上剩余的监听器。只在确有需要时调用，随意阻止冒泡会让上层的统计、菜单收起等逻辑失效。

## 事件委托

假设列表有一千项，给每项单独注册监听器要一千个函数，新增项还得补注册。事件委托把监听器挂在共同祖先上，利用冒泡统一处理：

```html
<ul id="menu">
  <li data-id="1">首页</li>
  <li data-id="2">文档</li>
  <li data-id="3">关于</li>
</ul>
```

```js
const menu = document.getElementById('menu');

menu.addEventListener('click', (event) => {
  const li = event.target.closest('li');
  if (!li || !menu.contains(li)) return;
  console.log(li.dataset.id, li.textContent); // 点击「文档」输出:2 文档
});
```

`closest(selector)` 沿 `target` 向上查找第一个匹配的元素，找不到返回 `null`。它解决了「点击落在 `li` 内部的 `span` 上」的问题，不需要手动循环 `parentNode`。`menu.contains(li)` 防御的是 `li` 嵌套在菜单之外的情况。

委托的代价是逻辑集中在一处，事件来源要靠 `closest` 和 `dataset` 判断；收益是监听器数量与列表长度解耦，后续插入的节点自动生效。

## 常用事件

| 事件 | 触发时机 | 典型用途 |
| --- | --- | --- |
| click | 指针点击或键盘激活 | 按钮、链接、委托 |
| input | 输入值每次变化 | 实时校验、搜索建议 |
| submit | 表单提交 | 拦截提交、改为异步发送 |
| keydown | 按键按下 | 快捷键、Esc 关闭 |
| scroll | 滚动位置变化 | 回到顶部、吸顶 |

```js
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    console.log('关闭弹层');
  }
});
```

监听 `window` 上的 `scroll` 与触摸系列事件时，`{ passive: true }` 能避免浏览器等待监听器而拖慢滚动。列表页常见的写法是：

```js
window.addEventListener('scroll', onScroll, { passive: true });
```

## 移除监听

`removeEventListener` 要求传入同一个函数引用和相同的 capture 标志，匿名函数无法移除：

```js
function onClick() {
  console.log('点击一次');
}

const btn = document.getElementById('once');
btn.addEventListener('click', onClick);
btn.removeEventListener('click', onClick); // 已移除,不再输出
```

只需要执行一次时用 `{ once: true }`，比手动移除更清楚。配合 `AbortController` 可以一次移除一组监听器，适合弹层这类成组创建、成组销毁的组件。

## 小结

- 事件按捕获、目标、冒泡三段传播，多数事件会冒泡；
- `addEventListener` 第三个参数的 `capture` 决定在哪个阶段执行，`once`、`passive`、`signal` 控制生命周期与性能；
- `target` 是事件来源，`currentTarget` 是当前执行监听器的元素；
- `stopPropagation` 阻止传播，`preventDefault` 取消默认动作，两者互不影响；
- 事件委托在祖先上统一处理，用 `closest` 定位来源元素，适合长列表与动态节点；
- 移除监听要传同一个函数引用，一次性监听用 `once`。
