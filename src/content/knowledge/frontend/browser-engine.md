---
title: JS 引擎与内存：V8、GC 与内存泄漏
summary: 'V8 用 Ignition 解释字节码，热点函数交给 TurboFan 优化；新生代用 Scavenge 复制，存活对象晋升老生代。泄漏是无用但仍可达，靠 Memory 面板的三次快照对比定位。'
category: frontend
node: frontend-browser-engine
order: 52
level: 深入
tags: [浏览器, V8, 垃圾回收, 内存泄漏]
updated: 2026-11-19
mindmap: browser-engine.mindmap.json
terms: ["garbage-collection", "stack-and-heap"]
sources:
  - title: 'V8 · Trash talk: the Orinoco garbage collector'
    url: https://v8.dev/blog/trash-talk
    note: 分代回收、Scavenge 与标记整理的整体设计。
  - title: MDN · Memory management
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Memory_management
    note: 可达性、引用与常见泄漏形态。
  - title: Chrome DevTools · Memory
    url: https://developer.chrome.com/docs/devtools/memory
    note: 堆快照、分配时间线与对比视图的用法。
---

前两篇讲的是像素怎么产生，执行脚本的那部分运行时还没展开。JS 由引擎解析、编译、执行，对象分配在堆上，回收交给 GC；页面卡顿与内存持续上涨，常常要从这里找原因。

## 从源码到执行

V8 处理一段脚本分几步：

1. 解析：源码切成 token，生成抽象语法树(AST)；暂时不执行的函数只做预解析，被调用时才完整解析；
2. 编译：字节码生成器把 AST 编译成字节码，由 Ignition 解释执行；
3. 优化：执行频繁的函数被判定为热点，TurboFan 结合运行时收集的类型反馈，生成优化后的机器码；
4. 去优化：类型假设被打破时退回字节码，之后可能重新优化。

```text
源码 → 词法 / 语法分析 → AST → Ignition 字节码 → 执行
                                   │ 热点函数 + 类型反馈
                                   ▼
                             TurboFan 优化机器码
                                   │ 类型假设失效
                                   ▼
                                 去优化
```

类型反馈解释了「保持对象形状稳定」为什么能变快：同一处代码反复处理相同隐藏类(hidden class)的对象，内联缓存(inline cache)命中，属性访问接近按下标取值；突然传入另一种形状的对象，缓存失效，代码退回慢路径。

```js
function area(rect) {
  return rect.w * rect.h;
}

area({ w: 1, h: 2 });        // 形状 A
area({ w: 3, h: 4 });        // 仍是形状 A,内联缓存命中
area({ w: 1, h: 2, x: 0 });  // 形状 B,缓存失效
```

在构造函数之外随手增删属性、用 `delete` 删属性、把不同结构的对象塞进同一个数组，都会让隐藏类分叉，把稳定的访问变成查表。这类优化不该主导业务写法，但在热点路径上值得注意。

## 栈与堆

执行上下文与局部变量在栈上，随函数调用进出自动分配和释放；对象、数组的内容、闭包捕获的变量在堆上，生命周期由可达性决定，不由作用域决定。

```js
function makeCounter() {
  let count = 0;
  return () => ++count;
}
```

`count` 是局部变量，但返回的函数引用它。函数逃逸出作用域后 `count` 仍然可达，只能留在堆上。闭包让变量活得更久，这也是泄漏的常见来源。

## 分代回收

V8 把堆分为新生代与老生代，依据是「大多数对象很快死亡」。

- 新生代：容量小，分成两个半区(from 与 to)。回收用 Scavenge:把 from 区里存活的对象复制到 to 区，再整体清空 from 区。复制算法没有碎片，耗时与存活对象数量成正比，而不是与总容量成正比；
- 晋升：经历一次 Scavenge 仍存活的对象，通常被移到老生代；新生代空间不足时也会提前晋升；
- 老生代：容量大，存活率高。用标记-清除(Mark-Sweep)找出不可达对象并回收，再用标记-整理(Mark-Compact)把存活对象挪到一起，消除碎片。

| 区域 | 典型对象 | 算法 | 特点 |
| --- | --- | --- | --- |
| 新生代 | 临时对象、短命闭包 | Scavenge(复制) | 快，无碎片，空间小 |
| 老生代 | 长生命周期对象、大对象 | Mark-Sweep / Mark-Compact | 慢，有停顿，空间大 |

为了缩短停顿，标记被拆成增量标记(incremental marking)，与 JS 交替执行；标记还可以在后台线程并发进行，写屏障负责记录标记期间被修改的引用。大对象(很长的数组或字符串)通常直接进入老生代的大对象空间，免得在新生代反复复制。

