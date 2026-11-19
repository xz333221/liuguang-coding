---
title: 容器查询、subgrid 与逻辑属性
summary: '容器查询让组件按自身容器宽度切换布局,不再依赖视口;subgrid 让嵌套网格继承父网格的轨道,实现跨卡片对齐;逻辑属性用 inline 与 block 描述方向,自动适配书写模式;aspect-ratio、flex 中的 gap 与 :has() 进一步减少布局代码。新特性应配合 @supports 做渐进增强。'
category: frontend
node: frontend-css-modern-layout
order: 21
level: 入门
tags: [容器查询, subgrid, 逻辑属性, aspect-ratio]
updated: 2026-11-19
mindmap: css-modern-layout.mindmap.json
terms: []
sources:
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: 容器查询、逻辑属性与 aspect-ratio 的规范说明。
  - title: MDN CSS Grid
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout
    note: subgrid 与网格轨道继承的用法。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: 现代布局特性与渐进增强的讲解。
---

上一节的媒体查询按视口宽度切换布局;当同一个组件需要放进侧栏或主区域时,按视口判断就不够用了。

## 容器查询

容器查询(container query)让元素根据最近的查询容器的尺寸应用样式。先声明容器,再写 @container 条件:

```css
.card-list {
  container-type: inline-size;
  container-name: cards;
}

@container cards (min-width: 30rem) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
  }
}
```

container-type: inline-size 表示在行内方向建立尺寸查询上下文,容器宽度由外部布局决定,不能由内容反向撑开。容器名可选,不写时匹配最近的查询容器。

媒体查询看视口,容器查询看组件所在的那块空间。同一个卡片组件放进 240px 侧栏时保持纵向排列,放进 800px 主区域时自动变成横向,组件内部不需要知道页面结构。这是组件化布局最直接的变化。

## subgrid

嵌套网格默认拥有独立的轨道,卡片内部的行无法与相邻卡片对齐。subgrid 让子网格直接使用父网格的轨道:

```css
.page {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 8px 24px;
}

.section {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
}

.section > h2 {
  grid-column: 1;
}

.section > p {
  grid-column: 2;
}
```

section 横跨父网格的两列,并把这两列作为自己的轨道,内部元素因此与页面其他内容对齐。subgrid 也可以用于行方向:grid-template-rows: subgrid,常用于卡片标题、正文、按钮三行在所有卡片间对齐。

subgrid 要求子网格在对应轴上跨越多个父轨道,且不能同时在该轴上定义固定轨道尺寸。

## 逻辑属性

逻辑属性(logical properties)用书写模式的起点与终点描述方向,代替 top、left 这类物理方向。horizontal-tb 书写模式下,inline 轴水平、block 轴垂直;切换到 vertical-rl 或阿拉伯语等从右到左的语言时,逻辑属性自动跟随。

```css
.note {
  margin-inline: auto;
  padding-block: 1rem;
  border-inline-start: 4px solid #3b82f6;
  inset-inline-start: 0;
}
```

以上声明等价于水平书写模式下的左右 margin 自动、上下 padding、左侧边框与左侧偏移,但在从右到左的语言里会镜像到右侧。常用映射:

- margin-inline 与 margin-block 对应水平与垂直外边距;
- padding-inline 与 padding-block 对应内边距;
- inset-inline 与 inset-block 对应定位偏移;
- border-inline-start 对应书写起点方向的边框。

新代码优先使用逻辑属性,尤其是可能国际化的组件。

## aspect-ratio

aspect-ratio 直接声明宽高比,浏览器据此推导缺失的一边:

```css
.thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
```

过去用 padding-top: 56.25% 维持比例,需要额外的定位包裹层;aspect-ratio 一行完成。配合 object-fit: cover,图片填满比例框并裁掉溢出部分。元素同时设置 width 与 height 时,aspect-ratio 被忽略。

## flex 中的 gap 与 :has()

gap 在 Flex 容器中已经可用,行内项目之间不需要再用 margin 拼间距。它同样只作用于项目之间,容器两端不留额外空间。

:has() 让选择器根据后代或兄弟是否存在来匹配,可以省掉由脚本添加的状态类:

```css
.card:has(> img) {
  grid-template-columns: 120px 1fr;
}

.field:has(input:invalid) {
  border-color: #dc2626;
}

.page:has(.sidebar) .main {
  max-width: 72rem;
}
```

第一条让带图片的卡片自动切换为横向布局,第二条在输入无效时给整个字段加边框。:has() 的匹配成本高于普通选择器,不要写在频繁变动的深层结构上,也不要用它承担必须由脚本保证的业务逻辑。

## 渐进增强

上述特性在现代浏览器中已有支持,但用户环境并不统一。用 @supports 做特性检测,先写可用的基础样式,再增强:

```css
.card {
  display: block;
}

@supports (container-type: inline-size) {
  .card-list {
    container-type: inline-size;
  }
  @container (min-width: 30rem) {
    .card {
      display: grid;
      grid-template-columns: 120px 1fr;
    }
  }
}
```

基础样式保证旧浏览器仍能阅读,增强样式只在支持时生效。要点是增强不能破坏内容顺序与可访问性,隐藏、重排这类改动需要谨慎。

版面问题到这里基本覆盖。下一章进入 CSS 进阶,从自定义属性与主题切换开始,再讨论 @layer 的隔离、过渡与动画、transform 与合成,最后落到样式如何组织。

## 小结

- 容器查询按组件容器宽度切换布局,适合复用在不同栏宽里的组件;
- subgrid 让嵌套网格继承父网格轨道,解决跨卡片对齐;
- 逻辑属性用 inline 与 block 描述方向,自动适配书写模式;
- aspect-ratio 一行维持比例,flex 中的 gap 与 :has() 减少额外标记;
- 新特性配合 @supports 渐进增强,基础样式必须先可用。
