---
title: 设计令牌与主题
summary: '令牌按原始值、语义、组件三层组织，主题只改语义层；--tone-* 这类角色变量可以挂在任意子树的作用域上，让一块区域换色调而组件本身不改。'
category: frontend
node: frontend-style-token
order: 79
level: 进阶
tags: [设计令牌, 自定义属性, 主题, 设计系统]
updated: 2026-11-19
mindmap: style-token.mindmap.json
terms: []
sources:
  - title: MDN · 使用 CSS 自定义属性
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties
    note: 声明、继承链与 var() 回退值的规范说明。
  - title: MDN · color-scheme
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/color-scheme
    note: 让表单控件与默认背景跟随浅色或深色的取值。
  - title: web.dev · Learn CSS
    url: https://web.dev/learn/css
    note: 自定义属性、颜色与主题的组织方式。
---

第 13 章最后一篇《实时数据：WebSocket 与 SSE》把长连接、心跳和重连补齐后，页面上的数据能自己动了；但承载这些数据的是颜色、间距与字号，它们现在散在几十个文件里。改一次品牌色要跟着改一遍全局，这就是缺少设计令牌(design token)的直接代价。

## 三层令牌

令牌不是「把颜色起个名字」，而是分层：原始值描述颜色本身，语义层描述用途，组件层描述某一个部件的取值。三层各改各的，互不越权。

```css
/* 1. 原始值: 只有色相和明度, 不带用途 */
:root {
  --gray-0: #ffffff;
  --gray-50: #f6f8fa;
  --gray-900: #1f2328;
  --blue-500: #2f6fed;
  --blue-700: #1d4ed8;
  --red-600: #b42318;
  --space-1: 4px;
  --space-2: 8px;
  --radius-md: 8px;
}

/* 2. 语义层: 描述用途, 换主题只动这一层 */
:root {
  --color-bg: var(--gray-0);
  --color-surface: var(--gray-50);
  --color-text: var(--gray-900);
  --color-border: #d0d7de;
  --color-accent: var(--blue-500);
  --color-accent-hover: var(--blue-700);
  --color-danger: var(--red-600);
}
```

```css
/* 3. 组件层: 只服务一个组件, 默认指向语义层 */
.button {
  --button-bg: var(--color-accent);
  --button-fg: #ffffff;
  --button-radius: var(--radius-md);
  background: var(--button-bg);
  color: var(--button-fg);
  border-radius: var(--button-radius);
  padding: var(--space-1) var(--space-2);
}

.button:hover {
  --button-bg: var(--color-accent-hover);
}
```

| 层 | 例子 | 谁来改 | 影响范围 |
| --- | --- | --- | --- |
| 原始值 | `--blue-500` | 设计系统维护者 | 所有引用它的语义令牌 |
| 语义 | `--color-accent` | 主题 / 品牌 | 所有消费该语义的组件 |
| 组件 | `--button-bg` | 组件作者 | 只有该组件 |

规则只有一条： 业务规则里只读语义层或组件层，不要直接写 `var(--blue-500)`。一旦有人绕过语义层，换主题时这个位置就会被漏掉，表现为「深色模式下有一个按钮还是亮蓝」。

## --tone-* 与作用域

有些区域要整体换色调： 删除确认面板、营销区块、被选中的表格行。给每个组件加一个 `variant` 参数会把组合数炸开，改为在容器上换一组 `--tone-*`，子树里所有组件自动跟随。

```css
:root {
  --tone-accent: var(--color-accent);
  --tone-surface: var(--color-surface);
  --tone-text: var(--color-text);
  --tone-border: var(--color-border);
}

.danger-zone {
  --tone-accent: var(--color-danger);
  --tone-surface: #fff5f4;
  --tone-border: #f3c1bd;
  --tone-text: #5c1a12;
}

.button {
  background: var(--tone-accent);
  border: 1px solid var(--tone-border);
  color: var(--tone-text);
}
```

自定义属性参与继承，`.danger-zone` 里的 `.button` 自然变红，组件不知道世界上有几种色调。这是第 5 章讲自定义属性那篇讲的继承机制在系统层的用法： 作用域就是 DOM 子树。

三个边界要记住：

