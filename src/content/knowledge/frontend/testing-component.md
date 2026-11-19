---
title: 组件测试：Testing Library
summary: '组件测试在 jsdom 里渲染真实 DOM,验证的是用户能看到和做到的事:输入、点击、出现什么文案。查询按无障碍语义走,getByRole 优先,class 名与 data-testid 是兜底。交互用 userEvent,它按真实顺序派发键盘与指针事件;异步等待交给 findBy 与 waitFor,别把点击塞进 waitFor 里,回调会被反复执行。'
category: frontend
node: frontend-testing-component
order: 93
level: 进阶
tags: [Testing Library, 组件测试, userEvent, 无障碍查询]
updated: 2026-11-19
mindmap: testing-component.mindmap.json
terms: []
sources:
  - title: Testing Library · About Queries
    url: https://testing-library.com/docs/queries/about
    note: getBy/queryBy/findBy 的区别与查询优先级排序。
  - title: Testing Library · user-event
    url: https://testing-library.com/docs/user-event/intro
    note: userEvent 与 fireEvent 的差别,以及 v14 的异步 API。
  - title: Testing Library · Appearance and Disappearance
    url: https://testing-library.com/docs/guide-disappearance
    note: findBy 与 waitFor 的正确用法和常见误用。
---

上一篇的单元测试把组件当成一个函数,给 props 要输出。真实组件没这么干净:输入框受控、按钮点两次会重复提交、请求失败要显示重试。这些只能渲染出来点一遍才算数,而组件测试就是在 jsdom 里做这件事。

## 它测的是用户能操作的部分

渲染真实 DOM,用查询找到元素,派发事件,再断言屏幕上出现了什么。不关心内部 state 叫什么、用了哪个 hook、渲染了几次。这条原则写在 Testing Library 的文档第一页: 测试越接近用户使用软件的方式,能给出的信心越多。

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBox } from './SearchBox'

