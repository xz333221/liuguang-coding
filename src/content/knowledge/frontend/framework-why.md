---
title: 框架解决什么问题：声明式与响应式
summary: '手写 DOM 更新时,状态和视图是两份真相,少改一处界面就对不上。框架把「视图是状态的函数」变成默认约定:Vue 用 Proxy 收集依赖做细粒度更新,React 靠 set 请求重跑组件再用 diff 落地。'
category: frontend
node: frontend-framework-why
order: 66
level: 入门
tags: [框架, 声明式, 响应式, 虚拟 DOM, Vue]
updated: 2026-11-19
mindmap: framework-why.mindmap.json
terms: []
sources:
  - title: Vue 官方文档 · 响应式基础
    url: https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html
    note: ref 与 reactive 的用法、深层响应的边界。
  - title: Vue 官方文档 · 深入响应式系统
    url: https://cn.vuejs.org/guide/extras/reactivity-in-depth.html
    note: 依赖收集与触发更新的实现原理,文中的 Proxy 示意参照这一节。
  - title: React 官方文档 · 用 State 响应输入
    url: https://zh-hans.react.dev/learn/reacting-to-input-with-state
    note: 声明式 UI、状态驱动渲染与「不要直接修改状态」的说明。
---

上一篇把第三方库的类型补齐了,编辑器能拦住属性名拼错这类问题。但类型管不到界面:数据变了,页面上引用了它的那三处显示还得自己一处处改。框架接手的正是这一段同步工作。

## 手写更新会漏

一个待办列表,用 DOM API 写出来是这样。

```js
const list = document.querySelector('#list')
const count = document.querySelector('#count')

function addTodo(text) {
  todos.push({ text, done: false })
  const li = document.createElement('li')
  li.textContent = text
  list.appendChild(li)
  count.textContent = String(todos.length)
}
```

加一项要动两个地方。等需求涨到「已完成数」「空状态提示」「按状态筛选后的列表」,每多一个衍生显示,就要回头把 `addTodo`、`toggleTodo`、`removeTodo` 每个入口都补一遍。

漏掉的那一处不会报错。`todos` 和界面各自演进,最后谁对不上只能靠肉眼发现。这类 bug 的排查成本高,因为出错的地方和写错的地方隔了好几个函数。

命令式的问题不是「难写」,是「要维护的同步点数量随功能相乘」。状态越多、入口越多,漏的概率越高。

## 声明式:描述结果,不描述过程

同一件事换成声明式,代码里没有 `appendChild`。

```vue
<script setup>
import { ref, computed } from 'vue'

const todos = ref([])
const done = computed(() => todos.value.filter((t) => t.done).length)
</script>

<template>
  <p>{{ todos.length }} 项,已完成 {{ done }}</p>
  <ul>
    <li v-for="t in todos" :key="t.id">{{ t.text }}</li>
  </ul>
</template>
```

React 版本只换了写法,思路一样:界面写成状态的函数。

```jsx
function TodoList() {
  const [todos, setTodos] = useState([])
  const done = todos.filter((t) => t.done).length

  return (
    <>
      <p>{todos.length} 项,已完成 {done}</p>
      <ul>{todos.map((t) => <li key={t.id}>{t.text}</li>)}</ul>
    </>
  )
}
```

新增的衍生显示就是多加一行表达式,不用回去改修改入口。这个差别不体现在第一版代码长度上,体现在第 20 次改需求时。

## 框架怎么知道数据变了

两边给出的答案是两种完全不同的机制。

| 维度 | Vue | React |
| --- | --- | --- |
| 追踪方式 | 运行时拦截属性读写 | 不追踪,整体重跑组件函数 |
| 更新粒度 | 精确到用到该属性的副作用 | 组件级,再靠 diff 落到 DOM |
| 触发手段 | 直接改响应式对象 | 调用 set 函数 |
| 典型失效原因 | 绕过了响应式包装 | 原地改对象,引用没变 |

