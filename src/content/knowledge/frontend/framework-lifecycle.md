---
title: 生命周期与副作用
summary: '渲染只描述界面，请求、订阅、定时器属于副作用。React 用 useEffect 的依赖数组加清理函数管，依赖漏了会读到旧值；Vue 用 onMounted 与 watch/watchEffect，依赖自动收集，异步竞态仍要自己处理。'
category: frontend
node: frontend-framework-lifecycle
order: 68
level: 入门
tags: [useEffect, 生命周期, 副作用, watchEffect, 定时器]
updated: 2026-11-19
mindmap: framework-lifecycle.mindmap.json
terms: []
sources:
  - title: React 官方文档 · 使用 Effect 同步
    url: https://zh-hans.react.dev/learn/synchronizing-with-effects
    note: 副作用的定义、依赖数组与清理函数的作用。
  - title: React 官方文档 · 你可能不需要 Effect
    url: https://zh-hans.react.dev/learn/you-might-not-need-an-effect
    note: 哪些逻辑不该放进 Effect,以及替代写法。
  - title: Vue 官方文档 · 生命周期钩子
    url: https://cn.vuejs.org/guide/essentials/lifecycle.html
    note: onMounted、onUpdated、onUnmounted 的执行时机。
---

组件由状态驱动，渲染函数应该是纯的：同样的输入出同样的界面。可请求、订阅、定时器这些操作会碰到外部世界，不能在渲染里做。生命周期的意义就是把这类操作安排在确定的时刻。

## 渲染必须是纯的

React 在开发模式下会把组件函数执行两次来暴露副作用。往渲染里塞一句 `document.title = x`，你会看到它被写两遍，而且执行时机不确定。

```jsx
function Bad({ id }) {
  localStorage.setItem('lastId', id)   // 渲染时改外部状态
  return <p>{id}</p>
}
```

渲染可能被中断、被重试、被丢弃(并发特性下更明显)，写进去的值就不可信。

Vue 的模板也同理。模板里调用一个会发请求的方法，每次重渲染都发一次。

判断标准很土：这段代码执行两次、零次、被打断，结果会不会不一样。会，就属于副作用。

## React:依赖数组与清理函数

`useEffect` 在 DOM 更新提交之后执行，不阻塞绘制。

```jsx
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000)
  return () => clearInterval(id)
}, [])
```

三段各有含义。

- 回调是副作用本体，在浏览器完成绘制之后异步执行；
- 返回的函数是清理函数，在下一次执行前和组件卸载时调用；
- 第二个参数是依赖数组，数组里的值用 `Object.is` 比较，变了才重跑。

数组写法的三种形态差别很大：

| 依赖数组 | 执行时机 | 常见误用 |
| --- | --- | --- |
| 不写 | 每次渲染后都执行 | 无限循环 |
| `[]` | 挂载后一次，卸载时清理 | 读到了初始值 |
| `[a, b]` | a 或 b 变化后执行 | 漏写用到的值 |

不写依赖数组时，回调里调 `setState` 会触发渲染，渲染又执行回调，一分钟内能把浏览器卡死。

严格模式会额外暴露一类问题。React 18 在开发环境把每个组件挂载、卸载、再挂载一次，清理函数没写对的代码立刻现形：两个定时器叠着跑，两次请求互相覆盖。生产环境不会这样做，所以不要看到「开发环境跑两次」就去删严格模式。

## 闭包把旧值留在里面

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000)
  return () => clearInterval(id)
}, [])   // count 永远是 0,每秒都设成 1

useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000)
  return () => clearInterval(id)
}, [])   // 函数式更新,回调不依赖 count
```

回调在首次渲染时创建，捕获的是那一次的 `count`。依赖数组是空的，回调永远不会重建，于是它永远读 0。把 `count` 放进依赖也能修，代价是定时器每秒销毁重建一次；函数式更新让回调只依赖 `setCount`，不用重建。

这也是「依赖数组里该写什么」的真正答案：不是写「哪些值变了要重跑」，而是写「回调用到的所有外部值」。写了但没用到的可以删，用到了没写的迟早出错。

## Vue:钩子固定，追踪自动

Vue 把时刻拆成具名钩子，依赖交给响应式系统。

```js
import { ref, watch, watchEffect, onUnmounted } from 'vue'

const id = ref(1)
const user = ref(null)

watch(id, async (next) => {          // 显式指定监听源,默认懒执行
  user.value = await fetchUser(next)
}, { immediate: true })

const stop = watchEffect(() => {     // 自动收集依赖,首次立即执行
  document.title = user.value?.name ?? '加载中'
})

onUnmounted(() => stop())
```

`onMounted` 在挂载后执行，适合拿 DOM 引用、初始化第三方库；`onUnmounted` 做清理；`onUpdated` 少用，多数场景用 `watch` 更精确。

`watch` 与 `watchEffect` 的区别值得单独记：

| | `watch` | `watchEffect` |
| --- | --- | --- |
| 监听源 | 显式写出 | 自动收集回调里读到的响应式数据 |
| 首次执行 | 默认不执行，`immediate: true` 才执行 | 立即执行一次 |
| 拿到旧值 | 有 `(newVal, oldVal)` | 没有 |
| 清理副作用 | 回调第二个参数 `onCleanup` | 同 |
| 适合 | 需要区分前后值、需要懒执行 | 依赖多、只想跟着变 |

用 `watch` 管请求，用 `watchEffect` 管「读什么就同步什么」这种整体性副作用。两者都返回 `stop` 函数，在组件外用的时候得手动调，否则一直活着。

## 异步与竞态

快速切换列表时，先发的请求可能后回来，把后发的结果覆盖掉。

```js
watchEffect((onCleanup) => {
  const ctrl = new AbortController()
  fetch(`/api/user/${id.value}`, { signal: ctrl.signal })
    .then((r) => r.json())
    .then((data) => { user.value = data })
    .catch((err) => { if (err.name !== 'AbortError') console.error(err) })
  onCleanup(() => ctrl.abort())
})
```

React 里同样用 `AbortController`，清理函数返回 `() => ctrl.abort()`。不能 abort 的场景(比如已经发出的上报)再加一个自增序号，回来时对比序号，不是最新的一律丢弃。

另一个坑是 `useEffect` 的回调不能写成 `async`:异步函数的返回值是 Promise,React 拿不到清理函数，卸载时的 abort 与退订全部失效。要写就在里面再包一层 async 函数并立即调用。

## 卸载时漏清的东西

事件监听、定时器、`WebSocket`、`ResizeObserver`、第三方图表实例，挂了不清就是泄漏。第 9 章讲过的内存增长，前端项目里最常见的来源就是组件卸载后还在跑的回调。

```js
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
```

写的时候成对出现，不要依赖「这个组件一般不会卸载」。路由切换、标签页关闭、条件渲染都会卸载。

## 小结

- 渲染保持纯，请求、订阅、定时器放到副作用里；
- `useEffect` 在提交后执行，清理函数在下一次执行前与卸载时调用；
- 依赖数组要写全回调用到的外部值，漏写会读到旧值；
- `watch` 显式声明源、能拿旧值，`watchEffect` 自动收集、首次立即执行；
- 异步副作用用 `AbortController` 加清理函数处理竞态，组件卸载时把监听与定时器清干净。
