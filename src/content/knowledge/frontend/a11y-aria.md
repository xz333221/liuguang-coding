---
title: ARIA 的正确用法与常见误用
summary: 'ARIA 补的是原生元素表达不了的语义，第一条规则是能用原生就不用它。role 只声明不实现，命名优先 aria-labelledby，状态属性随 UI 同步，aria-hidden 不能罩住可聚焦元素。'
category: frontend
node: frontend-a11y-aria
order: 103
level: 进阶
tags: [可访问性, ARIA, 可访问名称, aria-live]
updated: 2026-11-19
mindmap: a11y-aria.mindmap.json
terms: []
sources:
  - title: W3C WAI-ARIA · 使用惯例
    url: https://www.w3.org/WAI/ARIA/apg/
    note: 各类组件的角色、状态与键盘交互约定。
  - title: MDN · ARIA
    url: https://developer.mozilla.org/zh-CN/docs/Web/Accessibility/ARIA
    note: 角色、属性与可访问名称的参考。
  - title: W3C WAI · ARIA 编写实践
    url: https://www.w3.org/WAI/ARIA/apg/practices/
    note: 命名、状态同步与 live region 的建议。
---

上一篇用原生元素换来了焦点、键盘行为和角色。原生元素覆盖不到的控件，比如标签页、树形菜单、组合框，才轮到 ARIA 出面；而补错语义，比不补更难排查。

## 第一条规则

ARIA(Accessible Rich Internet Applications，可访问富互联网应用)是一组属性和角色，用来向辅助技术补充 DOM 表达不了的语义。规范给出的第一条规则很短：如果有原生 HTML 元素或属性可以实现同样的语义和行为，就用原生，不要用 ARIA 重造。

原因在于原生元素的行为写在浏览器里。`button` 可聚焦、响应回车与空格、有 `disabled` 状态、参与表单提交；你用 `div role="button"` 得到的是一个读屏会念「按钮」的 `div`，其余全部要手写，漏一样就是缺陷。

| 需求 | 原生写法 | 等价 ARIA 写法 |
|---|---|---|
| 按钮 | `button` | `role="button"` + `tabindex` + 键盘事件 |
| 展开收起 | `details` / `summary` | `aria-expanded` + `aria-controls` |
| 模态弹窗 | `dialog` + `showModal()` | `role="dialog"` + `aria-modal` + `inert` |
| 进度 | `progress` | `role="progressbar"` + `aria-valuenow` |
| 提示消息 | 无需角色 | `role="status"` 或 `role="alert"` |

第二到第五条讲的是一件事的两面：不要改动原生语义，以及每个用 ARIA 的控件都要能用键盘操作、有可访问名称、状态保持准确。

## role 只声明，不实现

最常见的误用是只加角色：

```html
<!-- 错:读屏会念「按钮」,但 Tab 停不下来,按键也没反应 -->
<div role="button" onclick="submit()">提交</div>
```

角色只影响辅助技术如何播报，不影响浏览器的行为。要补齐一个按钮，至少需要四件东西：

```js
const btn = document.querySelector('[data-action="submit"]')
btn.tabIndex = 0
btn.addEventListener('click', submit)
btn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    btn.click()
  }
})
```

还缺 `disabled` 的语义、焦点样式、表单里的提交行为。算下来比直接写 `<button type="button">` 麻烦得多，却没有更灵活。

`role` 也不能随便加在无意义的容器上。`role="presentation"` 或 `role="none"` 只移除这一个元素自身的语义，不会删掉子元素和文本；而且加在可聚焦元素或带全局 ARIA 状态的元素上会被直接忽略。拿它去「清掉」列表或表格的语义，结果往往和预期相反。

## 名称与描述

可访问名称是读屏播报控件时说的名字，描述是补充说明。名称来源有固定的优先级：

1. `aria-labelledby`，值是若干元素的 id，可拼接多段文本；
2. `aria-label`，直接给字符串；
3. 宿主语言自带的来源，例如 `label`、`alt`、按钮内的可见文本；
4. `title`，最后的兜底。

`aria-labelledby` 排在 `aria-label` 前面，两者同时存在时后者被忽略。想让按钮名里既有可见的动词，又有它作用的对象，用两个 id 拼接：

```html
<h2 id="file-a">report.pdf</h2>
<button type="button" aria-labelledby="delete-label file-a">
  <span id="delete-label">删除</span>
</button>
```

预期：读屏播报「删除 report.pdf，按钮」。名称由两段拼起来，可见的「删除」仍在名称里，语音控制说「点击 删除」也能命中。

`aria-label` 覆盖可见文本时要小心。按钮上写着「提交」,`aria-label` 写成「发送」，语音控制用户说「点击 提交」就会失败，因为辅助技术只认后者。可见文本和名称一致是最省事的做法。

