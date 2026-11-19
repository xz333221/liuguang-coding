---
title: 解析：DOM、CSSOM 与阻塞资源
summary: 'HTML 字节依次经过解码、词法分析与建树,形成 DOM;样式表形成 CSSOM。同步 script 会暂停解析,styleshseet 会阻塞渲染与后续脚本,defer、async 与 module 用不同顺序化解这段等待。'
category: frontend
node: frontend-browser-parse
order: 49
level: 深入
tags: [浏览器, DOM, CSSOM, 渲染阻塞]
updated: 2026-11-19
mindmap: browser-parse.mindmap.json
terms: []
sources:
  - title: WHATWG · HTML Standard
    url: https://html.spec.whatwg.org/
    note: 词法分析、建树与脚本执行时机的规范定义。
  - title: MDN · Web Performance
    url: https://developer.mozilla.org/zh-CN/docs/Web/Performance
    note: 关键渲染路径与阻塞资源的说明。
  - title: web.dev · Learn Performance
    url: https://web.dev/learn/performance
    note: 解析阶段与加载策略的整体视角。
---

上一篇停在浏览器收到 HTML 的那一刻;这段文本要先被拆成节点树,页面才能被计算和绘制。这一篇讲 DOM、CSSOM 的构建过程,以及哪些资源会让解析停下来。

## 从字节到 DOM 树

浏览器拿到的是字节流,形成 DOM 要经过五个阶段:

```text
字节流 → 字符 → 词法单元 token → 节点 node → DOM 树
```

1. **解码**:按 BOM、`Content-Type` 的 charset 或 `<meta charset>` 的声明,把字节解码成字符,常见编码是 UTF-8;
2. **词法分析**:tokenizer 按 HTML 的状态机规则切出起始标签、结束标签、属性、文本、注释;
3. **建树**:tree builder 把 token 交给对应的插入模式,创建节点并挂到树上;
4. **纠错**:HTML 允许标签不闭合、嵌套错误,解析器按规范补齐,例如表格内容会自动补出 `<tbody>`。

以一个片段为例:

```html
<p class="note">Hello <b>world</b></p>
```

解析结果是 `Document → html → body → p.note`,段落内依次是文本节点 `Hello ` 与元素 `b`,再往内是文本节点 `world`。标签只决定结构,文本内容原样保留空白。

## CSSOM 的构建

外链样式表与 `<style>` 都会解析成 CSSOM(CSS Object Model),它记录每条规则的选择器、声明与优先级。渲染前,浏览器把 CSSOM 与 DOM 结合,为每个元素计算层叠后的计算样式。

CSSOM 不能绕过:任何影响首屏的样式表都会阻塞渲染。原因是浏览器不愿先用默认样式画一遍再重画,那样会产生可见的闪烁。样式表本身不阻塞 HTML 解析,但会阻塞后续脚本执行,因为脚本可能读取计算样式。

## 渲染阻塞资源

两类资源最影响首屏:

- `<link rel="stylesheet">`:阻塞首次渲染,并阻塞其后脚本的执行;
- 同步 `<script>`:下载与执行期间暂停 HTML 解析,后面的内容与图片都要等。

```html
<head>
  <link rel="stylesheet" href="/app.css">
  <script src="/app.js"></script>
</head>
```

上面这段里,`app.css` 下载完成前不会渲染;`app.js` 下载完成后还要等样式表就绪才执行,执行完解析才继续。两个文件都在 `<head>`,首屏被推后两次。

图片、`<iframe>` 不阻塞解析,但会推迟 `load` 事件。

## defer、async 与 module

脚本的加载与执行时机由属性决定:

```text
类型              下载        执行时机                        执行顺序
普通 script       阻塞解析     下载完立即执行                  按文档顺序
defer             并行         解析完成后、DOMContentLoaded 前   按文档顺序
async             并行         下载完立即执行                  不保证
type="module"     并行         默认等同 defer                  按文档顺序
```

```html
<script src="/a.js"></script>
<script src="/b.js" defer></script>
<script src="/c.js" async></script>
<script type="module" src="/d.js"></script>
```

`defer` 的脚本在 DOM 完整后按出现顺序执行,适合依赖 DOM 或彼此有依赖的代码;`async` 适合统计、广告这类互不依赖且不操作 DOM 的脚本;`module` 默认延迟执行,且自带严格模式与独立作用域,还可以再叠加 `async` 改变时机。

## 预加载扫描器

主解析器被同步脚本阻塞时,浏览器会启动预加载扫描器(preload scanner),继续向后扫描原始字节,提前发现 `<img>`、`<link>`、`<script>` 的地址并开始下载。它只预加载,不执行,也不解析内联脚本生成的节点。

这解释了一个常见现象:把脚本放在 `<head>` 里,图片仍可能已经开始下载。预加载扫描器提高了并行度,但无法消除脚本对执行顺序与首屏的阻塞。

## DOMContentLoaded 与 load

两个事件对应不同的完成点:

```js
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded');
});

window.addEventListener('load', () => {
  console.log('load');
});
```

- `DOMContentLoaded`:HTML 解析完成,所有 `defer` 脚本执行完毕,不等待图片、子框架与 `async` 脚本;
- `load`:页面所有资源(图片、样式、脚本、字体等)加载完成。

预期输出顺序是先 `DOMContentLoaded` 后 `load`。需要尽早绑定事件与初始化 DOM 时用前者;依赖图片尺寸或全部资源时用后者。

## script 位置对照

同一个脚本放在三个位置,体验差别明显:

```html
<!-- A:同步脚本在 head,解析被阻塞 -->
<head><script src="/heavy.js"></script></head>

<!-- B:defer,下载与解析并行 -->
<head><script src="/heavy.js" defer></script></head>

<!-- C:放在 body 末尾 -->
<body>
  <main>...</main>
  <script src="/heavy.js"></script>
</body>
```

- A:HTML 解析暂停,直到下载并执行完毕,首屏最慢;
- B:解析继续,脚本在 DOM 就绪后执行,首屏不受下载影响;
- C:解析到末尾才开始下载,首屏较早,但脚本可用时间更晚。

现代做法是 B 配合 `module`,把依赖关系交给构建工具处理,不再依赖位置。

## 小结

- DOM 由字节经解码、词法分析、建树三个环节形成,解析器自带纠错;
- CSSOM 与 DOM 结合后得到计算样式,样式表阻塞渲染;
- 同步脚本暂停解析,并等待已声明的样式表;
- `defer` 保序、`async` 不保序、`module` 默认延迟且作用域独立;
- 预加载扫描器在解析阻塞时提前下载资源;
- `DOMContentLoaded` 等 DOM 与 defer 脚本,`load` 等全部资源。
