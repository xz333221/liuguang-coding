---
title: 第一个页面：结构、样式、行为三件套
summary: 'HTML 负责结构,CSS 负责样式,JavaScript 负责行为。本文用一个单文件示例把三部分放在一起:标题、按钮与点击计数,并说明脚本放在 body 末尾或加 defer 的原因。'
category: frontend
node: frontend-intro-first-page
order: 3
level: 入门
tags: [HTML, CSS, JavaScript, DOM, defer]
updated: 2026-11-19
mindmap: intro-first-page.mindmap.json
terms: ["runtime"]
sources:
  - title: MDN 学习区 · Web 开发入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development
    note: HTML、CSS、JavaScript 三者分工的入门说明。
  - title: MDN · HTML
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML
    note: 文档结构、元素与属性的参考。
  - title: javascript.info 中文
    url: https://zh.javascript.info/
    note: 脚本引入方式、事件监听与 DOM 操作的讲解。
---

上一篇把编辑器和本地服务器准备好了,现在写第一个能交互的页面。HTML、CSS、JavaScript 三件套在这一篇放进同一个文件,分别承担结构、样式和行为,并观察修改其中一处会带来什么变化。

## 三件套各管什么

一个页面可以拆成三个问题:

- 页面上有什么:标题、段落、按钮、输入框。这是结构,由 HTML 描述;
- 它们长什么样:位置、颜色、字号、间距。这是样式,由 CSS 描述;
- 用户操作后发生什么:点击后计数加一,输入后校验格式。这是行为,由 JavaScript 描述。

三者通过 DOM 连接。浏览器把 HTML 解析成 DOM 树,CSS 通过选择器选中树上的节点并施加样式,JavaScript 也通过 DOM API 找到同一批节点,读取内容、绑定事件、修改属性。结构是基础,样式和行为都建立在它上面。

## 一个完整页面

新建 `index.html`,写入下面的内容,用上一篇的本地服务器打开:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>点击计数</title>
  <style>
    body {
      margin: 40px;
      font-family: system-ui, sans-serif;
    }
    button {
      padding: 8px 16px;
      font-size: 16px;
      cursor: pointer;
    }
    #count {
      color: #2563eb;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <h1>点击计数</h1>
  <p>按钮被点击了 <span id="count">0</span> 次。</p>
  <button id="btn">点我</button>

  <script>
    const button = document.querySelector('#btn')
    const count = document.querySelector('#count')
    let n = 0

    button.addEventListener('click', () => {
      n += 1
      count.textContent = String(n)
    })
  </script>
</body>
</html>
```

从上到下读这个文件:

1. `<head>` 里是页面元信息与样式。`<meta charset="UTF-8">` 指定编码,`<title>` 决定标签页标题,`<style>` 里是 CSS 规则;
2. `<body>` 里是可见内容。`<h1>` 是标题,`<p>` 是段落,`<span id="count">` 是计数的位置,`<button>` 是按钮;
3. `<script>` 里是行为。它先找到按钮和计数节点,再监听按钮的点击,每次点击把计数加一并写回页面。

`#count` 在 CSS 和 JavaScript 里都出现了。CSS 用它选中节点设置颜色,JavaScript 用 `document.querySelector` 按同一个选择器取到节点。HTML 里的 `id` 是两边共同的锚点。

## 预期结果

打开页面后应当看到:

- 标签页标题为「点击计数」;
- 页面顶部是一行大标题「点击计数」;
- 正文显示「按钮被点击了 0 次。」,其中数字 0 是蓝色加粗;
- 下方有一个「点我」按钮。

点击按钮,数字从 0 变成 1,再点变成 2。刷新页面后回到 0,因为 `n` 是脚本里的局部状态,没有写入 localStorage 等存储。

如果页面空白或按钮没有反应,先打开 DevTools 的 Console 查看报错。常见原因是文件没有保存、路径写错,或者 `id` 拼写与脚本里的选择器不一致。

## 改一处,观察变化

理解三件套最快的方式是分别修改一层。

先改样式:把 `#count` 的 `color` 改成 `#dc2626`,保存并刷新,数字变为红色。HTML 结构与 JavaScript 都没有改动,只有 CSS 规则生效。

再改行为:把 `n += 1` 改成 `n += 2`,刷新后每次点击数字增加 2。结构与样式不变,变化来自脚本里的算式。

最后改结构:在 `<h1>` 前加一行 `<p>这是我的第一个页面。</p>`,保存刷新,页面上多出一段文字。样式会按已有规则继承,行为不受影响。三次修改说明三部分可以独立调整,前提是没有改动对方的锚点,例如 `id`。

## 脚本的位置与 defer

示例把 `<script>` 放在 `</body>` 前面,这是传统写法。原因是浏览器从上到下解析 HTML,脚本执行时,它前面的节点已经创建完成,`querySelector` 能找到按钮。如果把脚本放进 `<head>` 且不加任何属性,脚本会在按钮出现之前执行,`document.querySelector('#btn')` 返回 `null`,后续绑定事件就会报错。

两种常见修正:

- 放在 `</body>` 之前,保证 DOM 已经解析;
- 放在 `<head>` 里并加上 `defer`,让浏览器在文档解析完成后再执行脚本,且不阻塞解析。

```html
<script src="main.js" defer></script>
```

外部脚本使用 `type="module"` 时默认就是延迟执行,不需要再写 `defer`。模块脚本还有独立的作用域,不污染全局;这些细节第 10 章会展开。

## 小结

- HTML 描述结构,CSS 描述样式,JavaScript 描述行为,三者通过 DOM 关联;
- 单文件示例把三部分放在一起,`id` 是样式与脚本共同使用的锚点;
- 脚本放在 `</body>` 前或加 `defer`,确保执行时目标节点已经存在;
- 分别修改结构、样式与行为,可以验证三层各自的作用;
- 页面状态只存在于当前脚本的运行时中,刷新即重置。
