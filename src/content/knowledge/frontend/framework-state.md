---
title: 状态管理：局部、全局与组合式
summary: '状态该放多高，取决于有几个不相关的组件要读它。多数项目的问题不是缺少状态库，而是一开始就把所有东西塞进全局。组合式函数负责复用逻辑，不负责共享状态；Pinia 与 Context 加 reducer 的取舍看更新频率与访问范围。'
category: frontend
node: frontend-framework-state
order: 72
level: 进阶
tags: [状态管理, Pinia, Context, 组合式, 状态提升]
updated: 2026-11-19
mindmap: framework-state.mindmap.json
terms: []
sources:
  - title: Vue 官方文档 · 组合式函数
    url: https://cn.vuejs.org/guide/reusability/composables.html
    note: 复用逻辑与复用状态的区别、命名的约定。
  - title: Pinia 官方文档 · 定义 Store
    url: https://pinia.vuejs.org/zh/core-concepts/defining-stores.html
    note: setup store 的写法与 storeToRefs 的用途。
  - title: React 官方文档 · 使用 Reducer 和 Context 扩展应用
    url: https://zh-hans.react.dev/learn/scaling-up-with-reducer-and-context
    note: reducer 加 Context 的分层写法与拆分 Context 的理由。
---

路由切的是页面，状态切的是数据。项目变复杂之后，大部分「状态管理」的讨论其实是在回答一个更朴素的问题：这个值由谁持有。

## 三类状态

先分类，再决定放哪。混在一起是所有混乱的源头。

| 类型 | 例子 | 生命周期 | 放哪 |
| --- | --- | --- | --- |
| 局部 UI 状态 | 弹窗开关、输入框内容、当前 tab | 组件存活期间 | 组件内部 |
| 全局 UI 状态 | 主题、登录用户、通知队列 | 整个会话 | 状态库或 Context |
| 服务端数据 | 列表、详情、分页结果 | 需要缓存与失效 | 请求缓存层(第 13 章) |

第三类最常被误当成全局状态。把接口返回的数据塞进 store，就要自己写缓存过期、去重请求、乐观更新、错误重试，而这些正是 TanStack Query、SWR 这类库的全部工作。状态库里只留「客户端自己的状态」。

## 先局部，再提升

合理的提升路径只有一条：子组件内部 → 最近共同父级 → 全局。

```jsx
// 两个兄弟都要读 filter,提到父级
function Page() {
  const [filter, setFilter] = useState('all')
  return (
    <>
      <FilterBar value={filter} onChange={setFilter} />
      <Table filter={filter} />
    </>
  )
}
```

跳过第二级直接进全局的代价是隐性的：数据流不再是单向的一棵树，任何组件都能改这个值，出问题时无法靠阅读父组件定位来源。

提升也有上限。传了四层之后，才轮到 Context 或 provide / inject，再往上才是专门的状态库。判断依据是「有几个不相关的组件要读」，不是「代码看起来乱不乱」。

## 组合式只复用逻辑

Vue 的 composable 与 React 的自定义 Hook 长得像，共同点是每次调用都产生一份独立的状态。

```js
// composables/useCounter.js
import { ref } from 'vue'

export function useCounter(init = 0) {
  const count = ref(init)
  const inc = () => { count.value += 1 }
  return { count, inc }
}
```

```js
// hooks/useCounter.js
import { useState, useCallback } from 'react'

export function useCounter(init = 0) {
  const [count, setCount] = useState(init)
  const inc = useCallback(() => setCount((c) => c + 1), [])
  return { count, inc }
}
```

两个组件各调一次，各有各的 `count`，互不影响。想让它们共享，得把状态搬到组件树外面——这正是状态库要解决的问题，不要指望 composable 顺手完成。

把「请求加轮询」「表单校验」「拖拽」这类逻辑抽成 composable 是对的；把「当前用户」抽成 composable 就会得到多份互相不同步的用户对象。

## 跨层传递

```jsx
// Vue:提供方
provide('theme', readonly(theme))

// 任意后代
const theme = inject('theme')

// React:值必须 memo,否则每次渲染都是新对象,所有消费者跟着重渲染
function Root() {
  const value = useMemo(() => ({ user, logout }), [user])
  return (
    <ThemeCtx.Provider value={value}>
      <App />
    </ThemeCtx.Provider>
  )
}
```

React 的 Context 有一个必踩的性能点：provider 的 `value` 每次渲染都新建对象时，所有消费者都会重渲染，哪怕里面的字段没变。更进一步是把一个大的 Context 拆成「读」与「写」两个，让不相关的组件不互相牵连。

## 全局方案怎么选

| 维度 | Pinia | Context + useReducer |
| --- | --- | --- |
| 依赖 | 需引入 | React 内置 |
| 在组件外访问 | 可以，直接调 store | 不行，只能在组件内 |
| 更新范围 | 精确到订阅了该 state 的组件 | provider 下所有消费者 |
| 调试 | devtools 时间旅行 | 靠日志与 reducer 的纯函数 |
| 样板代码 | 少，无 mutations | 中等，action 与 reducer 分开 |
| 适合 | 状态多、跨模块访问 | 状态少、更新不频繁、不想加依赖 |

Pinia 的 setup store 就是一个导出的 composable:

```js
export const useCart = defineStore('cart', () => {
  const items = ref([])
  const total = computed(() =>
    items.value.reduce((sum, i) => sum + i.price * i.qty, 0),
  )
  function add(item) {
    const hit = items.value.find((i) => i.sku === item.sku)
    if (hit) hit.qty += 1
    else items.value.push({ ...item, qty: 1 })
  }
  return { items, total, add }
})
```

Pinia 从 Vue 3 起不再需要 mutations，直接改 state 也能被 devtools 记录。它和 Vue 的响应式系统是一套，所以 `computed` 缓存、`watch` 订阅都能直接用。

对应的 reducer 版本把「怎么改」收进纯函数：

```jsx
function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const hit = state.items.find((i) => i.sku === action.item.sku)
      if (hit) {
        return {
          items: state.items.map((i) =>
            i === hit ? { ...i, qty: i.qty + 1 } : i),
        }
      }
      return { items: [...state.items, { ...action.item, qty: 1 }] }
    }
    default:
      return state
  }
}
```

reducer 不允许原地改状态，每次返回新对象。好处是每次变更都可重放、可测试，代价是深层嵌套时要写不少展开语法(用 Immer 可以缓解)。

## 三个边界

**解构丢响应式**。`const { total } = useCart()` 拿到的 `total` 是当次快照。要保留响应式用 `storeToRefs(store)`，方法可以直接解构。

**把 props 抄进 store**。组件接收 `userId`，进组件后写 `store.userId = userId`，随后两处数据开始分叉。要么都从 store 读，要么都从 props 读。

**用全局状态传参**。从列表页跳到详情页，把 id 存进 store 再跳。刷新页面 store 清空，详情页拿不到 id。这类跨页面的输入应该放在 URL 里。

## 小结

- 状态按「局部 UI、全局 UI、服务端数据」分类，三类用不同手段管理；
- 提升路径是组件内到共同父级再到全局，跳过中间层会破坏单向数据流；
- composable 与自定义 Hook 复用逻辑，每次调用一份状态，不能替代共享；
- Context 的 value 要 memo，否则每次渲染所有消费者都跟着更新；
- Pinia 适合状态多且需要跨模块访问，Context 加 reducer 适合状态少、不想加依赖。
