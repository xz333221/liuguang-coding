---
title: Grid：轨道、区域与自动布局
summary: 'Grid 用 grid-template-columns 与 grid-template-rows 定义行轨道和列轨道,fr 按比例分配剩余空间,repeat、minmax、auto-fit 减少重复声明,gap 控制间距。命名区域把版面写成 ASCII 图,自动放置负责填满剩余格子,二维布局比 Flex 更直接。'
category: frontend
node: frontend-css-grid
order: 18
level: 入门
tags: [Grid, fr, grid-template-areas, 自动布局]
updated: 2026-11-19
mindmap: css-grid.mindmap.json
terms: []
sources:
  - title: MDN CSS Grid
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_grid_layout
    note: 轨道、fr 单位、命名区域与自动放置的完整参考。
  - title: web.dev Learn CSS
    url: https://web.dev/learn/css
    note: Grid 布局模式的入门讲解。
  - title: MDN CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: grid-template-columns、minmax 与 auto-fit 的取值定义。
---

上一节的 Flexbox 适合一行或一列内的分配;当版面同时有行和列,例如带侧栏的页面骨架,Grid 更直接。

## 显式网格:列、行与轨道

给元素设置 display: grid 后,它是一个 Grid 容器。grid-template-columns 与 grid-template-rows 定义显式网格的列轨道与行轨道,轨道(track)就是行或列占据的那一条空间,直接子元素默认按顺序填进格子,从左到右、从上到下。

## fr 单位

fr 表示剩余空间的一份。分配时先扣除固定轨道与 gap,剩下的空间再按 fr 的比例分给弹性轨道。

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
}
```

容器宽 800px、gap 为 0 时,侧栏固定 200px,主内容得到 600px。把列改成 1fr 2fr,主内容得到剩余空间的 2/3。

fr 与百分比的区别在于:百分比按容器总宽计算,容易与 gap 相加超过 100%;fr 只分配剩余空间,不会溢出。内容很长时弹性轨道也可能被撑破,此时用 minmax(0, 1fr) 作为轨道尺寸,允许轨道收缩到内容宽度以下。

## repeat、minmax 与 auto-fit

重复的轨道用 repeat() 简化,例如 grid-template-columns: repeat(3, 1fr) 声明三个等宽列。

minmax(最小值, 最大值) 定义轨道的伸缩范围。它与 auto-fit 组合可以做卡片自适应:

```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```

auto-fit 按容器宽度尽量多放轨道,空轨道会被折叠;auto-fill 保留空轨道,两者在项目数量不足时表现不同。minmax(220px, 1fr) 保证每张卡片不小于 220px,剩余空间平分给已有轨道。容器宽 700px 时排三列,宽 460px 时排两列,不需要媒体查询。

## gap

gap 同时设置行间距与列间距,gap: 16px 等价于 row-gap: 16px 与 column-gap: 16px。它只作用于轨道之间,不会在容器边缘额外增加留白,这比用 margin 处理间距更可控。

## 命名区域

grid-template-areas 用字符串画出区域图,每行字符串的单词数必须与列数一致,相同名字的相邻格子合并成一个矩形区域,点号表示空格子。

```css
.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
  gap: 12px;
}
```

子元素用 grid-area 引用名字:

```css
.page > header { grid-area: header; }
.page > aside  { grid-area: sidebar; }
.page > main   { grid-area: main; }
.page > footer { grid-area: footer; }
```

区域必须是矩形,写成 L 形会在解析时失效。

## 线与跨度定位

不命名区域时,可以用网格线编号定位。列线从 1 开始,有 n 列就有 n+1 条线,负值从末尾倒数。

```css
.featured {
  grid-column: 1 / 3;
  grid-row: 2 / 4;
}
.span-two {
  grid-column: span 2;
}
```

grid-column: 1 / 3 表示从第 1 条列线到第 3 条列线,跨两列。span 2 表示跨两列但不指定起点,由自动放置决定位置。

## 自动放置

没有显式定位的项目由自动放置算法填入空格。grid-auto-flow 默认 row 逐行填充,设为 column 逐列填充,dense 回填前面留下的空洞,可能改变视觉顺序。

隐式轨道由 grid-auto-rows 与 grid-auto-columns 定义。项目数量超过显式网格时,新行按 grid-auto-rows 的尺寸生成,例如 grid-auto-rows: minmax(120px, auto)。

dense 会改变阅读顺序与键盘焦点顺序,正文内容不建议使用,图片墙这类无顺序要求的场景可以接受。

## 页面骨架

把前面的区域声明组成完整示例:

```html
<div class="page">
  <header>页头</header>
  <aside>侧栏</aside>
  <main>主内容</main>
  <footer>页脚</footer>
</div>
```

```css
.page {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
  gap: 12px;
}
.page > header { grid-area: header; }
.page > aside  { grid-area: sidebar; }
.page > main   { grid-area: main; min-width: 0; }
.page > footer { grid-area: footer; }
```

预期结果:页头与页脚横跨两列,中间一行左侧 220px 侧栏、右侧主内容占满剩余宽度;容器高度不足一屏时,中间行被 1fr 拉伸,页脚贴底。窗口变窄时,用一条媒体查询把 grid-template-columns 改成 1fr、并把区域图改成单列即可,下一节会系统处理响应式。

## Grid 还是 Flex

判断依据是维度:

- 需要同时控制行与列,或希望子项对齐到同一组轨道,用 Grid;
- 只需要一行或一列内的顺序、对齐与伸缩,用 Flex;
- 页面级骨架通常用 Grid,组件内部的一行按钮或标签用 Flex。

两者可以嵌套。Grid 项目的 min-width 默认同样是 auto,长文本溢出时记得给轨道用 minmax(0, 1fr) 或给项目加 min-width: 0。

## 小结

- Grid 是二维布局,grid-template-columns 与 grid-template-rows 定义显式轨道;
- fr 分配扣除固定轨道与 gap 后的剩余空间,minmax(0, 1fr) 防止内容撑破;
- repeat、minmax 与 auto-fit 组合可实现无需媒体查询的卡片自适应;
- grid-template-areas 用字符串描述版面,区域必须是矩形;
- 自动放置按 grid-auto-flow 填充,隐式轨道由 grid-auto-rows 控制;
- 行和列都要控制时选 Grid,单行单列分配选 Flex。
