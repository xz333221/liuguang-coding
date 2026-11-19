---
title: 组件库与样式方案：CSS Modules / Tailwind / CSS-in-JS
summary: 'CSS Modules 靠构建期哈希拿到局部作用域 :global 是唯一的出口;Tailwind 的 JIT 扫描源码文本按需生成类,动态拼接的类名扫不到;运行期 CSS-in-JS 每次渲染都要序列化样式,零运行时的 vanilla-extract 把它挪到构建期。'
category: frontend
node: frontend-style-solution
order: 80
level: 进阶
tags: [CSS Modules, Tailwind, CSS-in-JS, 组件库]
updated: 2026-11-19
mindmap: style-solution.mindmap.json
terms: []
sources:
  - title: CSS Modules 规范
    url: https://github.com/css-modules/css-modules
    note: 局部作用域、composes 与 :global 的约定。
  - title: Tailwind CSS 文档
    url: https://tailwindcss.com/docs
    note: 工具类、内容扫描与按需生成的工作方式。
  - title: vanilla-extract 文档
    url: https://vanilla-extract.style/
    note: 构建期生成静态 CSS 的零运行时方案。
---

上一篇把取值收进了令牌,但令牌只是数据,还得决定它以什么形式进入组件。第 5 章讲样式架构那篇讨论过 BEM、CSS Modules 与原子化在命名冲突上的取舍,那一篇站在写样式的人这边;这一篇站在交付这边: 组件库怎么把样式发出去,宿主应用又怎么安全地盖掉它。

## 三种交付形态

| 形态 | 产物 | 换主题 | 被覆盖时 |
| --- | --- | --- | --- |
| 纯 CSS 文件 | 一份 `.css`,类名裸露 | 靠 CSS 变量 | 谁的权重高谁赢 |
| CSS Modules | 编译后带哈希的类名 | 只能改变量 | 类名不可预知,基本改不动 |
| CSS-in-JS | 运行期注入 `<style>` 或构建期抽出 `.css` | 主题对象 / 变量 | 看生成顺序 |

前两种的差别不在语法,在边界。纯 CSS 的组件库把 `.btn` 交给全世界,好用但一定被覆盖;CSS Modules 的组件库把类名收成 `Button_root__a1b2c`,安全但也基本不可定制,所以它必须同时暴露一组 CSS 变量,否则使用者只剩 `!important` 一条路。

## CSS Modules 的局部作用域

```css
/* tabs.module.css */
.tabs {
  display: flex;
  gap: var(--space-2);
}

.tabItem {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
}

/* 需要改第三方组件内部结构时, 唯一的出口 */
.tabs :global(.tabs-nav) {
  margin: 0;
}
```

```js
import styles from './tabs.module.css'

export function Tabs({ items }) {
  return (
    <div className={styles.tabs}>
      <div className="tabs-nav">...</div>
    </div>
  )
}
```

`:global` 只影响它包住的那一段选择器。`.tabs :global(.tabs-nav)` 是「本模块的 tabs 里的全局 tabs-nav」,而 `:global(.tabs) .tabs-nav` 是「全局的 tabs 里的本模块 tabs-nav」,两者作用对象完全不同,写反了样式一条都不生效。

另外两点常被忽略:

- CSS Modules 只哈希类名。`.tabs button {}` 里的 `button` 仍是全局元素选择器,权重还比类名高,这类规则会在别处引发覆盖,尽量别写。
- 哈希值受文件路径与构建配置影响,生产与开发环境不一样。任何依赖类名做端到端测试选择器的地方,一律改用 `data-testid`。

## Tailwind 的原子类与 JIT

JIT(just-in-time)的意思不是「运行时生成」,而是构建时扫描源码里的候选类名,只生成用到的那部分。扫描对象是纯文本,所以类名必须完整地出现在源码里。

```html
<div class="grid gap-2 rounded-lg border border-gray-200 bg-[var(--color-surface)] p-4">
  <button class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
    保存
  </button>
</div>
```

```js
// 错误: 拼接出来的类名不会被扫描到
const cls = `bg-${tone}-600`

// 正确: 完整字符串写成映射表
const toneBg = {
  danger: 'bg-red-600',
  primary: 'bg-blue-600',
  neutral: 'bg-gray-100',
}
```

第一个坑是动态拼接。构建工具在源码里找不到 `bg-red-600` 这个字面量,对应的规则就不会生成,页面上那一块完全没有背景色,而控制台没有任何报错。

