---
title: 表单、约束校验与 FormData
summary: '表单控件靠 name 组成键值对，form.elements 是访问入口；提交前浏览器按 required、pattern 先校验一遍。checkValidity 只返回结果，reportValidity 才弹提示；FormData 只收集可提交控件，禁用、无 name、未勾选的不参与。'
category: frontend
node: frontend-dom-form
order: 44
level: 入门
tags: [DOM, 表单, 约束校验, FormData]
updated: 2026-11-19
mindmap: dom-form.mindmap.json
terms: []
sources:
  - title: MDN · 客户端表单校验
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms/Form_validation
    note: 约束属性与校验 API 的用法说明。
  - title: MDN · FormData
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/FormData
    note: 构造函数接收表单与提交按钮、append 与 set 的差别。
  - title: MDN · HTMLFormElement.elements
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLFormElement/elements
    note: 控件集合的成员范围与 RadioNodeList 行为。
---

上一篇用事件委托处理了点击，但表单这块没展开：控件怎么聚成一份数据、提交前怎么拦、错误提示由谁负责。这一篇把这三件事讲清楚。

## 控件怎么组成一份数据

表单里的控件是 `input`、`select`、`textarea`、`button`、`output`、`object` 这几种。控件能否被提交，只看两件事：有没有 `name`，以及是否处于可提交状态。

`form.elements` 是一个 `HTMLFormControlsCollection`，按 `name` 或下标取控件：

```html
<form id="signup">
  <input name="email" type="email" required>
  <input name="pwd" type="password" required>
  <button name="act" value="signup">注册</button>
</form>
```

```js
const form = document.getElementById('signup');
console.log(form.elements.length);            // 3
console.log(form.elements.email.type);        // email
console.log(form.elements[0].name);           // email
console.log(form.email === form.elements.email); // true,捷径写法
```

同名控件返回的不是单个元素，而是 `RadioNodeList`。一组同名 radio 用 `form.elements.size.value` 就能拿到选中项的值，没选中时是空字符串。

`form.email` 这种捷径和 `form.elements.email` 等价，但当 `name` 撞上表单自身的属性名就失效了。控件叫 `action`、`method`、`submit`、`reset` 时，`form.action` 拿到的是表单的动作 URL，不是那个控件。这类字段名一律走 `form.elements.action`。

## 约束属性

校验规则写在 HTML 上，不写 JS。浏览器认得这几类：

| 属性 | 作用 | 失败时对应的 validity 字段 |
| --- | --- | --- |
| `required` | 必须有值 | `valueMissing` |
| `type` | 按类型校验，如 `email`、`url`、`number` | `typeMismatch` |
| `pattern` | 正则匹配 | `patternMismatch` |
| `min` / `max` | 数值或日期区间 | `rangeUnderflow` / `rangeOverflow` |
| `minlength` / `maxlength` | 字符数 | `tooShort` / `tooLong` |
| `step` | 数值步长 | `stepMismatch` |

```html
<input name="code" pattern="[A-Z]{2}\d{4}" required>
<input name="age" type="number" min="18" max="60" step="1">
```

`pattern` 会被隐式加上 `^(?:...)$`，不用自己写首尾锚点。写 `pattern="\d{4}"` 在 HTML 里有效，但如果同一个正则写在 JS 字符串里，得写成 `'\\d{4}'`，少一层转义就变成 `d{4}`。

`type="number"` 的值仍然是字符串，`input.value` 返回 `"18"` 而不是 `18`。输入了无法解析的内容(比如 `1e`),`value` 是空字符串，此时 `validity.badInput` 为 `true`。

## 三种校验方法

三个方法名字像，用途完全不同：

- `form.checkValidity()` 或 `input.checkValidity()`:跑一遍校验，返回布尔值，失败时在控件上触发 `invalid` 事件，但**不弹提示**;
- `reportValidity()`:同样校验，失败时让浏览器显示原生气泡提示，并聚焦第一个错误控件；
- `setCustomValidity(msg)`:塞一条自定义错误信息，非空字符串即视为校验失败；传空字符串清除。

```js
const pwd = form.elements.pwd;
const confirm = form.elements.confirm;

confirm.addEventListener('input', () => {
  if (confirm.value !== pwd.value) {
    confirm.setCustomValidity('两次输入的密码不一致');
  } else {
    confirm.setCustomValidity(''); // 必须清空,否则永远无效
  }
});
```

`setCustomValidity` 设过非空字符串后，该控件会一直处于 `customError` 状态，哪怕后来输入正确了也不会自动恢复。忘记清空是这一块最常见的 bug，表现是「怎么改都提交不了，而且没有提示」。