## 可达性才算数

GC 从根集合出发遍历：全局对象(`window`、`globalThis`)、当前调用栈上的变量、闭包捕获的变量，都是根。顺着引用能走到的对象存活，走不到的被回收。

所以 JS 里的「泄漏」有准确定义：对象已经没用了，但仍然从根可达。常见形态：

```js
// 1. 意外的全局变量
function init() {
  cache = {};   // 没有声明,挂到 window 上,永远可达
}

// 2. 忘记清理的定时器
const timer = setInterval(() => {
  render(hugeData);
}, 1000);
// 组件卸载时没有 clearInterval

// 3. 监听器持有大对象
window.addEventListener('resize', () => {
  layout(hugeData);
});

// 4. 缓存了已移除的节点
const cache = new Map();
cache.set('row', document.querySelector('#row'));
document.querySelector('#list').remove();
// 节点已离开文档,但 Map 仍引用它,整棵子树都留着
```

第 4 种在堆快照里表现为 Detached HTMLElement，是排查 DOM 泄漏最直接的线索。删除节点只是断开它与文档的连接，引用计数意义上的释放还要等所有引用消失。

## 弱引用

有些关联数据不该阻止对象被回收。`WeakMap` 的键是弱引用：键对象没有其它引用时，条目自动消失。

```js
const meta = new WeakMap();

function bind(el) {
  meta.set(el, { clicks: 0 });
  el.addEventListener('click', () => {
    meta.get(el).clicks += 1;
  });
}
```

元素被移除后，`WeakMap` 里的条目不会让它继续存活。`WeakSet` 同理，适合标记「处理过的节点」。`WeakMap` 的键必须是对象，不可枚举，也没有 `size`，不能当普通缓存用。

`WeakRef` 提供更直接的能力：`new WeakRef(obj)` 之后，`deref()` 返回对象或 `undefined`;`FinalizationRegistry` 可以在对象被回收后执行回调。两者都不保证时机，回调可能永远不执行，只适合「没了也无所谓」的缓存，不能用来释放必须释放的资源。

## 工具：三快照法

DevTools 的 Memory 面板有三种手段：

- Heap snapshot:记录当前堆里所有对象与引用关系；
- Allocation instrumentation on timeline:按时间记录分配，定位持续增长的对象；
- Allocation sampling:低开销采样，适合长时间录制。

定位泄漏用三快照法：

1. 打开页面，等状态稳定，点垃圾桶图标强制 GC，拍第一张；
2. 反复执行怀疑泄漏的操作若干次，强制 GC，拍第二张；
3. 再执行同样的操作若干次，强制 GC，拍第三张；
4. 在第三张上选 Comparison，基线选第二张，按 Delta 排序，看哪些构造函数持续增加。

一次增长可能是缓存预热，每轮都线性增长才是泄漏。点开对象能看到 Retainers，也就是谁在引用它，顺着引用链往上走，通常能找到那个忘了清理的数组或 Map。

`performance.memory` 能读到 `usedJSHeapSize` 之类的数值，但这个接口非标准，只有 Chrome 系支持，数值还经过量化，不能当精确指标。要准确测量，用 Memory 面板或 Performance 面板的 JS Heap 轨道。

## 写代码时的几条规则

- 全局缓存要有上限，用 `Map` 加 LRU 或定时清理，不要无限 `set`;
- 定时器与 rAF 在销毁时清掉，`clearInterval` 和 `cancelAnimationFrame` 都要写；
- 事件监听用 `AbortController` 统一移除，比记住每个函数引用可靠；
- 观察者用完 `disconnect()`，包括 `IntersectionObserver`、`ResizeObserver`、`MutationObserver`;
- DOM 关联数据放 `WeakMap`，不要把大对象挂在元素的自定义属性上；
- 大计算放进 Worker，算完终止 worker，不要在模块级变量里留中间结果。

```js
const controller = new AbortController();
window.addEventListener('scroll', onScroll, { signal: controller.signal });

// 组件销毁时,一次移除该 signal 下的全部监听
controller.abort();
```

## 小结

- V8 先解释字节码，热点函数再由 TurboFan 优化，类型稳定是优化的前提；
- 栈随调用自动释放，堆靠可达性回收，闭包会让变量活得更久；
- 新生代用 Scavenge 复制，存活对象晋升老生代，老生代用标记-清除-整理；
- 泄漏是「无用但仍可达」，常见于全局变量、定时器、监听器和 detached 节点；
- `WeakMap`、`WeakRef` 不阻止回收，但不能依赖回收时机；
- 用 Memory 面板的三快照对比找增长点，再看 Retainers 定位引用链。
