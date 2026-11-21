---
title: 样式架构：BEM、CSS Modules 与原子化
summary: '样式架构处理命名冲突、覆盖顺序与复用边界：BEM 用命名约定隔离，CSS Modules 在构建期生成局部类名，原子化用固定工具类减少新增 CSS；设计令牌与 @layer 是三者共同的底座。'
category: frontend
node: frontend-css-architecture
order: 27
level: 进阶
tags: [CSS, BEM, CSS Modules, Tailwind]
updated: 2026-11-19
mindmap: css-architecture.mindmap.json
terms: [namespace]
sources:
  - title: MDN · CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: 层叠、继承与选择器权重的基础定义。
  - title: CSS Modules 规范
    url: https://github.com/css-modules/css-modules
    note: 局部作用域、composes 与 :global 的约定。
  - title: Tailwind CSS 文档
    url: https://tailwindcss.com/docs
    note: 工具类、设计令牌与构建期扫描的组织方式。
---

上一篇的选择器解决单条规则匹配谁，当项目有几十个组件时，更麻烦的问题是规则怎么组织才不互相影响；这一篇讨论样式架构。

## 三个基本问题

全局 CSS 只有一个命名空间，后加载的规则可能覆盖前面的规则；组件之间共享样式时缺少明确边界；删掉一条规则前无法确认它是否还在使用。命名约定、构建期作用域、原子类，分别从不同方向处理这三个问题。

## BEM

BEM 把类名拆成 Block、Element、Modifier 三段：

```html
<article class="card card--featured">
  <h2 class="card__title">标题</h2>
  <a class="card__link card__link--muted" href="#">详情</a>
</article>
```

```css
.card { border: 1px solid #d0d7de; border-radius: 8px; }
.card--featured { border-color: #2f6fed; }
.card__title { margin: 0 0 8px; font-size: 18px; }
.card__link { color: #2f6fed; }
.card__link--muted { color: #57606a; }
```

约定三条：

- Element 只挂一层，`card__title` 不再派生 `card__title__icon`，图标另起一个 Block 或在父级加类；
- Modifier 只改外观，不改变结构，`card--featured` 仍是一个 card;
- 所有类名带 Block 前缀，天然减少全局冲突。

BEM 不需要构建工具，缺点是类名长，且完全依赖团队执行约定。

## CSS Modules

CSS Modules 在构建期把类名改写为带哈希的局部名称，源文件里的类只在当前模块可见：

```css
/* button.module.css */
.base {
  padding: 8px 16px;
  border-radius: 8px;
}

.primary {
  composes: base;
  background: #2f6fed;
  color: #ffffff;
}
```

```js
import styles from './button.module.css'

export function Button({ children }) {
  return <button className={styles.primary}>{children}</button>
}
```

`composes` 把 `base` 的类名一起加到元素上，得到类似 `button_primary__x1 base__y2` 的结果，不是选择器嵌套。`:global(.legacy)` 可以声明不受改写的全局类。TypeScript 需要为 `*.module.css` 提供类型声明，否则导入会报错。

CSS Modules 解决命名冲突，不解决覆盖顺序；它生成的类名权重相同，顺序仍由打包结果决定。把模块样式放进 `@layer components`，覆盖关系会更可控。

## 原子化

原子化(utility-first)把样式拆成单一职责的类，HTML 直接组合：

```html
<button class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  保存
</button>
```

优点是新增界面通常不需要新增 CSS，间距与颜色来自同一套令牌；缺点是标签变长，复杂组件需要抽成模板或组件。取舍点：

- 设计系统稳定、页面重复度高时，原子化收益明显；
- 高度定制的视觉、复杂状态组合，纯工具类可读性差，应封装组件；
- 动态拼接类名时必须产生完整字符串，`bg-${color}-600` 这类运行期拼接不会被扫描到，改用映射表。

`@apply` 可以把工具类收进自定义类，少量使用可以，大量使用会退回传统 CSS 的组织问题。

## CSS-in-JS 的代价

运行期 CSS-in-JS 在组件渲染时生成样式并注入 `<style>`，每次渲染都有额外计算，服务端渲染还要处理样式提取与 hydration 顺序。零运行期方案把样式在构建期抽出，代价转移到构建工具。选型时先确认是否需要主题的动态计算，不需要就优先构建期方案。

## 设计令牌与目录结构

三种方案都依赖同一套令牌。把令牌、重置、基础样式、组件样式、工具类分层：

```text
src/styles/
  tokens.css        # 颜色、间距、字号、圆角
  reset.css         # 盒模型与默认样式归零
  base.css          # 元素级基础样式
  components/       # 组件样式或 *.module.css
  utilities.css     # 少量工具类
```

```css
@layer reset, base, components, utilities;
@import url("./reset.css") layer(reset);
@import url("./base.css") layer(base);
@import url("./utilities.css") layer(utilities);
```

导入顺序与层声明一致，组件样式无论从哪里加载都落在 `components` 层。新增第三方库时包进 `vendor` 层，不参与组件权重竞争。

## 避免全局污染

- 组件样式优先使用局部作用域(CSS Modules)或 BEM 前缀；
- 避免在组件里写元素选择器与 `#id`，它们的权重高且作用范围不可控；
- 不使用 `!important` 解决覆盖，改用 `@layer` 调整顺序；
- 全局样式只保留 reset、基础排版与令牌，其余进入组件；
- 删除样式前用构建产物或覆盖率工具确认引用，不要凭印象清理。

## 从样式到逻辑

样式架构确定表现层的边界，交互、状态与数据仍要由 JavaScript 承担。下一章从语言核心开始，先看类型、作用域与闭包这些决定代码行为的基础。

## 小结

- 全局 CSS 只有一个命名空间，冲突要靠命名约定、构建期作用域或原子类解决；
- BEM 用 Block、Element、Modifier 三层命名，零工具成本，依赖约定；
- CSS Modules 在构建期生成局部类名，`composes` 组合而非嵌套；
- 原子化减少新增 CSS，代价是标签变长与动态类名限制；
- 运行期 CSS-in-JS 有渲染开销，能用构建期方案就用构建期方案；
- 令牌、`@layer` 与清晰的目录结构是三种方案共同的底座。
