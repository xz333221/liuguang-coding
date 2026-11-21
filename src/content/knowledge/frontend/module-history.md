---
title: 模块化：IIFE、CommonJS 与 ESM
summary: '模块化解决变量与依赖的边界问题：IIFE 用函数作用域隔离全局变量，CommonJS 用 require 与 module.exports 同步加载，ESM 用 import 与 export 建立静态依赖图并支持顶层 await 和动态 import()；三种格式的加载规则不同，不应在同一份源码里混用。'
category: frontend
node: frontend-module-history
order: 54
level: 进阶
tags: [模块化, CommonJS, ESM, IIFE]
updated: 2026-11-19
mindmap: module-history.mindmap.json
terms: [namespace, binding]
sources:
  - title: MDN · JavaScript 模块
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules
    note: ESM 的 import / export、顶层 await 与浏览器加载方式的权威说明。
  - title: Node.js · CommonJS modules
    url: https://nodejs.org/api/modules.html
    note: require、module.exports、模块缓存与循环依赖的官方定义。
  - title: RequireJS · Why AMD
    url: https://requirejs.org/docs/whyamd.html
    note: AMD 面向浏览器异步加载的设计动机与 define 写法。
---

上一篇讨论的同源策略约束了页面之间的交互；把视角收回到单个页面，当脚本从几十行增长到几千行，多个文件之间同样需要边界，这就是模块化处理的问题。

## 全局脚本的问题

最早的组织方式是多个 script 标签按顺序加载，每个文件都往 window 上挂变量：

```html
<script src="utils.js"></script>
<script src="counter.js"></script>
<script src="main.js"></script>
```

三个文件共享同一个全局命名空间，函数名重复会静默覆盖前一个定义；文件顺序不能出错，依赖关系只写在注释里；任何一段代码都能读改其他文件的内部状态。

IIFE(立即调用函数表达式) 用一个函数作用域把内部变量包起来，只把需要的接口作为返回值暴露：

```js
// counter.js
var counter = (function () {
  var count = 0;
  function inc() { count += 1; return count; }
  return { inc: inc, value: function () { return count; } };
})();
```

```js
// main.js
console.log(counter.inc());   // 1
console.log(counter.inc());   // 2
console.log(typeof count);    // undefined,count 不在全局
```

count 留在函数作用域里，外部只能通过 counter.inc 修改。IIFE 解决了命名污染，没有解决依赖声明：谁依赖谁仍然依靠文件顺序与团队约定维护。

## CommonJS

Node.js 在 2009 年引入 CommonJS，每个文件是一个模块，拥有独立的 module、exports、require、__dirname 等变量：

```js
// math.js
const add = (a, b) => a + b;
const PI = 3.14159;

module.exports = { add, PI };
```

```js
// main.js
const { add, PI } = require('./math');
console.log(add(1, 2));        // 3
console.log(PI);               // 3.14159
```

两个要点：

- 同步加载：require 返回时，被加载模块的代码已经执行完毕。服务端从本地磁盘读取文件，同步开销可以接受；浏览器的模块需要网络下载，同步等待会阻塞页面。
- 缓存：同一个模块被多次 require，只有第一次执行模块代码，之后返回同一个 module.exports 对象。模块状态因此在引用者之间共享。

CommonJS 的导出按加载完成时的结果传递：模块执行结束时 module.exports 指向哪个对象，require 就返回哪个对象。之后再给 module.exports 整体重新赋值，已经获取旧对象的代码看不到变化。

## AMD

浏览器端曾经用 AMD 处理异步加载：define 声明模块，require 声明依赖，依赖下载完成后再执行回调，RequireJS 是代表实现。AMD 的写法比 ESM 冗长，如今主要出现在旧项目中，新代码不再采用。

## ESM

ES Module 是 JavaScript 语言标准的一部分，用 export 声明导出，用 import 声明依赖：

```js
// math.js
export const PI = 3.14159;
export function add(a, b) { return a + b; }
export default function multiply(a, b) { return a * b; }
```

```js
// main.js
import multiply, { add, PI } from './math.js';
console.log(add(2, 3));        // 5
console.log(multiply(2, 3));   // 6
console.log(PI);               // 3.14159
```

与 CommonJS 相比，差异集中在三点：

- 静态结构：import 只能出现在模块顶层，模块路径必须是字符串字面量。依赖关系在代码执行前就能确定，构建工具据此生成完整的依赖图。
- 实时绑定(live binding):import 得到的是导出变量的绑定，不是一次性拷贝。导出方改变变量的值，导入方读到新值。
- 顶层 await:模块顶层可以直接 await，依赖该模块的代码会等它完成后再执行。

```js
// config.js
const res = await fetch('/config.json');
export const config = await res.json();
```

动态 import() 是函数调用，返回 Promise，用于按需加载：

```js
button.addEventListener('click', async () => {
  const { openDialog } = await import('./dialog.js');
  openDialog();
});
```

动态 import() 的路径可以是变量表达式，打包工具会为它单独产出一个 chunk，在点击时才下载。静态 import 做不到这一点。

## 浏览器中的模块

浏览器通过 script 标签加载 ESM:

```html
<script type="module" src="./main.js"></script>
```

type="module" 带来几个固定行为：脚本默认 defer，等价于在文档解析完成后执行；模块内部自动进入严格模式；跨域加载需要服务端返回 CORS 响应头；同一个模块地址只执行一次。用 file:// 打开页面时来源为 null，模块请求会被拦截，因此需要本地服务器。

## ESM 与 CommonJS 的互操作限制

两类模块的加载机制不同，混用时有明确边界：

- ESM 导入 CommonJS:default 导入拿到 module.exports 整体；命名导入依赖工具对 CommonJS 源码的静态分析，动态拼接的导出属性可能识别不到。
- CommonJS 导入 ESM:历史上不可行，因为 ESM 可能包含顶层 await，无法同步完成加载。较新的 Node 版本对不含顶层 await 的 ESM 放开了 require，浏览器与打包器不保证同样的行为，通用做法仍是使用 import() 动态加载。

新项目统一一种模块格式，需要兼容时在边界层做适配，不要在同一份源码里同时写 require 与 import。

## 三种写法对照

| 维度 | IIFE | CommonJS | ESM |
| --- | --- | --- | --- |
| 作用域 | 函数作用域 | 文件级模块作用域 | 文件级模块作用域 |
| 依赖声明 | 无，依靠加载顺序 | require，运行时解析 | import，静态声明 |
| 加载方式 | 同步执行 | 同步 | 异步，静态依赖预加载 |
| 静态分析 | 否 | 有限 | 是 |
| 主要场景 | 旧版浏览器脚本 | Node.js 与旧工具链 | 现代浏览器与打包器 |

## 小结

- 全局脚本共享 window，命名冲突只能靠约定避免；IIFE 用函数作用域提供隔离；
- CommonJS 同步加载，每个文件是一个模块，module.exports 决定导出对象，模块只执行一次；
- ESM 的 import 与 export 是静态声明，支持实时绑定与顶层 await，动态 import() 用于按需加载；
- 浏览器通过 script type="module" 使用 ESM，加载模块需要 HTTP 服务与 CORS 响应头；
- CommonJS 与 ESM 的互操作有边界，新项目统一格式，跨格式加载使用 import() 适配。
