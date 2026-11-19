---
title: 响应式：媒体查询、移动优先与视口
summary: '响应式布局先声明 viewport 让移动端按设备宽度渲染,再用媒体查询在内容需要换行的位置切换布局。移动优先以单栏基础样式为起点,用 min-width 逐级增强;断点按内容断裂点选择,配合 fr、百分比与 clamp() 做流式尺寸,图片限制 max-width。'
category: frontend
node: frontend-css-responsive
order: 20
level: 入门
tags: [响应式, 媒体查询, viewport, 移动优先]
updated: 2026-11-19
mindmap: css-responsive.mindmap.json
terms: []
sources:
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: 媒体查询、视口单位与响应式相关属性。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: 响应式设计与媒体查询的入门讲解。
  - title: MDN CSS Grid
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout
    note: 用 Grid 轨道切换实现响应式栏数。
---

上一节用定位解决了吸顶与覆盖,这一节处理同一份布局如何适配不同宽度的屏幕。

## viewport meta

移动浏览器默认按约 980px 的布局视口渲染页面,再整体缩小显示,结果是文字很小、需要双击放大。加上下面这行声明,布局视口才等于设备宽度:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

width=device-width 表示布局视口跟随设备宽度,initial-scale=1 表示初始缩放比例为 1。缺少这一行时,媒体查询里的宽度值全部对不上实际屏幕。

## 媒体查询

媒体查询(media query)根据视口或设备特征应用一段样式,基本语法是 @media 加条件:

```css
@media (min-width: 48rem) {
  .layout {
    grid-template-columns: 220px 1fr;
  }
}
```

min-width 表示视口宽度大于等于该值时生效,max-width 表示小于等于该值时生效。多个条件用 and 连接,逗号表示或,not 取反。现代浏览器也支持区间语法,例如 @media (30rem <= width < 48rem) 表示宽度落在该区间时生效。

媒体查询写在样式表末尾更容易看出覆盖顺序。同优先级下,后出现的规则覆盖先出现的规则,断点交错时这一点会直接影响结果。

## 移动优先

移动优先(mobile first)先写最小屏幕的基础样式,再用 min-width 逐步增加列数或显示更多元素。

```css
.layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 48rem) {
  .layout {
    grid-template-columns: 220px 1fr;
  }
}

@media (min-width: 64rem) {
  .layout {
    grid-template-columns: 220px 1fr 240px;
  }
}
```

基础样式只有一列,768px 起变成两列,1024px 起变成三列。这种写法的优点是所有覆盖都是增强,移动端只会应用基础规则,不会被大屏声明反向覆盖;反过来用 max-width 写桌面优先,覆盖方向相反,维护时更容易出现遗漏。

## 断点怎么选

断点(breakpoint)应选在内容开始拥挤或出现异常换行的位置,不要照着设备型号写 375、414、768 这类数字。常见起点是:

- 640px 左右:单栏开始放得下两张卡片;
- 768px 左右:两栏布局可用;
- 1024px 左右:三栏或固定侧栏可用;
- 1280px 以上:限制内容最大宽度,避免行长过长。

用 rem 写断点能跟随用户调整的根字号,48rem 在默认 16px 下等于 768px。断点数量保持在三到四个,过多会让覆盖关系难以推理。

## 流式尺寸与 clamp()

除了在断点处跳变,尺寸本身也应该连续变化。常用手段:

- 宽度用百分比、fr 或 minmax(),让容器自己分配;
- 字号与间距用 clamp(最小值, 首选值, 最大值),例如 clamp(1.25rem, 2.5vw + 0.5rem, 2rem);
- 容器内边距用 min(5vw, 2rem),小屏不拥挤,大屏不过宽。

clamp() 返回三个参数中的中间值,首选值通常包含 vw,浏览器会在最小与最大之间连续插值。它适合标题字号这类需要随视口平滑变化的属性,正文仍应使用固定 rem,避免行长与字号同时变化。

## 图片与触控目标

图片默认按固有尺寸渲染,超出容器就会横向溢出。基础规则是:

```css
img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

display: block 去掉行内图片底部的基线空隙。需要按屏幕加载不同尺寸时,再用 srcset 与 sizes 提供候选图片,由浏览器根据像素密度与视口宽度选择。

触控目标的可点击区域建议不小于 44×44 CSS 像素。图标按钮除了视觉尺寸,还要用 padding 或 min-width、min-height 扩大命中区域,相邻元素之间保留至少 8px 间距,避免误触。

## 不要按设备型号判断

用 user agent 判断手机或平板会随着设备形态变化迅速失效,也不覆盖折叠屏与桌面窄窗口。应基于能力与视口判断:

- 布局变化用宽度媒体查询;
- 指针精度用 (pointer: coarse) 与 (hover: none),判断是否适合悬停交互;
- 新特性用 @supports 做特性检测。

## 从单栏到三栏

```html
<div class="page">
  <main>主内容</main>
  <aside class="side">侧栏</aside>
  <aside class="extra">推荐</aside>
</div>
```

```css
.page {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 16px;
}

@media (min-width: 48rem) {
  .page {
    grid-template-columns: minmax(0, 1fr) 240px;
  }
}

@media (min-width: 64rem) {
  .page {
    grid-template-columns: minmax(0, 1fr) 240px 220px;
  }
}
```

预期结果:窄屏单栏依次排列;768px 起主内容与侧栏并排;1024px 起三栏,推荐栏出现在右侧;超过 1280px 后内容居中,两侧留白增加。HTML 顺序保持主内容在前,窄屏阅读顺序与视觉顺序一致。

## 小结

- viewport meta 让布局视口等于设备宽度,是响应式生效的前提;
- 媒体查询用 min-width 做移动优先的逐级增强,覆盖方向清晰;
- 断点按内容断裂点选择,数量控制在三到四个;
- 尺寸用 fr、百分比与 clamp() 连续变化,减少断点间的突变;
- 图片限制 max-width: 100%,触控目标不小于 44×44 像素;
- 按视口与能力判断,不要按设备型号写分支。