- `:root` 上必须有每组 `--tone-*` 的默认值。缺了默认值，某层容器忘了声明，整块会落空成 `inherit` 或 `initial`，而且不报错。
- 弹层、`<dialog>` 进 top layer 后仍在 DOM 原位，但如果被 portal 挂到 `body` 下，就不再继承容器的 tone。这种情况要么把弹层渲染在容器内，要么显式传值。
- `--tone-*` 只放颜色与边框这类「会整体换皮肤」的取值。把间距也塞进去，组件在不同作用域里的布局会变，那不是换色调，是换组件。

## 主题就是换一组令牌

浅色是默认，深色覆盖语义层。原始值不动，组件不动。

```css
:root {
  color-scheme: light;
  --color-bg: var(--gray-0);
  --color-surface: var(--gray-50);
  --color-text: var(--gray-900);
  --color-border: #d0d7de;
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --color-bg: #0d1117;
  --color-surface: #161b22;
  --color-text: #e6edf3;
  --color-border: #30363d;
}
```

`color-scheme` 决定浏览器自绘部分用哪套配色： 滚动条、`<input>` 的默认边框与背景、`<select>` 下拉、canvas 的初始底色。只改令牌不写它，深色页面里会冒出白色输入框和白底滚动条。也可以写 `color-scheme: light dark`，让浏览器按系统偏好自己选，但那样就失去了手动切主题的控制权，所以显式主题一律给单值。

深色不是把颜色反过来。大面积底色用 `#0d1117` 而不是 `#000`，正文用 `#e6edf3` 而不是 `#fff`，纯黑配纯白在 OLED 上会有明显光晕。阴影在深色下几乎看不见，层级改用更亮的 `--color-surface` 表达，不要靠 `box-shadow` 硬撑。

## 派生值

同一种色调需要 hover、pressed、选中三种深度，手写三组十六进制很快就会失配。用 `color-mix()` 从语义令牌算出来：

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.card:hover {
  /* 第一条是兜底: 没定义 --color-surface-hover 时退回 --color-surface */
  background: var(--color-surface-hover, var(--color-surface));
  /* 混入 6% 的前景色, 浅色下变深, 深色下变亮 */
  background: color-mix(in oklab, var(--color-text) 6%, var(--color-surface));
}
```

`in oklab` 让混合发生在感知均匀的空间里，不会像 sRGB 混色那样在中途发灰。不认识 `color-mix()` 的浏览器只丢弃这一条声明，前一条留下，不需要 `@supports` 包一层。

还有一类令牌不随主题变，而是随环境变： `--shadow-color` 在深色下应该是 `rgb(0 0 0 / 0.6)`，在浅色下是 `rgb(31 35 40 / 0.12)`;`--focus-ring` 在浅色下用蓝，在深色下要提亮一档，否则贴在同色背景上看不见。把这些也放进语义层，而不是在组件里写 if。

## 令牌的边界

```text
tokens/
  primitive.css   # 色板、间距、字号、圆角, 只被语义层引用
  semantic.css    # color-* / tone-* / shadow-*, 主题在这里覆盖
  component.css   # button-* / input-*, 可选
```

- 不要为每个像素建令牌。令牌数量超过组件数量时，维护成本反超收益，而且没人记得住。
- 语义名不按取值命名。`--color-blue` 在换成绿色品牌后名不副实，`--color-accent` 才是稳定描述。
- 不要在令牌里写 `!important`，也不要让两个令牌互相引用： `--a: var(--b); --b: var(--a)` 会让两者同时变成无效值，使用处静默回退，现象是「颜色突然变黑」。
- 组件层令牌只在组件根节点声明，不要写到 `:root`，否则全局多出一堆只有某个按钮认识的变量。

## 小结

- 令牌分原始值、语义、组件三层，业务代码只读后两层；
- 主题切换只覆盖语义层，原始色板与组件规则都不动；
- `--tone-*` 把颜色角色挂在容器作用域上，子树自动跟随，组件不需要 variant 参数；
- `color-scheme` 管浏览器自绘的控件，只换令牌不写它，深色页面会露出白底；
- 派生色用 `color-mix(in oklab, ...)` 算，并保留一条纯色兜底；
- 令牌要有数量上限，命名按用途，不按当前取值。
