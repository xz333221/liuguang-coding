---
title: 语义、焦点与键盘操作
summary: '键盘用户靠焦点移动,可聚焦元素和 DOM 顺序决定走到哪。button 自带焦点与按键响应,div 都没有;tabindex 只用 0 和 -1,焦点环交给 :focus-visible,弹窗用 inert 加 aria-modal。'
category: frontend
node: frontend-a11y-semantics
order: 102
level: 入门
tags: [可访问性, 键盘, 焦点, tabindex, dialog]
updated: 2026-11-19
mindmap: a11y-semantics.mindmap.json
terms: []
sources:
  - title: MDN · HTML 属性:tabindex
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/tabindex
    note: 可聚焦性与 Tab 顺序的规则,包括正数 tabindex 的影响。
  - title: W3C WAI · Keyboard Compatibility
    url: https://www.w3.org/WAI/perspective-videos/keyboard/
    note: 只用键盘完成操作的典型场景与要求。
  - title: MDN · :focus-visible
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/:focus-visible
    note: 浏览器判断何时显示焦点指示的机制。
---

第 17 章最后一篇《能力边界:什么不该放在浏览器里》把密钥、权限判断和可信计算从浏览器里划了出去。这一篇回到浏览器必须做好的部分:键盘用户没有鼠标,页面上的每个操作都得能靠焦点和按键走完。

## 焦点是键盘的坐标系

键盘只有几个入口:Tab 与 Shift+Tab 移动焦点,回车和空格触发,方向键在组合控件内移动。所有操作都从焦点出发,没有焦点就没有键盘操作。

浏览器默认可聚焦的元素不多:

- 带 `href` 的 `a`;
- `button`;
- `input`(除了 `type="hidden"`)、`select`、`textarea`;
- `summary`(在 `details` 内部);
- 带 `contenteditable` 的元素。

`div`、`span`、`img` 都不在其中。给 `div` 绑 `onclick`,鼠标能点,键盘按 Tab 却停不下来,后续所有按键都落空。

Tab 顺序默认按 DOM 顺序走,和视觉顺序无关。用 `order` 或 `position: absolute` 把元素挪到别处,DOM 里的位置没变,焦点就会先跳到右边再跳回左边。

## tabindex 只用 0 和 -1

`tabindex` 控制元素能否被聚焦,以及是否进入 Tab 序列:

| 写法 | 效果 | 使用场景 |
|---|---|---|
| 不写 | 按元素自身默认行为 | 首选,原生元素不用加 |
| `tabindex="0"` | 加入 Tab 序列,位置按 DOM 顺序 | 自定义控件需要被 Tab 停留 |
| `tabindex="-1"` | 可被脚本聚焦,但不进 Tab 序列 | 弹窗容器、锚点目标、标题 |
| `tabindex="1"` 及以上 | 排到所有 `0` 之前,按数字排序 | 不要用 |

正数是最容易踩的坑:页面里只要出现一个 `tabindex="1"`,它就会排到所有默认可聚焦元素前面;再加一个 `tabindex="2"`,两者之间的顺序还得人工维护,删掉一个整页顺序就乱。规范允许,实践里基本等于 bug。

`-1` 的用途常被忽略。弹窗打开后把焦点交给弹窗标题,屏幕阅读器才会读出弹窗的名字和上下文;标题本身不该出现在 Tab 序列里,于是给它 `tabindex="-1"`,再用 `focus()` 移过去。这个值的意思是「可以被脚本聚焦,但 Tab 跳过」,不是「禁用」。

## 原生元素自带的键盘行为

把 `button` 和 `div` 放一起对比,差别不只在样式:

| 元素 | 角色 | 键盘行为 |
|---|---|---|
| `<button>` | button | Tab 聚焦,回车与空格都触发 `click` |
| `<a href>` | link | Tab 聚焦,只有回车触发,空格滚动页面 |
| `<input type="checkbox">` | checkbox | Tab 聚焦,空格切换 |
| `<div onclick>` | 无 | 不可聚焦,没有任何按键响应 |

```html
<!-- 错:鼠标能点,键盘按不到 -->
<div class="btn" onclick="save()">保存</div>

<!-- 对:角色、焦点、按键全部免费 -->
<button type="button" onclick="save()">保存</button>
```