第二个坑是内容来源。类名来自 CMS、数据库或另一个包的源码时,扫描不到同样的结果。Tailwind 4 用 `@source` 补充扫描路径,3.x 用 `content` 数组,漏配的目录不会报错,只会缺样式。

第三个坑是设计令牌两套。`bg-blue-600` 写死在标签里,换品牌色就得全库替换;正确做法是把色板映射成语义工具类,或者用任意值直接读令牌 `bg-[var(--tone-accent)]`,和上一篇的 `--tone-*` 接上。

`@apply` 可以把一长串工具类收进自定义类,少量用于第三方组件覆盖可以接受,大量使用会把原子化的收益重新吐回去。

## 运行期 CSS-in-JS 的代价

styled-components、emotion 这类方案在组件渲染时把 props 序列化成样式字符串,再插进 `<style>`。开销与组件实例数成正比,不是固定成本:

- 首次渲染要为每个样式生成哈希、拼 CSS 文本、插入样式表;
- 服务端渲染还要抽出关键 CSS,并在 hydration 时保证注入顺序与客户端一致,顺序错了就是样式闪烁;
- 主题切换要遍历所有已注册的样式重新求值。

需要样式值在 JS 里可读、需要强类型主题时,把这些工作挪到构建期。vanilla-extract 的写法是 `.css.ts` 文件,构建产物是静态 CSS,组件只拿到类名:

```ts
// theme.css.ts — 契约定义形状, 两个主题各填一份
import { createTheme, createThemeContract } from '@vanilla-extract/css'

export const vars = createThemeContract({
  color: { accent: null, surface: null, text: null },
  space: { sm: null, md: null },
})

export const light = createTheme(vars, {
  color: { accent: '#2f6fed', surface: '#f6f8fa', text: '#1f2328' },
  space: { sm: '4px', md: '8px' },
})

// button.css.ts — 消费 vars, 构建产物是静态 CSS
import { style } from '@vanilla-extract/css'
import { vars } from './theme.css'

export const button = style({
  background: vars.color.accent,
  color: '#ffffff',
  borderRadius: '8px',
  padding: `${vars.space.sm} ${vars.space.md}`,
})
```

`createThemeContract` 定义变量形状,`createTheme` 填值。换主题就是切换 `light` 与 `dark` 两个类名,运行期零计算,且主题结构由 TypeScript 保证——少一个键编译就报错。

代价也要说清: 构建链更重,样式与组件同仓耦合,产物里带哈希文件名,增量构建比纯 CSS 慢。

## 覆盖第三方组件

宿主应用最常见的诉求是「这个库的按钮我要改一下」。按可靠性从高到低:

1. **改它暴露的 CSS 变量**。文档里有 `--btn-bg` 这类变量的,直接在容器上覆盖,权重问题不存在。
2. **用 `:where()` 把权重归零**,再叠自己的类。

```css
@layer vendor, app;

@import url("./vendor.css") layer(vendor);

@layer app {
  /* :where() 权重为 0, 整条选择器只靠 .primary 的 (0,1,0) */
  :where(.btn).primary {
    background: var(--color-accent);
    border-color: transparent;
  }
}
```

3. **实在压不住再提权重**。`!important` 是可以用的,但要写进 `@layer` 之外的独立文件,并在注释里写清原因,否则下一个人会再叠一个 `!important`。

不用 `#id` 也不用元素选择器去提高权重。那类选择器权重高但作用范围不可控,一个 `#app .btn` 会顺带改掉所有页面里的按钮。

## 选型判断

- 团队已有完整设计系统,需要严格的多主题与暗色 → CSS 变量 + CSS Modules,交付一份可被覆盖的语义变量表。
- 页面数量多、重复度高、视觉定制少 → Tailwind,收益来自「不加新 CSS」。
- 需要 JS 读取样式值、需要类型安全的主题 → vanilla-extract 这类构建期方案。
- 运行期 CSS-in-JS 只留给「样式必须由运行时数据算出且量很大」的场景,普通业务页面不划算。

## 小结

- 三种方案的差别在交付边界: 纯 CSS 好覆盖,Modules 安全但不可改,CSS-in-JS 灵活但有运行期成本;
- CSS Modules 只哈希类名,元素选择器与 `id` 仍是全局的,`:global` 是唯一出口;
- Tailwind 按源码文本扫描生成,类名必须是完整字面量,内容来源要显式配置;
- 运行期 CSS-in-JS 的成本随组件数增长,SSR 还要处理注入顺序;
- 零运行时方案把样式计算挪到构建期,代价是构建链变重;
- 覆盖第三方组件的顺序是改变量 → `:where()` 加 `@layer` → `!important`;
