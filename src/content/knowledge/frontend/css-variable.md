---
title: 自定义属性与主题切换
summary: '自定义属性(--name)是可以在运行时解析的 CSS 变量:var() 读取、作用域由继承决定、回退值兜底;把颜色与间距收进 :root 令牌,再用 data-theme 覆盖即可完成主题切换。'
category: frontend
node: frontend-css-variable
order: 22
level: 进阶
tags: [CSS, 自定义属性, 主题切换, 设计令牌]
updated: 2026-11-19
mindmap: css-variable.mindmap.json
terms: [variable, runtime]
sources:
  - title: MDN · 使用 CSS 自定义属性
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/Using_CSS_custom_properties
    note: 声明、继承、var() 回退值与 JavaScript 读写的规范说明。
  - title: MDN · CSS 参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS
    note: 自定义属性与 calc() 的语法定义。
  - title: web.dev · Learn CSS
    url: https://web.dev/learn/css
    note: 自定义属性、设计令牌与主题切换的组织方式。
---

上一篇讲完容器查询与逻辑属性,那些特性让同一套布局适应不同容器;这一篇开始处理取值本身:把颜色、间距、字号收进自定义属性,再在运行时切换。

## 声明与读取

自定义属性(custom property)是以 `--` 开头的属性,值可以是任意 token 序列。声明用 `--name: value`,读取用 `var(--name)`。

```css
:root {
  --brand: #2f6fed;
  --space-2: 8px;
}

.button {
  background: var(--brand);
  padding: var(--space-2) calc(var(--space-2) * 2);
}
```

自定义属性名区分大小写,`--Brand` 与 `--brand` 是两个变量。`var(--brand)` 在计算值时被替换成 `#2f6fed`,浏览器再按 `background` 的语法解析。

## 作用域由继承决定

自定义属性参与继承。在某个元素上声明,它的所有后代都能读到;后代重新声明同名属性,只影响自己的子树。

```html
<section class="card">
  <button class="button">保存</button>
</section>
```

```css
:root { --brand: #2f6fed; }
.card { --brand: #b42318; }
.button { background: var(--brand); }
```

按钮的背景是 `#b42318`。变量解析看的是元素在 DOM 树上的祖先链,与选择器书写位置、源码先后无关。这也是把令牌放在 `:root` 的原因:整棵树都能继承。

## 回退值

`var()` 的第二个参数是回退值,在变量未定义时使用:

```css
.title {
  font-size: var(--title-size, 20px);
  color: var(--title-color, var(--color-text, #1f2328));
}
```

回退值可以嵌套。没有回退值又找不到变量时,该声明在计算值阶段失效,属性回到继承值或初始值:对可继承属性等价于 inherit,对不可继承属性等价于 initial。失效的是整条声明,并非单个值。

变量值不做类型检查。`--gap: 8;` 本身合法,但 `padding: var(--gap)px` 不合法,因为 `8px` 不能由变量拼接得到。需要单位时用 `calc(var(--gap) * 1px)`。

## 全局令牌

把可复用的取值集中到 `:root`,习惯称设计令牌(design token)。令牌按语义命名,不按当前取值命名:

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f8fa;
  --color-text: #1f2328;
  --color-border: #d0d7de;
  --color-brand: #2f6fed;
  --radius-md: 8px;
  --space-2: 8px;
}
```

`--color-brand` 比 `--blue-500` 更稳定:换品牌色时只改一处,使用处不必跟着改名。需要保留色板时,可以再加一层 `--blue-500` 作为原始值,让语义令牌引用它。

## 主题切换

主题切换的本质是换一组令牌。用 `data-theme` 显式指定,用 `prefers-color-scheme` 跟随系统:

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f6f8fa;
  --color-text: #1f2328;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #14171a;
    --color-surface: #1f2328;
    --color-text: #e6edf3;
    color-scheme: dark;
  }
}

:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f6f8fa;
  --color-text: #1f2328;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --color-bg: #14171a;
  --color-surface: #1f2328;
  --color-text: #e6edf3;
  color-scheme: dark;
}
```

`--color-*` 只在 `:root` 上改,所有使用 `var()` 的规则自动跟随。`color-scheme` 让表单控件、滚动条与默认背景使用对应配色;不写它,深色页面里仍会出现白色输入框。

需要注意层叠顺序: `:root[data-theme="dark"]` 的权重是 (0,2,0),高于媒体查询里 `:root` 的 (0,1,0),所以用户显式选择 `dark` 时可以覆盖系统偏好;两个显式主题块放在媒体查询之后,保证同等权重下后者生效。

变量在运行时解析,媒体查询只负责改令牌,不需要把使用 `var()` 的规则重写一遍。反过来也有边界:媒体查询的条件本身不能使用 `var()`,`@media (min-width: var(--bp))` 无效。

JS 读写的示例:

```js
const root = document.documentElement;
root.style.setProperty('--color-brand', '#b42318');

const brand = getComputedStyle(root).getPropertyValue('--color-brand').trim();
console.log(brand); // #b42318
```

写在行内的属性优先级高于样式表,适合用户手动切换主题;`getPropertyValue` 返回原始字符串,可能带首尾空格,需要 `trim()`。读写都不做类型校验,传入非法值不会立刻报错,只会在使用时让声明失效。

## @property 补充类型信息

自定义属性默认是无类型的 token 流,不能参与插值动画。`@property` 可以注册名称、语法、初始值与继承方式,注册后的自定义属性才能按类型插值,例如让 `--progress` 在 `0%` 与 `100%` 之间连续过渡。没有 `@property` 时,两个百分比之间没有中间值,过渡直接跳变。

## 小结

- 自定义属性用 `--name` 声明,`var(--name)` 读取,默认继承;
- 作用域由 DOM 继承链决定,`:root` 适合放全局令牌;
- `var()` 支持回退值与嵌套,变量值不做类型检查,单位要显式参与计算;
- 主题切换就是换一组令牌,`data-theme` 负责显式选择,`prefers-color-scheme` 负责跟随系统;
- 变量在运行时解析,媒体查询能改令牌值,但不能在条件里使用变量;
- 需要类型与插值时用 `@property` 注册。
