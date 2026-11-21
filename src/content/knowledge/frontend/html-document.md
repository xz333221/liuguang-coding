---
title: 文档结构：doctype、head 与 body
summary: '一个 HTML 文档由 doctype、html、head 与 body 组成：doctype 让浏览器进入标准模式，head 声明元信息与外部资源，body 承载可见内容。'
category: frontend
node: frontend-html-document
order: 5
level: 入门
tags: [HTML, doctype, head, body, 标准模式]
updated: 2026-11-19
mindmap: html-document.mindmap.json
terms: []
sources:
  - title: MDN · HTML:超文本标记语言
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML
    note: HTML 文档结构与元素分类的总览。
  - title: WHATWG HTML 标准
    url: https://html.spec.whatwg.org/
    note: doctype 与标准模式、怪异模式的规范定义。
  - title: web.dev · Learn HTML
    url: https://web.dev/learn/html
    note: 文档骨架与 head 中元信息的讲解。
---

上一篇把 20 章的阅读顺序排好了，从这一篇起进入第 2 章。先看 HTML 文档的骨架：一个完整的文档由哪些部分组成，浏览器怎样按这些部分解析。

## 从 doctype 开始

每个 HTML 文档的第一行是 `<!doctype html>`。它不显示在页面中，作用是在解析开始时告诉浏览器使用**标准模式**(standards mode)。

浏览器有两种解析模式：

- 标准模式：按当前规范解析和布局；
- 怪异模式(quirks mode):模拟 1990 年代浏览器的行为，盒模型、行高等计算方式与规范不同。

省略 doctype，或者写成旧式的长串声明，浏览器可能进入怪异模式，页面宽度和盒模型的计算随之改变。`<!doctype html>` 是 HTML5 规定的写法，大小写不敏感，`<!DOCTYPE html>` 等价。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>第一个页面</title>
  </head>
  <body>
    <h1>你好,HTML</h1>
  </body>
</html>
```

## html、head 与 body

一个文档由三个部分组成：

- `html`:根元素，包住整个文档。`lang="zh-CN"` 声明内容语言，影响屏幕阅读器的发音、浏览器的翻译提示和拼写检查；
- `head`:元信息容器，内容不在页面中显示。标题、编码、视口、样式表和脚本的引用都放在这里；
- `body`:可见内容，页面上看到的文字、图片、按钮都在其中。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品列表</title>
    <link rel="stylesheet" href="/styles/main.css">
    <script src="/scripts/app.js" defer></script>
  </head>
  <body>
    <h1>商品列表</h1>
    <p>共 12 件商品。</p>
  </body>
</html>
```

浏览器打开这个文件，标签页显示「商品列表」，页面中显示标题和一行文字。`head` 里的声明分别负责编码、移动端视口、标题和外部资源，后文会逐一展开。

## head 里的常见声明

`head` 里可以出现很多元素，常用的有五类：

1. `title`:文档标题。显示在浏览器标签页、书签和历史记录中，也是搜索结果的第一行；
2. `meta charset`:声明字符编码。`utf-8` 覆盖绝大多数场景，必须尽量靠前；
3. `meta name="viewport"`:移动端视口设置，决定布局宽度与初始缩放；
4. `link`:引用外部资源，最常见的是样式表 `rel="stylesheet"`;
5. `script`:引入或内联 JavaScript。

`title` 是 `head` 中唯一必需的元素，每个页面都应当有，且应当描述当前页面的内容，不必概括整个站点。

## 标签、属性与布尔属性

HTML 由标签(tag)组成。一个元素(element)通常写成 `<名称 属性="值">内容</名称>`:

- 开始标签与结束标签之间的部分叫内容；
- 属性写在开始标签里，形式是 `名称="值"`;
- 属性名大小写不敏感，习惯用小写；属性值用双引号包裹。

有一类属性叫布尔属性(boolean attribute)，只靠「出现」表达真，不需要赋值：

```html
<input type="checkbox" checked>
<input type="text" required>
<button disabled>提交</button>
```

`checked`、`required`、`disabled` 只要写出来就生效。写成 `required="false"` 仍然是「出现」，元素依旧被约束；要取消就整个去掉。

## 嵌套与闭合

元素可以嵌套，但开始与结束必须正确配对：

```html
<!-- 正确 -->
<p>这段<strong>文字</strong>有强调。</p>

<!-- 错误:开始与结束交叉 -->
<p>这段<strong>文字</p></strong>
```

浏览器容错能力很强，遇到错误嵌套会按解析算法修正，但修正结果不一定符合预期。养成逐个检查闭合的习惯，比依赖浏览器纠正可靠。

有些元素没有内容，称为空元素(void element)，只写开始标签，不写结束标签：

```text
img  br  hr  input  meta  link  source  track  wbr
```

注释用 `<!--` 与 `-->` 包裹：

```html
<!-- 导航从这里开始,不能嵌套注释 -->
<nav>...</nav>
```

注释不能嵌套，内部的 `-->` 会提前结束注释。

## 一个完整骨架

把上面的部分组合起来，得到一个可以直接使用的起点：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>页面标题</title>
    <meta name="description" content="一句话描述这个页面。">
    <link rel="stylesheet" href="./styles/main.css">
    <script src="./scripts/app.js" defer></script>
  </head>
  <body>
    <header>
      <h1>页面标题</h1>
    </header>
    <main>
      <p>正文内容。</p>
    </main>
  </body>
</html>
```

保存为 `index.html`，用浏览器打开：标签页显示「页面标题」，页面中显示标题与正文。样式表与脚本文件不存在时，浏览器会在控制台报 404,HTML 本身仍能正常显示。

## 小结

- `<!doctype html>` 是解析指令，让浏览器进入标准模式，避免怪异模式的布局差异；
- 文档由 `html`、`head`、`body` 三部分组成，`head` 管元信息，`body` 管可见内容；
- `head` 常用 `title`、`meta charset`、`meta viewport`、`link` 与 `script`;
- 属性写成 `名称="值"`；布尔属性出现即为真，`required="false"` 不能取消约束；
- 嵌套必须正确闭合；`img`、`br`、`input`、`meta`、`link` 是空元素。