`aria-describedby` 提供的是描述，播报在名称之后，通常用来关联错误提示或格式说明，不能拿它当名称。

## 状态属性必须同步

`aria-expanded`、`aria-pressed`、`aria-selected`、`aria-checked` 都是状态，值要和界面同步，否则读屏说的是旧状态。

`aria-expanded` 放在触发按钮上，不是放在被展开的面板上。`aria-controls` 指向面板 id，但它的支持度不一致，别指望它承担关键信息，真正要准确的是 `aria-expanded`。

```js
const trigger = document.querySelector('#menu-trigger')
const panel = document.querySelector('#menu-panel')

trigger.addEventListener('click', () => {
  const open = trigger.getAttribute('aria-expanded') === 'true'
  trigger.setAttribute('aria-expanded', String(!open))
  panel.hidden = open
})
```

坑在于只切换 `hidden` 忘了切换属性：视觉上收起了，读屏仍报「已展开」。反过来只改属性不改可见性，读屏和视觉各说一套，问题更难发现。

选哪个属性也有讲究。切换按钮用 `aria-pressed`(静音、收藏)，展开面板用 `aria-expanded`，选项集合用 `aria-selected`，三者不要混用。

## aria-hidden 的边界

`aria-hidden="true"` 把元素从可访问性树里摘掉，读屏完全看不到。它适合装饰性图标：图标加 `aria-hidden="true"`，再加 `focusable="false"` 防止部分浏览器把 `svg` 也放进 Tab 序列，按钮名由旁边的可见文字提供。

坑出在可聚焦元素上：

```html
<!-- 错:焦点能进去,读屏却什么都读不到 -->
<div aria-hidden="true">
  <button type="button">删除</button>
</div>
```

Tab 会停在按钮上，读屏没有任何输出，用户不知道自己在哪。axe 把这类问题报成 `aria-hidden-focus`。修法只有两种：要么去掉 `aria-hidden`，要么把里面的元素也移出 Tab 序列。

还有一个高频错误是把 `aria-hidden` 加在当前聚焦元素的祖先上，常见于「打开弹窗时隐藏背景」。焦点还在背景里，元素却已从树里消失，读屏直接失去焦点。这种场景要用 `inert`，它同时处理焦点和可访问性树。

## aria-live 与提示

动态出现的提示(保存成功、表单错误、搜索结果数量)需要 `aria-live` 才会被播报。两个值差别很大：

- `polite`:等用户当前朗读结束后再播，适合大多数状态提示；
- `assertive`:立即打断当前朗读，只留给错误等紧急信息。

`role="status"` 等价于 `aria-live="polite"` 加 `aria-atomic="true"`,`role="alert"` 等价于 `assertive` 加原子播报，用角色比手写属性更稳。

```js
const status = document.querySelector('#status')

function notify(text) {
  status.textContent = text
}

notify('已保存')
```

关键是容器必须先在页面里存在，再改它的文本。容器是静态 HTML 里的一个空 `div`，带 `role="status"`，内容由上面这段代码写入。把容器和文本一起插入，浏览器在插入那一刻没有观察到内容变化，很多读屏不会播报。

另一个坑是频繁更新。列表过滤时每个字符都改一次 live 区域，读屏会连续播报，用户什么都听不清。加防抖，或只在结果稳定后播一次「共 12 条结果」。

## 什么时候必须用 ARIA

原生元素表达不了组合关系时，ARIA 就是唯一选择：标签页的 `role="tablist"` 与 `role="tab"`、组合框的 `role="combobox"`、树的 `role="treeitem"`，还要配套方向键、Home/End、焦点跟随选中这些交互。

这类组件不要凭感觉写。WAI-ARIA Authoring Practices 给了每种组件的角色、状态和键盘约定，照着实现，再在 NVDA 与 VoiceOver 里各听一遍。

反过来，能拆成原生元素时优先拆。一个「展开收起」用 `details` 加 `summary` 只有两行代码，自己写要维护 `aria-expanded`、键盘事件、焦点位置和动画，收益为零。

## 小结

- 第一条规则是能用原生就不用 ARIA，原生元素的行为由浏览器实现；
- `role` 只改变播报，`role="button"` 仍要补 `tabindex`、回车与空格；
- 名称优先级为 `aria-labelledby`、`aria-label`、宿主语言来源、`title`;
- `aria-expanded` 等状态必须随 UI 同步，属性放触发元素而不是面板；
- `aria-hidden` 不能罩住可聚焦元素，隐藏背景用 `inert`;
- live 区域要先用空容器占位再改文本，`polite` 为主，`assertive` 只给错误。
