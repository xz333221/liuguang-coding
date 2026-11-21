---
title: 列表、条件渲染与 key
summary: '列表渲染的正确性几乎全压在 key 上：用索引当 key，删除中间项后框架会复用错位的 DOM，输入框内容与组件状态都留在原地。条件渲染则要分清销毁重建与隐藏显示，以及 0 被 && 渲染出来这类小坑。'
category: frontend
node: frontend-framework-render-list
order: 69
level: 入门
tags: [key, diff, 列表渲染, 条件渲染, v-if]
updated: 2026-11-19
mindmap: framework-render-list.mindmap.json
terms: []
sources:
  - title: React 官方文档 · 渲染列表
    url: https://zh-hans.react.dev/learn/rendering-lists
    note: key 的作用,以及为什么不应该用索引作为 key。
  - title: Vue 官方文档 · 列表渲染
    url: https://cn.vuejs.org/guide/essentials/list.html
    note: v-for 与 key 的维护提示,数组变更方法的处理。
  - title: Vue 官方文档 · 条件渲染
    url: https://cn.vuejs.org/guide/essentials/conditional.html
    note: v-if 与 v-show 的开销差异,v-if 与 v-for 的优先级说明。
---

上一节把副作用安排到了确定的时刻。日常代码里最高频的还是两件事：把数组渲染成一批元素，按条件决定某块要不要出现。这两处的坑集中在 `key`。

## 两种写法

```vue
<ul>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

```jsx
<ul>
  {items.map((item) => <li key={item.id}>{item.name}</li>)}
