---
title: DOM 树与节点操作
summary: 'DOM 是浏览器把文档解析成的节点树，Document、Element、Text 都继承自 Node。节点操作围绕查询、创建、插入、删除与替换展开；读写内容要区分 textContent 与 innerHTML，属性要区分 attribute 与 property，批量插入用 DocumentFragment。'
category: frontend
node: frontend-dom-tree
order: 42
level: 入门
tags: [DOM, 节点, querySelector, DocumentFragment]
updated: 2026-11-19
mindmap: dom-tree.mindmap.json
terms: [reference]
sources:
  - title: MDN · Document Object Model (DOM)
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model
    note: 节点类型、树结构与常用接口的总览。
  - title: MDN · Document.querySelectorAll()
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelectorAll
    note: 静态 NodeList 的返回行为与选择器语法。
  - title: WHATWG DOM 标准
    url: https://dom.spec.whatwg.org/
    note: 节点接口、树修改算法的规范定义。
---

上一篇的迭代器与异步迭代处理的是脚本内部的数据流；页面本身由另一套对象描述，脚本通过这套对象读取和修改页面。这套对象就是 DOM。

## DOM 是节点树

DOM(Document Object Model，文档对象模型)是浏览器解析 HTML 后得到的一棵树：每个标签对应一个元素节点，每段文本对应一个文本节点，注释对应注释节点，整棵树挂在 document 上。

```html
<body>
  <h1>待办</h1>
  <ul id="list">
    <li>写文档</li>
  </ul>
</body>
```

对应的树是 document → html → body →(h1、ul → li)。`ul` 是 `body` 的子节点，`li` 是 `ul` 的子节点，`h1` 与 `ul` 互为兄弟节点。树上的位置决定了页面结构与 CSS 选择器的匹配范围，修改节点等于修改页面。

## Document、Node 与 Element

这三个类型是继承关系，理解它们的从属关系能避免调用不存在的方法：

- `Node`:所有节点的基类，提供 `parentNode`、`childNodes`、`appendChild`、`removeChild` 一类通用能力；
- `Document`:整棵树的入口，继承 `Node`，额外提供 `getElementById`、`querySelector`、`createElement`;
- `Element`:标签对应的节点，继承 `Node`，额外提供 `classList`、`innerHTML`、`getAttribute`。

文本节点是 `Text`，继承 `Node` 但不是 `Element`，所以没有 `classList`。`childNodes` 包含文本与注释节点，`children` 只包含元素节点，日常遍历大多用后者。

```js
const body = document.body;
console.log(body.childNodes.length);         // 依标签间的空白而定,可能包含换行文本节点
console.log(body.children.length);           // 2,只有 h1 与 ul
console.log(body.firstElementChild.tagName); // H1
```

## 选择元素

`getElementById` 按 id 查找单个元素，未命中返回 `null`。`querySelector` 接受任意 CSS 选择器，返回第一个匹配元素；`querySelectorAll` 返回全部匹配结果。选择器语法非法时，后两者抛出 `SyntaxError`。

```js
const list = document.getElementById('list');
const firstItem = list.querySelector('li');
const items = document.querySelectorAll('#list li');
console.log(items.length); // 1
```

`querySelectorAll` 返回静态 `NodeList`:取到之后 DOM 再变化，这个集合不会更新。`getElementsByClassName` 与 `element.children` 返回动态 `HTMLCollection`,DOM 一变集合跟着变。遍历时优先 `querySelectorAll` 配合 `for...of`，结果可预期。

## 创建、插入与删除

`document.createElement(tag)` 创建游离节点，此时它还不在文档中，插入之后才会上屏。

- `parent.append(node)` 与 `parent.prepend(node)`:插到子节点末尾或开头；
- `node.before(x)` 与 `node.after(x)`:插到该节点的兄弟位置；
- `node.remove()`:从父节点摘除；
- `node.replaceWith(x)`:用新节点替换自己。

```js
const list = document.getElementById('list');
const li = document.createElement('li');
li.textContent = '复习 DOM';
list.append(li);            // 追加到最后

const li2 = document.createElement('li');
li2.textContent = '交作业';
list.prepend(li2);          // 插到最前

li2.remove();               // 再移除
```

