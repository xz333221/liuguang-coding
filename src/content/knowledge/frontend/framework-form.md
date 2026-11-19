---
title: 事件、表单与双向绑定
summary: 'React 默认单向:value 与 onChange 成对出现,只给 value 就是只读输入框。Vue 用 v-model 把这对写法收成语法糖,展开后仍是 props 加事件。受控与非受控的取舍,取决于这个值有没有别的读者。'
category: frontend
node: frontend-framework-form
order: 70
level: 入门
tags: [表单, 受控组件, v-model, 事件, 输入法]
updated: 2026-11-19
mindmap: framework-form.mindmap.json
terms: []
sources:
  - title: React 官方文档 · 表单
    url: https://zh-hans.react.dev/reference/react-dom/components/input
    note: value 与 onChange 的配对要求,受控与非受控的写法。
  - title: Vue 官方文档 · 表单输入绑定
    url: https://cn.vuejs.org/guide/essentials/forms.html
    note: v-model 在不同控件上的展开形式与修饰符。
  - title: MDN · 组合事件 compositionstart
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Element/compositionstart_event
    note: 输入法组词阶段的 composition 事件,中文输入需要处理。
---

列表解决「怎么显示一堆数据」,表单解决「用户怎么把数据交回来」。框架在这一块的分歧最大:Vue 给你双向绑定的糖,React 坚持一个方向,由你显式接上。

## 事件先看一层

```vue
<button @click.prevent="save">保存</button>
<form @submit.prevent="onSubmit">
```

```jsx
<button onClick={(e) => { e.preventDefault(); save() }}>保存</button>
```

Vue 的修饰符就是 `preventDefault` / `stopPropagation` 的语法糖。`.prevent` `.stop` `.once` `.self` `.capture` 这几个覆盖了九成场景。

React 的 `onClick` 拿到的不是原生事件,是合成事件(SyntheticEvent):它把各浏览器的差异抹平,接口按 W3C 标准实现。想拿原生对象用 `e.nativeEvent`。React 17 起事件不再池化,在回调之外异步读取 `e.target` 不会拿到 `null`,但值仍然要在回调当下取走,别把 `e` 存起来再说。

`return false` 在 React 里不能阻止默认行为,这一点和 jQuery 时代不同,必须显式调用。

## 受控与非受控

| | 受控 | 非受控 |
| --- | --- | --- |
| 值存在哪 | 组件状态里 | DOM 节点里 |
| 读取方式 | 直接用 state | ref 或提交时 `FormData` |
| 每次输入 | 触发一次重渲染 | 不触发 |
| 适合 | 需要实时校验、联动、格式化 | 大表单、文件上传、一次性提交 |
| 风险 | 漏写 `onChange` 变成只读 | 无法在输入时干预 |

React 里这两行必须成对,少一半就出问题:

```jsx
<input value={name} onChange={(e) => setName(e.target.value)} />
```

只写 `value` 不写 `onChange`,控制台会提示「提供了 value 却没有 onChange,这个字段将被渲染为只读」,输入框打不了字。很多人第一次遇到这个问题都是因为漏了一半。

非受控写法把值留在 DOM:

```jsx
function Search() {
  const ref = useRef(null)
  function onSubmit(e) {
    e.preventDefault()
    console.log(ref.current.value)
  }
  return (
    <form onSubmit={onSubmit}>
      <input ref={ref} defaultValue="" />
    </form>
  )
}
```

注意初始值要用 `defaultValue`,写成 `value` 又会变成受控。

## v-model 展开成什么

`v-model` 不是魔法,展开后和 React 的写法一一对应。

```vue
<input v-model="msg" />
<!-- 等价于 -->
<input :value="msg" @input="msg = $event.target.value" />

<MyInput v-model="form.title" />
<!-- 等价于 -->
<MyInput :modelValue="form.title" @update:modelValue="form.title = $event" />

<input v-model.lazy="msg" />    <!-- 用 change 代替 input,失焦才同步 -->
<input v-model.number="age" />  <!-- 转 Number,转换失败保留原字符串 -->
<input v-model.trim="name" />   <!-- 去首尾空格 -->
```

不同控件的展开不一样,这点必须记清:

| 控件 | 绑定的 prop | 监听的事件 |
| --- | --- | --- |
| `input[type=text]` | `value` | `input` |
| `input[type=checkbox]` | `checked` | `change` |
| `select` | `value` | `change` |
| `textarea` | `value`(不是 `innerHTML`) | `input` |
| 自定义组件 | `modelValue` | `update:modelValue` |

组件上的 `v-model` 同理,换成 `modelValue` 与 `update:modelValue` 这一对名字。

`.number` 有一个边界:输入框清空时 `parseFloat('')` 是 `NaN`,Vue 会退回原始字符串 `''`,不会给你 `NaN`。这不是类型安全,校验还得自己做。

## 提交与校验

不管用哪个框架,提交都走原生表单,能白拿浏览器的校验、回车提交、密码管理器支持。

```js
async function onSubmit(e) {
  e.preventDefault()
  const form = e.currentTarget
  if (!form.reportValidity()) return   // 触发原生的 required / pattern 提示
  const data = Object.fromEntries(new FormData(form))
  await save(data)
}
```

`new FormData(form)` 会收集所有带 `name` 的控件,包括 `select` 和 `checkbox`(多选会拿到多个同名值,`Object.fromEntries` 只保留最后一个,多选要单独处理)。

校验时机也值得定一下:提交时全量校验,输入时只校验已出错或已填过的字段。每敲一个字就报错的表单,用户没法用。

## 三个具体的坑

**输入法组词**。中文输入时,拼音阶段也会触发 `input` 事件,受控输入会把拼音字母写进状态,出现「输入框里先是 pinyin 再变成汉字」的抖动。拦法是监听 `compositionstart` 与 `compositionend`,组词期间不往状态里写,组词结束再同步一次。`v-model` 内部已经处理了这条;自己手写受控输入、或在 React 里用 `onChange` 做实时搜索时才需要。

**数字输入**。`type="number"` 的 `value` 仍是字符串,而且 `Number('')` 是 `0`,不是 `NaN`,所以空输入框会被当成 0 提交,是接口层最常见的脏数据来源。转换前先判断:`value === '' ? null : Number(value)`。

**整表单全受控**。一个 40 个字段的表单,每敲一个字符触发 40 个字段的重渲染和校验。可行的做法是把字段拆成各自的子组件,或改成非受控、提交时统一读。

## 双向绑定要不要用

`v-model` 省的是样板代码,不是心智负担。它本质仍是「值向下、事件向上」,只是一个输入框的读写恰好都发生在同一处,合成一行更直观。

判断标准是:这个值除了当前组件还有没有别的读者。有(父级要拿去做联动、要提交、要重置),就该显式写成 props 加事件,或者干脆提到父级;没有,`v-model` 或本地 state 都行。

反过来,React 里也不必把所有输入都做成受控。一次性提交的地址表单、文件选择,非受控更省事。真正需要受控的是要即时反应的场景:搜索建议、字符计数、格式掩码、字段联动。

## 小结

- React 的 `value` 必须配 `onChange`,漏了就是只读输入框加警告;
- `v-model` 是 `:value` 加 `@input` 的语法糖,checkbox 与组件上的展开形式不同;
- 受控适合需要实时干预的字段,非受控适合大表单与一次性提交;
- 提交走原生表单,`FormData` 收集、`reportValidity` 触发原生校验;
- 中文输入要处理 composition 事件,空字符串转数字要单独判断。