Vue 在运行时把对象包成 `Proxy`,读属性时把当前正在执行的副作用记进依赖表,写属性时把表里的函数重新跑一遍。

```js
// 示意,省略了嵌套对象、数组与调度
const targetMap = new WeakMap()
let activeEffect = null

function track(target, key) {
  if (!activeEffect) return
  let deps = targetMap.get(target)
  if (!deps) targetMap.set(target, (deps = new Map()))
  let set = deps.get(key)
  if (!set) deps.set(key, (set = new Set()))
  set.add(activeEffect)
}

function trigger(target, key) {
  const set = targetMap.get(target)?.get(key)
  if (set) [...set].forEach((fn) => fn())
}

function reactive(obj) {
  return new Proxy(obj, {
    get(t, k, r) { track(t, k); return Reflect.get(t, k, r) },
    set(t, k, v, r) {
      const ok = Reflect.set(t, k, v, r)
      trigger(t, k)
      return ok
    },
  })
}
```

真实实现还要处理嵌套对象的懒代理、数组方法、`Map` / `Set`、同一轮更新的去重与调度顺序。骨架只有两句:**读的时候收集,写的时候通知**。

基本类型没法用 `Proxy` 包,所以 `ref(0)` 返回的是一个带 `value` 属性的对象,用 getter / setter 收集。这解释了一个新手常问的问题:为什么模板里写 `count`,脚本里却要写 `count.value`。模板在编译时自动补了 `.value`。

## React 走的是另一条路

React 不追踪任何东西。`useState` 返回的 set 函数只做一件事:把新值排进队列,让这个组件重新执行。

在组件函数里写一句 `console.log('render')`,每点一次按钮就打印一次,这就是「重跑」的直接证据。

重新执行会产出一棵新的元素树(普通对象描述的界面结构,通常叫虚拟 DOM),框架对比前后两棵树,把差异落到真实 DOM 上。虚拟 DOM 的价值在于多了一层中间表示:同一份组件代码可以输出到浏览器、字符串、原生端,不是「比手写 DOM 快」。

由此带出一个必踩的坑。`setCount` 不是原地赋值,本次执行里的 `count` 在整个回调结束前都是旧值:

```jsx
setCount(count + 1)
setCount(count + 1)      // 两次都是 0 + 1,最终只加 1
setCount((c) => c + 1)   // 传函数才能拿到队列里的最新值
```

## 三条绕开响应的线

Vue 这边失效,基本都是「值取出来之后就不再是响应式的了」。

```js
const state = reactive({ count: 0 })
const { count } = state        // count 是一个普通数字,和 state 断开了
count++                        // state.count 不变

const { count: countRef } = toRefs(state)  // 正确:拿到的是 ref
```

第二种是整体替换。`state = reactive({ ... })` 之后,变量指向了新代理,但模板里捕获的还是旧代理,改新对象界面不动。改属性,或者一开始就用 `ref`。

React 这边失效,基本都是「引用没变」。`todos.push(item)` 之后调 `setTodos(todos)`,前后是同一个数组引用,`Object.is` 判定没有变化,界面不动;要写成 `setTodos([...todos, item])`。

反过来,Vue 里 `todos.value.push(item)` 是可以的,因为 `Proxy` 拦住了数组方法内部的下标写入和 `length` 变更。同一条规则在两个框架里方向相反,这是切换框架时最容易带着旧习惯写错的地方。

## 小结

- 命令式更新要求每个修改入口同步所有衍生显示,漏一处就是静默不一致;
- 声明式只描述「给定状态界面应该是什么样」,同步交给框架;
- Vue 在运行时用 `Proxy` 收集依赖,改属性精确触发用到它的副作用;
- React 不追踪,set 函数请求重跑组件,靠 diff 把差异落到 DOM;
- 解构响应式对象、整体替换、原地修改后传同一引用,是两边失效的共同原因。