</ul>
```

React 不给 key 会打印 `Each child in a list should have a unique "key" prop` 的警告。

两边对「数组变了」的判定也不一样，这决定了你怎么改数据：

- Vue 3 用 `Proxy` 包裹数组，`push`、`splice`、`sort` 以及按下标赋值都会被拦截，改完直接触发更新；
- React 只比较引用，`push` 之后必须 `setList([...list, item])` 才会渲染，`sort` 也一样，要 `setList([...list].sort(cmp))`;
- 在 React 里对同一个数组 `sort` 后再传回去，原数组已经被改了，前后引用却相同，是最难查的一类「不更新」。

列表渲染的写法只有一两行，出错时却往往不在这一两行里，而在数据怎么变、key 怎么给。

Vue 不给 key 在多数场景能跑，因为默认按顺序比对，但列表一有删除和排序就会出问题。会动顺序的列表必须写。

## key 是同一性声明

key 不是给开发者看的标记，是告诉 diff 算法「前后两次渲染里，这两个节点是不是同一个东西」。

配对成功，复用 DOM 节点和组件实例，只更新变化的属性；配对失败，销毁旧的、创建新的。所以 key 决定的是状态归属：输入框里没提交的文字、滚动位置、子组件内部的 `count`，都跟着 key 走。

用索引当 key，等于声明「第 0 个位置上永远是同一个东西」，而数据里的「第 0 项」可能已经换人了。

## 索引 key 造成的错位

一个待办列表，每行带一个不受控的备注输入框。

```jsx
{rows.map((row, i) => (
  <div key={i}>
    <span>{row.text}</span>
    <input placeholder="备注" />
  </div>
))}
```

初始三行 A、B、C，用户在 A 行输入「先问价格」，然后删掉 A。渲染结果：

```text
删除前:  A[先问价格]   B[]        C[]
删除后:  B[先问价格]   C[]        (没有第三行)
```

`rows` 已经变成 B、C，但 DOM 只做了两件事：把第一行的文本改成 B，删掉第三行。第一行那个 `<input>` 是同一个 DOM 节点，值还在，于是「先问价格」挂到了 B 头上。

同样的错位在组件列表里表现为：展开状态、动画进度、内部计数器全部窜到相邻项。换成 `key={row.id}` 后，删除 A 时算法知道第一行不存在了，直接删掉它的 DOM,input 一起消失。

更隐蔽的一种是列表项自己发请求。组件实例被复用时，`onMounted` 与 `useEffect(..., [])` 都不会再跑，新数据不会拉取，界面上显示的还是上一行的内容——看起来像接口返回错了，其实是组件根本没换成新的。

| key 写法 | 什么时候可接受 | 后果 |
| --- | --- | --- |
| `item.id` | 默认选择 | 无 |
| `index` | 列表只追加，不删除不排序 | 删除、排序后状态错位 |
| `Math.random()` | 从不 | 每次全量销毁重建，输入失焦 |
| `item.name` | 名称全局唯一且不变 | 重名或改名时出问题 |

## diff 大致在做什么

同层比较，不跨层。父节点类型不同(比如 `div` 换成 `section`)，整棵子树销毁重建。列表这一层，框架用 key 建索引，找出「哪些能复用、哪些要新建、哪些要移动」。

React 在同一个父节点下用 key 与类型共同匹配；Vue 3 对未加 key 的片段做双端比较，对加了 key 的列表用最长递增子序列算出最小移动次数。具体算法不用背，由此推出的两条实践有用：

- 不要为了「结构更清晰」在列表项外面套一层随机变化的容器，那会让整列重建；
- 同一个列表里 key 必须唯一且稳定，不能用「值 + 索引」这种半稳定方案。

## 条件渲染

Vue 有两个指令，React 只有表达式。

```vue
<div v-if="visible">内容</div>
<div v-show="visible">内容</div>
```

```jsx
{visible && <div>内容</div>}
{visible ? <Heavy /> : <Light />}
```

`v-if` 是真的销毁与创建，切换时子组件的生命周期会重跑；`v-show` 只改 `display: none`，节点一直在 DOM 里。频繁开关用 `v-show`，条件稳定(比如权限、空状态)用 `v-if`。首次渲染时 `v-show` 的元素也会被创建，初始隐藏的复杂表单用它反而更慢。

三个具体的小坑。

**数字 0 会被渲染出来**。`&&` 返回的是左值本身，`0` 是合法子节点，于是 `{list.length && <List />}` 在长度为 0 时会在页面上渲染出一个 `0`。要写成 `{list.length > 0 && <List />}`，或者用三元表达式。

**Vue 3 里 `v-if` 优先级高于 `v-for`**。同一个元素上写 `<li v-for="u in users" v-if="u.active">`,`v-if` 拿不到循环变量 `u`，直接报错。先用 `computed` 过滤出 `activeUsers` 再循环。Vue 2 的优先级相反，迁移项目时这段要专门检查。

**在渲染中改状态**。列表项渲染时调用 `setState` 或修改响应式数据，轻则警告，重则无限循环。需要「渲染后修正」的逻辑，放到副作用里(第 12 章讲生命周期那篇)。

还有一类不是条件渲染的错，但常被归到一起：条件切换时组件被销毁，内部请求的 `abort` 没写，回来之后又往已经卸载的组件里写状态。React 18 不再因此报警告，数据被静默丢弃，看起来像「偶尔不更新」。清理函数照写，别指望框架兜底。

## 列表里的重计算

在 `map` 之前串一段 `filter` 加 `sort`，每次渲染都重排一遍。数据上千条时，这段会比 diff 本身贵。用 `useMemo` 缓存筛选与排序结果，依赖只写 `rows`;Vue 用 `computed`，它的缓存是自动的。另一个隐性开销是每次 `map` 都创建新的对象与内联函数传给子组件，包了 `memo` 也失效，要么把子组件需要的字段拆成原始值传，要么把回调提到外面。

行数上万时，优化方向不是让 diff 更快，而是减少节点数量。一屏能看 20 行，却渲染了两万个 `li`，布局与绘制的成本远大于 diff。虚拟滚动只渲染视口附近的一段，上下用空白撑开滚动条高度，把「渲染多少」从数据量里解耦出来。这类场景用现成组件比自己写稳，边界条件(动态行高、吸顶项、滚动锚定)很多。

## 小结

- `key` 声明的是节点同一性，决定 DOM 与组件状态归谁；
- 用索引当 key，删除与排序后状态会窜到相邻项，表现为输入内容错位、展开状态错乱；
- 列表 key 用稳定且唯一的业务 id，不要用随机数或索引组合；
- `v-if` 销毁重建，`v-show` 只切 `display`，按切换频率选；
- `length && ...` 在 0 时会渲染出字符 0，判断要写成显式比较。
