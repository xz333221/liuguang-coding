---
title: 表格与表单
summary: 'table 用 caption、thead、tbody、tfoot 组织行列，th 的 scope 标明表头；form 用 action 与 method 提交，name 决定提交的键，label 的 for 关联 input 的 id，约束属性在提交前校验。'
category: frontend
node: frontend-html-table-form
order: 7
level: 入门
tags: [HTML, 表格, 表单, label, 约束校验]
updated: 2026-11-19
mindmap: html-table-form.mindmap.json
terms: []
sources:
  - title: MDN · HTML 表单指南
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Forms
    note: 表单结构、控件与校验的完整教程。
  - title: MDN · table 元素
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/table
    note: 表格分组元素与表头关联的说明。
  - title: WHATWG HTML 标准 · 表单
    url: https://html.spec.whatwg.org/multipage/forms.html
    note: 表单提交与约束校验的规范定义。
---

标题、段落、列表、链接与图片覆盖了大部分静态内容，但页面还要展示行列数据和收集用户输入。这一篇讲两类专用元素：表格与表单。

## 表格：行、列与表头

表格由 `table` 包住，内部按行组织：`tr` 是一行，`td` 是一个数据单元格，`th` 是表头单元格。

`caption` 给表格一个标题；`thead`、`tbody`、`tfoot` 把行分成三组，分别表示表头、主体与汇总；`th` 的 `scope` 声明这个表头作用于列(`col`)还是行(`row`)。

```html
<table>
  <caption>2026 年第一季度销量</caption>
  <thead>
    <tr>
      <th scope="col">产品</th>
      <th scope="col">一月</th>
      <th scope="col">二月</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">A 型</th>
      <td>120</td>
      <td>135</td>
    </tr>
    <tr>
      <th scope="row">B 型</th>
      <td>98</td>
      <td>110</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">合计</th>
      <td>218</td>
      <td>245</td>
    </tr>
  </tfoot>
</table>
```

预期：浏览器把表头加粗显示，屏幕阅读器读到 135 时会同时读出「A 型，二月」，因为 `th` 的 `scope` 建立了关联。

表格只用于二维数据，不用来排版；合并单元格用 `colspan` 与 `rowspan`，合并会破坏表头与单元格的对应关系，能不用就不用。

## 表单与提交

`form` 把一组控件组织成一次提交。`action` 是提交地址，`method` 是 HTTP 方法，默认 `get`。

`get` 把数据编码进 URL 的查询串，适合搜索、筛选这类无副作用操作；`post` 把数据放在请求体，适合创建、修改或包含敏感信息的提交。

每个需要提交的控件必须有 `name`,`name` 是提交时的键；没有 `name` 的控件不会出现在提交数据中。

```html
<form action="/subscribe" method="post">
  <label for="email">邮箱</label>
  <input id="email" name="email" type="email" required>
  <button type="submit">订阅</button>
</form>
```

点击「订阅」，浏览器向 `/subscribe` 发 POST 请求，请求体包含 `email=...`。没有 `name` 的 `input` 即使有值也不会提交；`disabled` 的控件同样不提交。

## label 与 input 的关联

`label` 的 `for` 指向 `input` 的 `id`，两者建立关联：点击文字会聚焦输入框，屏幕阅读器朗读输入框时会带上这段文字。`id` 在文档中必须唯一。

也可以把 `input` 包在 `label` 内部，省略 `for` 与 `id`，但显式关联更清晰。

## 常用 input 类型

`type` 决定控件的形态、键盘与校验规则：

| type | 用途 | 说明 |
| --- | --- | --- |
| text | 单行文本 | 默认类型 |
| email | 邮箱 | 提交时检查基本格式 |
| password | 密码 | 输入内容显示为圆点 |
| number | 数字 | 配合 min / max / step |
| checkbox | 多选 | 同组可同时选中 |
| radio | 单选 | 同 name 的一组互斥 |
| file | 文件 | 表单需要 enctype="multipart/form-data" |
| date | 日期 | 浏览器提供日期选择器 |

`checkbox` 与 `radio` 用 `value` 表示选中时提交的值；`radio` 依靠相同的 `name` 形成一组，一组内只能选一个，默认选中用 `checked`。

## select、textarea 与 button

`select` 是下拉列表，`option` 的 `value` 是提交值，没有 `value` 时提交 `option` 的文本；`multiple` 允许按住 Ctrl 多选，`size` 控制可见行数。`textarea` 是多行文本，`rows` 与 `cols` 只给初始尺寸，实际大小由 CSS 决定。

```html
<label for="city">城市</label>
<select id="city" name="city">
  <option value="">请选择</option>
  <option value="sh">上海</option>
  <option value="bj">北京</option>
</select>

<label for="note">备注</label>
<textarea id="note" name="note" rows="4" cols="40"></textarea>

<button type="button">清空</button>
```

`button` 在 `form` 内默认 `type` 是 `submit`，点击就会提交。只执行脚本、不提交的按钮要显式写 `type="button"`。

## 约束校验

HTML 提供一组声明式校验属性，浏览器在提交前检查，不通过就阻止提交并显示提示：

- `required`:值不能为空；
- `pattern`:用正则约束文本格式，整个值必须匹配；
- `min` 与 `max`、`step`:约束数字与日期的范围与步长；
- `minlength` 与 `maxlength`:约束文本长度；
- `type="email"`、`type="url"` 等类型自带格式检查。

```html
<form action="/register" method="post">
  <label for="account">账号</label>
  <input id="account" name="account" type="text"
         required minlength="3" maxlength="16" pattern="[A-Za-z0-9_]+">

  <label for="age">年龄</label>
  <input id="age" name="age" type="number" min="18" max="120">

  <label for="birthday">生日</label>
  <input id="birthday" name="birthday" type="date">

  <button type="submit">注册</button>
</form>
```

预期：账号为空、少于 3 个字符或包含非法字符时，浏览器阻止提交并在控件旁显示提示；年龄超出 18 到 120 时同样被阻止。`novalidate` 可以关闭浏览器校验，`:invalid` 伪类可以给非法控件设置样式。

浏览器校验只改善交互，不能替代服务端校验：请求可以绕过页面直接发出，服务端必须重新检查。

## 小结

- 表格用 `caption` 命名，`thead`、`tbody`、`tfoot` 分组，`th` 的 `scope` 标明表头关联的行或列；
- `form` 的 `action` 决定提交地址，`method` 决定 `get` 或 `post`;
- 控件要有 `name` 才会提交；`label` 的 `for` 关联 `input` 的 `id`;
- `input` 的 `type` 决定形态与校验，`checkbox` 与 `radio` 用 `value` 提交选中值；
- `button` 在表单内默认提交，纯脚本按钮写 `type="button"`;
- `required`、`pattern`、`min` 与 `max` 提供提交前校验，服务端仍须复核。