控件的 `validity` 对象是所有规则的汇总，`validity.valid` 为 `true` 表示全部通过。`invalid` 事件不冒泡，所以想在 `form` 上统一处理错误样式，`addEventListener` 的第三个参数必须传 `true`,`false` 收不到任何一条。

## 接管提交

原生提交会让页面跳转，单页应用里一般要拦下来。两条路：

```js
// 方式一:保留原生校验,校验通过后才触发 submit
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form, event.submitter);
  console.log([...data.entries()]);
});

// 方式二:完全自己校验
form.noValidate = true;      // 等价于 <form novalidate>
```

`submit` 事件只在原生校验通过后才触发。也就是说，表单里有一个空的 `required` 输入框时，点提交根本进不了监听器，`preventDefault` 也没机会调用。要让自定义逻辑接管，加 `novalidate`，或者给提交按钮单独加 `formnovalidate`。

还有两个容易踩的 API:

- `form.requestSubmit()` 会走完整流程，包含校验与 `submit` 事件，等价于用户点按钮；
- `form.submit()` 直接提交，不校验、不触发 `submit` 事件。

在按钮的 `click` 里写 `form.submit()` 想触发自己的 `submit` 处理逻辑，结果处理函数一次都没跑，页面直接跳走了。

多按钮表单可以用 `event.submitter` 分辨是哪个按钮提交的，该属性就是被点击的按钮，键盘回车提交时为 `null`。

## FormData 的收集规则

`new FormData(form)` 不是把 DOM 里所有输入框抄一遍，它只收集「可提交」的控件。规则如下：

- 没有 `name` 的控件跳过；
- `disabled` 的控件跳过，连同它的值；
- 未勾选的 `checkbox`、未选中的 `radio` 跳过；
- `select multiple` 选了几项就出现几条同名记录；
- `file` 类型加入 `File` 对象，没选文件则加入一个空的 `File`;
- 提交按钮的值默认不包含，除非作为第二个参数传进去。

```js
const fd = new FormData(form);
fd.append('tags', 'vue');       // 追加,同名会变成多条
fd.append('tags', 'react');
fd.set('tags', 'svelte');       // 覆盖,只剩一条

console.log(fd.getAll('tags')); // ['svelte']
console.log(fd.get('email'));   // 字符串
console.log(fd.has('pwd'));     // true
```

`append` 与 `set` 的区别就在同名键：前者累加，后者替换。服务端若按数组解析，要连着 `append` 同名键；用 `set` 只会留下最后一个值。

`disabled` 的语义值得记牢：控件被禁用时，用户改不了它的值，所以它也不该出现在提交数据里。常见现象是「编辑页保存后某个字段被清空了」，原因就是那个 `input` 在只读态下被设了 `disabled`，数据没进 `FormData`。只读用 `readonly`，禁用才用 `disabled`。

遍历 `FormData` 用 `for...of`，每次拿到 `[key, value]` 数组。值不全是字符串，文件就是 `File`，直接把整个对象 `JSON.stringify` 会得到一堆空对象，要么过滤掉文件，要么走 `Object.fromEntries` 之后再单独处理。

## 一个完整的异步提交

页面里有一个 `<form id="signup" novalidate>`，内含 `email`、`pwd` 两个 `required` 输入框，加一个 `role="alert"` 的错误提示位：

```js
const form = document.getElementById('signup');
const error = document.getElementById('error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.textContent = '';

  if (!form.checkValidity()) {
    form.reportValidity();          // 交给浏览器弹第一条提示
    return;
  }

  const res = await fetch('/api/signup', {
    method: 'POST',
    body: new FormData(form),       // 不设 Content-Type
  });

  if (res.status === 409) {
    form.elements.email.setCustomValidity('这个邮箱已经注册过了');
    form.reportValidity();
    return;
  }
  location.href = '/welcome';
});
```

这里没写 `Content-Type`，原因在下一篇讲上传时会展开：浏览器要自己补 `boundary`，手动设置反而会让服务端解析失败。

## 小结

- 控件靠 `name` 进入提交数据，`form.elements` 是稳定的访问入口，`form.xxx` 会与表单自身属性冲突；
- 校验规则优先写在 HTML 上，`validity` 对象汇总所有失败原因；
- `checkValidity` 只返回结果，`reportValidity` 才显示提示，`setCustomValidity` 需要手动清空；
- `submit` 事件在原生校验通过后才触发，要接管就用 `novalidate`,`requestSubmit` 走校验而 `submit` 不走；
- `FormData` 只收集可提交控件，禁用、无 `name`、未勾选的一律跳过；
- 文件以 `File` 对象进入 `FormData`,`append` 累加同名键，`set` 覆盖。
