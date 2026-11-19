---
title: 语义化：landmark、alt 与可访问名称
summary: '语义化用元素名表达内容角色,收益在可读性、SEO 与辅助技术。整页用 header / nav / main / article / section / aside / footer 划分,landmark 与跳过导航便于键盘操作,alt 与可访问名称决定图片和按钮被怎样朗读。'
category: frontend
node: frontend-html-semantics
order: 8
level: 入门
tags: [HTML, 语义化, landmark, alt, 可访问性]
updated: 2026-11-19
mindmap: html-semantics.mindmap.json
terms: []
sources:
  - title: MDN · HTML 元素参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
    note: 语义元素与内容模型的说明。
  - title: MDN · 可访问性
    url: https://developer.mozilla.org/zh-CN/docs/Web/Accessibility
    note: 辅助技术、可访问名称与语义的关系。
  - title: web.dev · Learn Accessibility
    url: https://web.dev/learn/accessibility
    note: 键盘操作、语义结构与图像替代文本的实践。
---

上一篇的表格用 `th` 标明表头,表单用 `label` 关联输入框,这些做法都属于语义化。这一篇把语义化从单个元素扩展到整页结构,以及辅助技术怎样读出这些结构。

## 语义化是什么

语义化指选择名称能表达内容角色的元素,让文档在没有 CSS 和 JavaScript 时仍然可读。收益有三点:

- 可读性与可维护性:结构一眼可见,后来的人不必从类名推断每个区块的职责;
- SEO:搜索引擎依赖标题层级与链接结构判断内容主题;
- 辅助技术:屏幕阅读器依靠元素语义生成大纲、landmark 与控件角色。

语义化不改变视觉表现,改变的是文档的结构信息。

## 整页骨架

常用的结构元素各有明确职责:

- `header`:页面或区块的头部,通常包含标题与标志;
- `nav`:主要导航链接组;
- `main`:页面主要内容,一个页面只应有一个;
- `article`:可独立分发的内容单元,例如文章、帖子、评论;
- `section`:按主题划分的区块,通常带标题;
- `aside`:与主内容相关但可独立的附属内容;
- `footer`:页面或区块的页脚。

选择依据是内容角色,样式交给 CSS。

```html
<body>
  <header>
    <h1>前端知识库</h1>
  </header>
  <nav aria-label="主导航">
    <a href="/html">HTML</a>
    <a href="/css">CSS</a>
  </nav>
  <main>
    <article>
      <h2>文档结构</h2>
      <section>
        <h3>doctype</h3>
        <p>声明解析模式。</p>
      </section>
    </article>
    <aside>
      <h2>相关阅读</h2>
      <p>CSS 基础。</p>
    </aside>
  </main>
  <footer>
    <p>&copy; 2026 示例站点</p>
  </footer>
</body>
```

预期:去掉 CSS 后,页面仍按标题层级和区块顺序阅读;屏幕阅读器可以按 landmark 跳转。

## landmark 与跳过导航

`header`、`nav`、`main`、`aside`、`footer` 会映射为 ARIA landmark,分别对应横幅、导航、主内容、补充内容与内容信息。多个 `nav` 要用 `aria-label` 区分,`main` 只能有一个。landmark 让屏幕阅读器用户直接跳到某个区域。

键盘用户还需要跳过导航链接:它默认视觉隐藏,获得焦点时出现。

```html
<a class="skip-link" href="#main">跳到主要内容</a>

<main id="main">
  <h1>页面标题</h1>
</main>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: 1rem;
  top: 1rem;
}
```

预期:按 Tab 键,第一个获得焦点的是「跳到主要内容」;按回车后焦点移到 `main`,再次按 Tab 进入正文。

## figure 与 figcaption

`figure` 表示独立的内容单元,可以是图片、代码块、图表;`figcaption` 是它的说明,放在 `figure` 的第一个或最后一个子元素位置。

`alt` 与 `figcaption` 分工:`alt` 描述图像本身,供无法看到图像时使用;`figcaption` 是给所有读者看的可见说明,可以包含图号与来源。

```html
<figure>
  <img src="./images/trend.png"
       alt="月活跃用户从 1 月到 6 月持续上升"
       width="640" height="360">
  <figcaption>图 1:2026 年上半年月活跃用户趋势。</figcaption>
</figure>
```

## alt 与可访问名称

`alt` 写图像的内容与目的,不写「图片」「图像」这类重复信息。装饰图写 `alt=""`;链接内的图片,`alt` 要描述链接目标;不写 `alt` 时,屏幕阅读器可能朗读文件名。

可访问名称(accessible name)是辅助技术朗读控件时使用的名字。常见来源:

- 元素内的可见文本;
- `label` 元素,用于表单控件;
- `alt`,用于图片;
- `aria-label` 或 `aria-labelledby`。

优先使用可见文本,`aria-label` 用于没有可见文本的图标按钮。按钮用 `button`,不要用 `div` 加点击事件:`div` 没有键盘焦点,也没有按钮语义。

```html
<button type="button">
  <img src="./icons/search.svg" alt="" width="16" height="16">
  搜索
</button>

<button type="button" aria-label="关闭对话框">
  <img src="./icons/close.svg" alt="" width="16" height="16">
</button>
```

预期:第一个按钮朗读「搜索」;第二个按钮朗读「关闭对话框」。图标本身是装饰,`alt` 留空。

## 常见错误

- 整页都是 `div` 与 `span`,没有任何结构信息;
- 一个页面出现多个 `main`;
- 标题从 `h1` 直接跳到 `h3`;
- 用 `div` 模拟按钮,鼠标可用但键盘无法操作;
- 用 `placeholder` 代替 `label`,输入后提示消失;
- `aria-label` 与可见文本不一致,语音控制无法按文字点击;
- `alt` 写成「图片」或直接省略。

## 小结

- 语义化让元素名表达内容角色,收益在可读性、SEO 与辅助技术;
- `header`、`nav`、`main`、`article`、`section`、`aside`、`footer` 按内容角色划分,`main` 唯一;
- landmark 支持区域跳转,跳过导航链接让键盘用户直达正文;
- `figure` 与 `figcaption` 为插图提供可见说明,`alt` 描述图像内容与目的;
- 可访问名称优先来自可见文本,其次 `label`、`alt`、`aria-label`;
- 按钮用 `button`,避免用 `div` 模拟交互。