it('输入关键词后展示匹配结果', async () => {
  const user = userEvent.setup()
  render(<SearchBox onSearch={async () => ['苹果', '香蕉']} />)

  await user.type(screen.getByRole('searchbox', { name: '搜索商品' }), '水果')
  await user.click(screen.getByRole('button', { name: '搜索' }))

  expect(await screen.findByRole('list', { name: '搜索结果' })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
})
```

这段代码里没有一个 class 名、没有一个 state 字段。把 `SearchBox` 从 `useState` 换成 `useReducer`,或者把内部的 div 换成 section,测试照样绿。这就是它值钱的地方。

`render` 返回的 `container` 留着急需时用,平时用 `screen`。`screen` 绑定的是 `document.body`,在测试文件里不必把一个巨大的对象解构来解构去。

## 查询的优先级

| 查询 | 找的是 | 什么时候用 |
| --- | --- | --- |
| `getByRole` | 无障碍角色加可访问名称 | 首选,按钮、链接、输入框、列表 |
| `getByLabelText` | 表单控件的 label | 表单字段 |
| `getByPlaceholderText` | placeholder | 没有 label 时的退让 |
| `getByText` | 元素的文本内容 | 提示文案、段落 |
| `getByDisplayValue` | 输入框当前值 | 断言已填入的内容 |
| `getByAltText` | `img` 的 alt | 图片 |
| `getByTitle` | `title` 属性 | 很少用,可访问性差 |
| `getByTestId` | `data-testid` | 以上都不行时的兜底 |

`getByRole` 排第一不是因为好看,是因为它顺带验证了一件事: 这个元素在无障碍树里有正确的角色。写 `<div onClick>` 当按钮用的代码,在 `getByRole('button')` 这里就查不到,问题在测试阶段就暴露了。

前缀决定找不到时的行为,三个都要会用:

| 前缀 | 找不到时 | 用来断言 |
| --- | --- | --- |
| `getBy` | 立刻抛错 | 元素存在 |
| `queryBy` | 返回 `null` | 元素不存在 |
| `findBy` | 返回 Promise,超时后 reject | 元素异步出现 |

断言「不该出现」只能用 `queryBy`,写 `expect(screen.getByText('加载中')).not.toBeInTheDocument()` 会因为先抛错而失败。

## getByRole 的 name

`name` 匹配的是可访问名称,不是 `name` 属性。按钮取文本内容,输入框取关联的 label,图片取 alt。可以是字符串、正则,或者用 `{ exact: false }` 放松。按钮文案带图标时中间会有空格,写 `{ name: /保存/ }` 比抠空格稳。`<dialog aria-labelledby="title-1">` 这种,`name` 取的是被引用标题的文本,不是 id。

元素重复时先缩小范围,再查:

```tsx
import { within } from '@testing-library/react'

const dialog = screen.getByRole('dialog', { name: '确认删除' })
await user.click(within(dialog).getByRole('button', { name: '确定' }))
```

列表里每个条目都有「删除」按钮时,也可以用 `getAllByRole('button', { name: '删除' })[2]`,但下标一改顺序就错,能用 `within` 定位到行就用 `within`。

## userEvent 与 fireEvent

`fireEvent` 直接派发一个 DOM 事件。`fireEvent.change(input, { target: { value: 'abc' } })` 把值设上去,派发一次 `change`,中间没有按键、没有焦点、也不检查元素是不是被禁用。

`userEvent` 按真实顺序走一遍: `type` 会逐字符触发 `keydown`、`beforeinput`、`input`、`keyup`,`click` 会先检查 `pointer-events` 和可见性,再移动焦点。

```tsx
// 只派发一个事件,适合验证某个具体的事件处理器
fireEvent.change(input, { target: { value: 'abc' } })

// 模拟用户操作,默认选这个
const user = userEvent.setup()
await user.type(input, 'abc')
await user.tab()
await user.keyboard('{Enter}')
```

v14 起所有 API 都是异步的,`setup()` 要在 `render` 之后、操作之前调用一次。忘了 `await` 不会报错,但断言会在输入生效之前执行,结果是随机的红绿。

`fireEvent` 还有一个用处: 测那些 `userEvent` 模拟不出来的场景,比如直接派发一个 `scroll`、或者往 `window` 上发自定义事件。常规交互一律用 `userEvent`。

## 异步等待

请求返回后组件才更新,断言要等。`findBy` 就是 `getBy` 加 `waitFor`,默认超时 1000 毫秒。

```tsx
// 正确:动作只做一次,等待交给 findBy
await user.click(screen.getByRole('button', { name: '保存' }))
expect(await screen.findByText('已保存')).toBeInTheDocument()
```

`waitFor` 的回调会被反复执行,直到不抛错或超时。所以它里面不能有副作用:

```tsx
// 误用:回调重试,点击可能执行好几次
await waitFor(() => {
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(screen.getByText('已保存')).toBeInTheDocument()
})
```

第一次点击没生效,回调再来一次;如果组件是幂等的还好,如果是「加入购物车」,商品数量就翻倍了。动作放外面,`waitFor` 里只留断言。

另一种误用是把超时当修复: 本地跑 `waitFor(..., { timeout: 5000 })` 才绿,说明有个请求慢或者少了一次 await,加大超时只是把问题藏起来。CI 上机器更慢,该红还是红。

同步就能查到的元素不需要 `waitFor`,直接 `getBy`。

## 不该断言的东西

- class 名: `expect(el).toHaveClass('btn-primary')` 改一次样式就红,而且它不表达任何用户可见的行为;
- 组件内部的 state 或 hook 调用次数: 这是实现,换写法就废;
- i18n 的 key: 用户看到的是翻译后的文案,不是 `common.save`;
- 快照化的整段 HTML: 见第 16 章讲单元测试那篇,没人 review 得快照等于没有。

该断言的是: 元素在不在、文案对不对、是不是禁用、`aria-invalid` 有没有设、请求带没带上正确的参数。

```tsx
// 脆弱:绑在样式上
expect(container.querySelector('.btn-primary')).toBeTruthy()

// 稳定:绑在语义与状态上
const submit = screen.getByRole('button', { name: '提交' })
expect(submit).toBeDisabled()
expect(screen.getByLabelText('邮箱')).toHaveAttribute('aria-invalid', 'true')
```

## 几个常见的坑

- 自动清理没生效: Testing Library 靠全局的 `afterEach` 注册 `cleanup`。Vitest 里如果没开 `globals: true`,前一个用例的 DOM 会留在 `document.body` 里,`getByText` 报「找到多个元素」。要么开 globals,要么在 setup 文件里手动 `afterEach(cleanup)`。
- 断言写在 `await` 前: `expect(screen.getByText('已保存'))` 在点击之后立刻执行,组件还没重新渲染。
- `getByText` 查不到: 文本被拆进了多个元素,或者中间有 `<span>`。改用 role 加 name,或给容器上加 `data-testid`。
- 用 `getByTestId` 起手: 一开始就全用 testid,等于放弃了「角色正确」这条免费检查。
- 测试里没装 jest-dom: 报 `toBeInTheDocument is not a function`。Vitest 里在 setup 文件加一行 `import '@testing-library/jest-dom/vitest'`。

## 小结

- 组件测试渲染真实 DOM,验证用户看得到、做得到的事;
- 查询按 `getByRole` → `getByLabelText` → `getByText` 的顺序降级,`data-testid` 是兜底;
- `getBy` 断言存在,`queryBy` 断言不存在,`findBy` 等异步出现;
- 常规交互用 `userEvent`,它按真实事件顺序走,并且是异步的;
- `waitFor` 里只放断言,放动作会被重试;
- 断言语义与状态,不断言 class 名和内部 state。
