---
title: 开发环境：编辑器、浏览器与 DevTools
summary: '写前端只需要一个编辑器和一款浏览器。本文说明 VS Code 的必要插件、DevTools 五个面板各看什么、如何用 npx serve 或 Live Server 启动本地静态服务器，以及为什么不要用 file:// 打开带模块或 fetch 的页面。'
category: frontend
node: frontend-intro-env
order: 2
level: 入门
tags: [VS Code, DevTools, 本地服务器, UTF-8]
updated: 2026-11-19
mindmap: intro-env.mindmap.json
terms: []
sources:
  - title: MDN 学习区 · Web 开发入门
    url: https://developer.mozilla.org/zh-CN/docs/Learn_web_development
    note: 编辑器、浏览器与开发工具的入门说明。
  - title: Chrome DevTools · Overview
    url: https://developer.chrome.com/docs/devtools/overview
    note: Elements、Console、Network、Sources、Application 五个面板的官方定位。
  - title: MDN · JavaScript 模块
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules
    note: ES 模块在 file:// 下因来源为 null 而被浏览器拦截的说明。
---

上一篇从输入 URL 讲到页面渲染，整个过程都发生在浏览器里。这一篇准备动手所需的工具：一个编辑器、一款浏览器，以及一个本地静态服务器。三者装好，后面每一章的示例都能直接运行。

## 编辑器：VS Code 与必要插件

前端代码就是文本文件，任何编辑器都能写。VS Code 免费、跨平台，内置 HTML/CSS/JavaScript 的语法高亮与 Emmet 补全，适合作为默认选择。装上之后建议再补几个插件：

- Live Server:启动一个本地静态服务器，保存文件后自动刷新页面；
- Prettier:统一缩进、引号与换行，保存时自动格式化；
- ESLint:在编辑阶段提示 JavaScript 的语法与常见逻辑问题；
- Chinese (Simplified) Language Pack:可选，把界面菜单换成中文。

设置里把「Format On Save」打开，再把默认编码确认为 UTF-8。HTML 文件头部写 `<meta charset="UTF-8">`，两处一致，中文才不会变成乱码。

编辑器只是写文件的工具，它不负责运行页面。页面的运行环境是浏览器，编辑器与浏览器之间靠保存与刷新衔接：改文件、保存、刷新，看到新的结果。

## DevTools 的五个面板

浏览器自带开发者工具(DevTools)，按 F12 或在页面上右键选择「检查」打开。日常使用集中在五个面板：

| 面板 | 看什么 |
| --- | --- |
| Elements | 当前页面的 DOM 树与每个节点的 CSS 规则，可以临时改标签、改样式 |
| Console | 脚本输出的日志与报错，可以直接输入 JavaScript 表达式求值 |
| Network | 每个请求的地址、状态码、耗时、请求头与响应内容 |
| Sources | 页面加载的脚本与样式文件，可以打断点逐行调试 |
| Application | Cookie、localStorage、sessionStorage、Cache Storage 等存储与缓存 |

分开记它们的用途：结构与样式看 Elements，报错与输出看 Console，请求失败与加载慢看 Network，断点调试看 Sources，数据存到了哪里看 Application。

Elements 面板左上角还有设备切换按钮，可以按手机尺寸预览页面，并模拟触摸与网络速度。改响应式布局时先在这里确认断点，再回到编辑器写媒体查询。

改 Elements 里的样式只影响当前页面，刷新就恢复；要保留修改，回到编辑器改源文件。这是排查样式问题最快的办法：先在 Elements 里试出正确的规则，再写回代码。

## 起一个本地静态服务器

直接双击 HTML 文件也能显示，但更推荐通过本地服务器访问。最直接的方式是用 Node.js 自带的 npx:

```bash
npx serve .
```

首次运行会下载 serve 包，随后输出一个地址，通常是 `http://localhost:3000`。在浏览器里打开这个地址，目录中的 `index.html` 会被作为首页返回。serve 会在文件变化时自动重新请求，不需要手动重启；端口被占用时它会改用下一个可用端口，以终端输出的地址为准。

如果装了 VS Code 的 Live Server，右键 HTML 文件选择「Open with Live Server」也可以。它会在保存时自动刷新，适合改样式时反复查看。

无论用哪种方式，关键是页面通过 `http://localhost` 访问，协议为 `http`。地址栏的协议决定了浏览器以什么规则对待这个页面。

## 编码、保存与刷新

三个习惯能减少大量无意义的排查：

- 文件统一保存为 UTF-8。Windows 上部分旧编辑器默认使用 GBK，中文字符会在浏览器里显示为乱码；
- HTML 的 `<head>` 里写 `<meta charset="UTF-8">`，让浏览器按 UTF-8 解析文档；
- 改完文件先保存，再刷新。编辑器里的修改不会自动写进磁盘，浏览器读的始终是磁盘上的文件。

普通刷新可能命中缓存。样式或脚本改了却没有变化时，用硬刷新绕过缓存：Windows 上是 `Ctrl + Shift + R`,macOS 上是 `Cmd + Shift + R`。也可以在 DevTools 的 Network 面板勾选「Disable cache」，保持开发者工具打开时始终重新请求。

## 为什么不要用 file:// 打开

普通 HTML 用 `file://` 打开没有明显问题，一旦页面使用 ES 模块或 `fetch`，就会失败。

`file://` 下的页面没有正常的来源(origin 为 `null`)，浏览器对模块脚本执行同源检查。用 `<script type="module">` 引入本地文件时，控制台会报类似这样的错误：

```text
Access to script at 'file:///.../main.js' from origin 'null'
has been blocked by CORS policy
```

`fetch` 读取本地文件也会被拦截。原因是浏览器把本地文件视为不可信来源，不允许脚本随意读取磁盘。通过 `http://localhost` 访问时，页面有明确的来源，模块与请求都按正常规则工作。

所以从这一篇开始，养成用本地服务器打开页面的习惯。它与真实部署环境的差异更小，也能避免一类只在 `file://` 下出现的假故障。

## 三个常见现象

调试时先定位问题在哪一层，再看对应面板：

- 页面空白：先看 Console 是否报错，再看 Network 里 HTML 是否返回 200;
- 样式不生效：在 Elements 里看规则是否被划掉，划掉说明被更高优先级的规则覆盖；
- 资源 404:在 Network 里按状态码筛选，核对请求路径的大小写与目录层级。

## 小结

- 编辑器负责写文件，浏览器负责运行页面，保存与刷新把两者连接；
- VS Code 装 Live Server、Prettier、ESLint 即可，编码统一为 UTF-8;
- DevTools 五个面板：Elements 看结构与样式，Console 看日志与报错，Network 看请求，Sources 调试脚本，Application 看存储；
- 用 `npx serve .` 或 Live Server 起本地服务器，通过 `http://localhost` 访问；
- `file://` 的来源为 null，模块与 fetch 会被拦截，不要用它调试这类页面。