链接和按钮的分工也常写反。跳转到另一个 URL 用 `a`,触发页面内行为用 `button`。用 `a href="#"` 加 `preventDefault` 冒充按钮,会带来两个问题:读屏播报「链接」,空格键不响应。

确实需要自定义控件时,`role`、`tabindex`、键盘事件三样都要自己补:

```js
const el = document.querySelector('.btn')
el.setAttribute('role', 'button')
el.tabIndex = 0
el.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    el.click()
  }
})
```

`preventDefault` 是为了阻止空格滚动页面。这段代码依然缺 `disabled` 状态、表单提交和焦点样式,所以能用 `button` 时不要写它。

## 焦点必须看得见

`outline: none` 是最常见的可访问性事故。设计稿上那圈蓝框不好看,一行 CSS 删掉,键盘用户就彻底失去位置感。

```css
/* 错:所有焦点提示都没了 */
:focus { outline: none; }

/* 对:鼠标点击不显示,键盘聚焦显示 */
:focus-visible {
  outline: 2px solid #2f6fed;
  outline-offset: 2px;
}
```

`:focus` 只要聚焦就匹配,鼠标按下按钮也算;`:focus-visible` 由浏览器判断这次聚焦是否需要提示,按 Tab 一定匹配,鼠标点击通常不匹配。想要「鼠标不显示、键盘显示」,用后者,不要用前者删掉再补。

换成 `box-shadow` 画焦点环时注意:阴影会被父元素的 `overflow: hidden` 裁掉,而 `outline` 不会。深色背景上单靠一种蓝色可能对比度不足 3:1,焦点环也要检查对比度。

## 弹窗里的焦点

弹窗打开后,焦点要移进去;在弹窗内 Tab 要循环;关闭后焦点回到触发它的按钮。三件事缺一件,键盘用户就会掉进背景页面,找不到回来的路。

原生 `dialog` 加 `showModal()` 已经处理了焦点限制、Esc 关闭和背景隔离。手写的弹窗要自己补:

```html
<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
  <h2 id="dlg-title" tabindex="-1">重命名文件</h2>
  <input id="name" value="report.pdf">
  <button type="button">取消</button>
  <button type="button">确定</button>
</div>
```

`aria-modal="true"` 只是告诉辅助技术「当前只看这一块」,它不拦 Tab,也不拦鼠标。背景要真正不可交互,用 `inert`:

```js
const app = document.querySelector('#app')
app.inert = true   // 打开弹窗:背景不可聚焦、不可点击、对辅助技术隐藏
app.inert = false  // 关闭后恢复
```

坑在于只写 `aria-modal` 不写 `inert`:屏幕阅读器用户在浏览模式下仍能读到背景文字,按 Tab 也能跑出去。反过来,只用 `pointer-events: none` 只能挡鼠标,挡不住键盘。

## 跳过导航与顺序检查

内容站的导航动辄几十个链接,键盘用户每进一个页面都要按几十次 Tab 才能到正文。跳过导航链接放在 `body` 的第一个位置:

```html
<body>
  <a class="skip" href="#main">跳到主要内容</a>
  <header>...</header>
  <main id="main" tabindex="-1">...</main>
</body>
```

给 `main` 加 `tabindex="-1"` 是为了接住焦点:只写锚点时浏览器滚到目标位置,焦点仍留在原地,下一次 Tab 又从链接后面继续。加上之后,回车会把焦点真正放到 `main` 上,再按 Tab 就进入正文第一个可聚焦元素。

检查方法很土但有效:拔掉鼠标,只用 Tab 走一遍。看焦点顺序是否和阅读顺序一致,有没有焦点跑到屏幕外,有没有元素聚焦后看不到位置。

## 小结

- 键盘操作从焦点出发,默认可聚焦的只有链接、按钮、表单控件等少数元素;
- `tabindex="0"` 加入 Tab 序列,`-1` 只允许脚本聚焦,正数会打乱全页顺序;
- `button` 自带角色、焦点和回车空格触发,`div` 三样都要手写,不值得;
- 焦点环不能删,用 `:focus-visible` 区分鼠标与键盘,并检查对比度;
- 弹窗要移入焦点、限制循环、关闭后归还,`aria-modal` 配合 `inert` 才完整;
- 跳过导航链接通向正文,`main` 加 `tabindex="-1"` 才能接住焦点。