`list` 变量保存的是节点对象的引用，`remove()` 只把节点从树上取下，变量仍指向该对象。要让它进入垃圾回收，把引用一并置空。`append` 可以一次传入多个节点或字符串，`appendChild` 只接受一个节点并返回它；传入字符串时 `append` 会自动创建文本节点。

## 内容：textContent 与 innerHTML

`textContent` 读写纯文本，赋值时把字符串原样当文本；`innerHTML` 按 HTML 解析，赋值时标签会变成真实节点。

```js
const box = document.createElement('div');
box.textContent = '<b>加粗</b>';
console.log(box.innerHTML);   // &lt;b&gt;加粗&lt;/b&gt;,标签被转义

box.innerHTML = '<b>加粗</b>';
console.log(box.textContent); // 加粗,此时已是一个 b 元素
```

读 `innerHTML` 会把整段子树序列化成字符串，开销大于 `textContent`。写入 `innerHTML` 时，如果内容来自用户输入就有 XSS 风险：`<img src=x onerror=alert(1)>` 会被执行。只在内容由自己拼装且可信时使用 `innerHTML`，用户数据一律走 `textContent`。

## 属性与 property

`getAttribute('href')` 读 HTML 上的原始字符串，`el.href` 读解析后的绝对 URL，两者经常不同：

```html
<a id="home" href="/index.html" data-role="nav">首页</a>
```

```js
const a = document.getElementById('home');
console.log(a.getAttribute('href')); // /index.html
console.log(a.href);                 // https://example.com/index.html
console.log(a.dataset.role);         // nav
```

property 是 DOM 对象上的字段，attribute 是 HTML 源码里的字符串。`value`、`checked`、`selected` 这类状态只有 property 会随用户操作变化，attribute 保持初始值。自定义数据用 `data-*`:HTML 写 `data-user-id`,JS 读 `el.dataset.userId`，中划线自动转成驼峰。

`className` 是整串 class，赋值会覆盖原有值；`classList` 提供 `add`、`remove`、`toggle`、`contains`，按单个类名操作。

```js
const item = document.querySelector('#list li');
item.classList.add('done');
item.classList.toggle('done'); // 有则删,无则加
console.log(item.className);   // "",回到初始状态
```

## 批量插入与 DocumentFragment

每插入一次节点都可能触发样式计算与布局。在循环里逐个 `append` 到文档中的元素，代价随次数累积；先把节点放进 `DocumentFragment`，再一次性插入，只发生一次变更。

```js
const fragment = document.createDocumentFragment();
['买菜', '跑步', '读书'].forEach(text => {
  const li = document.createElement('li');
  li.textContent = text;
  fragment.append(li);
});
list.append(fragment); // 三个 li 一次进入文档
```

`DocumentFragment` 不在文档树中，插入时把子节点整体移入目标，自身不会成为节点，插入后自动清空。

## 完整的待办列表

```html
<ul id="todo"></ul>
<button id="add">添加</button>
<button id="clear">清空</button>
```

```js
const todo = document.getElementById('todo');
let seq = 0;

document.getElementById('add').addEventListener('click', () => {
  const li = document.createElement('li');
  li.textContent = `任务 ${++seq}`;
  li.dataset.id = seq;
  todo.append(li);
  console.log(todo.children.length); // 2,每点一次加一
});

document.getElementById('clear').addEventListener('click', () => {
  todo.replaceChildren(); // 不传参数即清空全部子节点
  seq = 0;
});
```

`replaceChildren()` 一次完成清空与插入，比循环 `remove` 简洁，也不会留下多余的文本节点。

## 小结

- DOM 是文档解析后的节点树，Document、Element、Text 都继承自 Node;
- `querySelectorAll` 返回静态集合，`getElementsByClassName` 与 `children` 返回动态集合；
- 创建用 `createElement`，插入用 `append`/`prepend`/`before`/`after`，删除用 `remove`，替换用 `replaceWith`;
- `textContent` 只处理文本，`innerHTML` 解析标签，用户输入一律用前者；
- attribute 是 HTML 字符串，property 是对象字段，状态类属性以 property 为准；
- 批量插入先放进 `DocumentFragment`，再一次性挂到文档上。
