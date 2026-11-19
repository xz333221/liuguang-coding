---
title: 组件、props 与状态（Vue 3 / React）
summary: '组件是把「状态到视图」这段函数切成有名字、有输入输出的块:props 向下传只读数据,事件向上报告变化,状态就近放在用到它的最低层。三个规则决定代码能不能长期维护,语法差异反而是次要的。'
category: frontend
node: frontend-framework-component
order: 67
level: 入门
tags: [组件, props, 状态, 单向数据流, Vue]
updated: 2026-11-19
mindmap: framework-component.mindmap.json
terms: []
sources:
  - title: Vue 官方文档 · 组件基础
    url: https://cn.vuejs.org/guide/essentials/component-basics.html
    note: props 声明、自定义事件与插槽的基本用法。
  - title: React 官方文档 · 传递 Props 给组件
    url: https://zh-hans.react.dev/learn/passing-props-to-a-component
    note: props 的只读约定与组合方式的说明。
  - title: React 官方文档 · 使用 State 的常见场景
    url: https://zh-hans.react.dev/learn/sharing-state-between-components
    note: 状态提升与「单一数据源」的判断依据。
---

上一篇讲了框架把界面写成状态的函数。函数一长就没法维护,组件就是给这段函数切块,并规定块与块之间怎么传东西。

## 一个组件长什么样

Vue 用单文件组件,模板、逻辑、样式在一个 `.vue` 文件里。

```vue
<script setup>
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
})
const emit = defineEmits(['close'])
</script>

<template>
  <header class="card-head">
    <h3>{{ props.title }} ({{ props.count }})</h3>
    <button @click="emit('close')">关闭</button>
  </header>
</template>
```

React 用函数,返回 JSX。

```jsx
function CardHead({ title, count = 0, onClose }) {
  return (
    <header className="card-head">
      <h3>{title} ({count})</h3>
      <button onClick={onClose}>关闭</button>
    </header>
  )
}
```

两边结构一致:数据从 props 进来,变化通过事件出去。组件的输入是 props,输出是回调,中间是自己持有的状态。子组件不知道数据来自父级的哪个变量,也不知道事件会被谁处理,这才叫可复用。

## props 是只读的

Vue 直接改 props 会在控制台打印 `Set operation on key "title" failed: target is readonly`,赋值这次不生效。

React 里 props 是普通对象,改属性不会报错,但父组件下次渲染会用新值覆盖回来。更麻烦的是,传进来的如果是对象,你改的是同一个引用,父组件那边也一起变了,行为取决于渲染时机。

两边都当成只读。需要派生值就现算:Vue 用 `computed(() => props.title.toUpperCase())` 拿缓存,React 直接在渲染里算,要缓存才上 `useMemo`。

单向数据流不是风格问题。父组件的状态是唯一真相,子组件只能请求修改,不能自己改。这样出现数据不一致时,排查范围只在持有状态的那一层。

## 状态放在哪一层

三条规则够用。

- 只有这个组件用的,放组件内部;
- 两个兄弟组件都要用的,提到最近的共同父级;
- 要跨很多层、且不属于任何一棵子树的,再看第 12 章讲状态管理那篇。

第二条最容易做过头。为了「以后可能复用」把什么都提上去,父组件变成一个装满无关字段的桶,每个子组件都被迫接收一堆用不到的 props。

还有一种反过来:把开关交给父级,自己只负责显示与报告,即受控组件。

```vue
<!-- Toggle.vue,自己不持有状态 -->
<script setup>
defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button @click="emit('update:modelValue', !modelValue)">
    {{ modelValue ? '开' : '关' }}
  </button>
</template>
```

React 版本少一个 emit,把 `onChange(!value)` 当成 props 传进来即可。

多写了几行,换来的是父级能读、能重置、能和其他状态联动。第 12 章讲表单那篇会把这条路走到极致。

## 内容怎么传

props 传数据,插槽传结构。两者不能互相替代。

| 需求 | Vue | React |
| --- | --- | --- |
| 传只读数据 | `defineProps` | 函数参数解构 |
| 通知父级 | `emit('change', v)` | 传入的回调函数 |
| 传一段结构 | `<slot>` / 具名插槽 | `children` / 传 JSX |
| 传结构并回填数据 | 作用域插槽 `v-slot="{ item }"` | render prop / 传函数 |
| 样式隔离 | `<style scoped>` | CSS Modules / CSS-in-JS |

```jsx
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h4>{title}</h4>
      {children}
    </section>
  )
}

function App() {
  return (
    <>
      <Panel title="详情"><p>任意结构</p></Panel>
      {/* 需要子级回填数据时,传函数而不是现成的节点 */}
      <List items={rows}>
        {(item) => <Row key={item.id} data={item} />}
      </List>
    </>
  )
}
```

Vue 的具名插槽相当于多个 children,作用域插槽相当于「父级给一段模板,子级负责喂数据」。React 里没有插槽语法,对应做法就是把函数当 children 传,由上例的 `List` 在内部调用它。

## 四个具体的坑

**用 props 初始化 state**。这条在 React 里几乎人人踩过:

```jsx
function PriceInput({ initial }) {
  const [value, setValue] = useState(initial)  // 只在首次渲染生效
  return <input value={value} onChange={(e) => setValue(e.target.value)} />
}
```

父级换了一个 `initial`,`value` 不会跟着变。要么别用 state(直接受控),要么加 `key={initial}` 让组件重建。Vue 里对应的是 `watch` props 再赋值,但多数时候说明这个状态本来就不该存在。

**解构 props**。Vue 3.4 及以前,`const { title } = defineProps(...)` 会把 props 变成普通值,后续变化不响应。3.5 起编译器对解构做了处理,但跨版本的项目里还是写 `props.title` 最稳。

**在组件内部再定义组件**:

```jsx
function Outer() {
  const Inner = () => <input />   // 每次渲染都是一个新函数
  return <Inner />
}
```

每个新函数是不同的组件类型,React 会卸载旧的、挂载新的,输入框每敲一个字就失焦。定义挪到模块顶层。

**内联对象与函数**。`<Child config={{ a: 1 }} onClick={() => {}} />` 每次渲染都是新引用,包了 `memo` 也挡不住。要优化就把它提到外面或用 `useCallback`,但先确认这真是瓶颈(第 15 章)。

## 组件该切多细

判据不是行数,是「有没有独立的职责和独立的变化原因」。一个 200 行的表单,如果字段之间高度联动,硬拆成 10 个组件只会让状态在父子间来回传。反过来,一个 30 行的卡片里塞了三种业务,改一处要读三遍,就该拆。

能独立测试、能单独描述用途、props 不超过 5 个,通常粒度就对了。

## 小结

- 组件是 props 向下、事件向上、状态自持的一段视图函数;
- props 当只读用,派生值现算,不要在子组件里改;
- 状态就近放,只有兄弟共享才提升,别为「以后可能用」提前上提;
- 插槽与 children 传结构,props 传数据,两者不要混着用;
- 用 props 初始化 state、组件内定义组件、内联对象传给 memo,是三个高频错误。
