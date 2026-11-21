---
title: 内容标签：标题、段落、列表、链接与图片
summary: 'h1 到 h6 表示标题层级，p 表示段落，ul / ol / dl 组织列表，strong 与 em 表达强调，a 建立链接，img 插入图片。链接与图片还涉及 target、alt、尺寸与路径。'
category: frontend
node: frontend-html-text
order: 6
level: 入门
tags: [HTML, 标题, 列表, 链接, 图片]
updated: 2026-11-19
mindmap: html-text.mindmap.json
terms: []
sources:
  - title: MDN · HTML 元素参考
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element
    note: 标题、列表、链接与图片元素的属性说明。
  - title: web.dev · Learn HTML
    url: https://web.dev/learn/html
    note: 内容标签与文档结构的讲解。
  - title: WHATWG HTML 标准
    url: https://html.spec.whatwg.org/
    note: 元素语义与内容模型的规范定义。
---

上一篇把文档分成 `head` 与 `body` 两部分，可见内容都放在 `body` 里。这一篇看 `body` 中最常用的五类元素：标题、段落、列表、链接和图片。

## 标题：h1 到 h6

HTML 提供六级标题，从 `h1` 到 `h6`。级别表示内容在文档大纲中的层级，字号只是浏览器的默认样式，可以用 CSS 改成任意大小。

约定：

- 一个页面通常只有一个 `h1`，作为页面主标题；
- 标题按 `h1` → `h2` → `h3` 逐级嵌套，不要为了字号从 `h2` 跳到 `h4`;
- 需要更小的文字时，用 `p` 或 `span` 配合 CSS，不要选一个级别不对的标题。

```html
<h1>前端入门</h1>
<h2>HTML</h2>
<h3>文档结构</h3>
<h2>CSS</h2>
```

浏览器会逐级减小字号显示，屏幕阅读器也能据此生成大纲。

## 段落与换行

`p` 表示段落。浏览器在段落之间应用默认的外边距，并在源码中把连续的空格与换行折叠成一个空格。

```html
<p>第一段。</p>
<p>第二段,<br>这一行与上一行属于同一段。</p>
```

源码里两段之间的缩进和换行不影响显示。想拉开间距应当用 CSS 的 `margin`，插入空 `p` 或连续 `br` 会生成无意义的空元素。`br` 只用于同一段内必须换行的场景，例如诗句、地址。

预期：浏览器分两段显示「第一段。」与「第二段，这一行与上一行属于同一段。」。

## 列表

三种列表的用途不同：

- `ul` 无序列表，`li` 是列表项，浏览器默认显示圆点；
- `ol` 有序列表，浏览器自动编号，可用 `start` 指定起始序号，`reversed` 反向编号；
- `dl` 描述列表，`dt` 是名称，`dd` 是说明。

```html
<ul>
  <li>HTML</li>
  <li>CSS</li>
</ul>

<ol>
  <li>打开编辑器</li>
  <li>新建文件</li>
</ol>

<dl>
  <dt>HTML</dt>
  <dd>描述页面结构的标记语言。</dd>
</dl>
```

嵌套列表要放在 `li` 内部，不能直接放在 `ul` 或 `ol` 下；`ul` 与 `ol` 的直接子元素只应当是 `li`。

## 强调：strong 与 em

`strong` 表示重要性，`em` 表示语气强调。`b` 只表示视觉加粗，`i` 只表示视觉斜体，两者不带强调语义。屏幕阅读器在部分设置下会改变 `strong` 与 `em` 的语调，`b` 与 `i` 不会。

呈现效果相同不代表语义相同：需要强调时用 `strong` 与 `em`，单纯调整字形时用 CSS 控制 `font-weight` 与 `font-style`。

```html
<p><strong>警告:</strong>提交后不能撤销。</p>
<p>请<em>仔细</em>阅读说明。</p>
<p>产品代号 <b>X1</b>,书名 <i>HTML 权威指南</i>。</p>
```

## 链接

`a` 元素通过 `href` 指向目标：

```html
<a href="/docs/html">HTML 文档</a>
<a href="https://example.com" target="_blank" rel="noopener noreferrer">示例站点</a>
<a href="#section-2">跳到第二节</a>
<a href="report.pdf" download>下载报告(PDF)</a>
```

几个属性的含义：

- `href` 可以是相对路径、绝对路径或完整 URL；没有 `href` 的 `a` 只是占位，不是链接；
- `target="_blank"` 在新标签页打开，同时写 `rel="noopener"` 阻止新页面通过 `window.opener` 操作原页面；`noreferrer` 还会去掉 Referer 请求头；
- `href="#section-2"` 跳到 `id` 为 `section-2` 的元素，用于页内导航；
- `download` 提示浏览器下载该文件，不在标签页中直接打开；属性值可以指定文件名。

链接文字要说明目标，「点击这里」脱离上下文后没有信息量，屏幕阅读器逐个朗读链接时也无法区分。

## 图片

`img` 是空元素，通过 `src` 指定图片地址。三个属性必须重视：

- `src`:图片地址；
- `alt`:替代文本，图片无法显示或被屏幕阅读器朗读时使用；装饰图写 `alt=""`;
- `width` 与 `height`:给出固有尺寸，浏览器提前预留空间，减少布局偏移；CSS 可以再缩放。

`loading="lazy"` 让浏览器推迟加载视口外的图片；首屏图片不要加，避免拖慢最大内容绘制。

```html
<img src="./images/logo.png" alt="示例公司标志" width="120" height="40">
<img src="./images/trend.png" alt="2026 年上半年销售额逐月上升" width="640" height="360" loading="lazy">
```

预期：第一张随页面加载；第二张在接近视口时才发起请求，DevTools 的 Network 面板可以看到请求时机。

## 路径与实体

路径分三类：

- 相对路径：以当前文档的 URL 为基准，`./images/a.png` 与 `images/a.png` 等价，`../` 表示上一级；
- 站点绝对路径：以 `/` 开头，相对于站点根，例如 `/images/a.png`;
- 完整 URL:包含协议与域名，用于外部资源。

HTML 中的 `<`、`>`、`&` 有语法含义，要在文本里显示它们必须用字符实体(character entity):

```html
<p>比较运算符:5 &lt; 10 &amp;&amp; 10 &gt; 5。</p>
<p>&copy; 2026 示例公司</p>
```

预期显示：比较运算符：5 < 10 && 10 > 5。以及 © 2026 示例公司。常用实体还有 `&quot;`、`&apos;`、`&nbsp;`;`&nbsp;` 是不换行空格，不应用来排版缩进，缩进交给 CSS。

## 小结

- `h1` 到 `h6` 表示层级，一页一个 `h1`，不跳级，字号交给 CSS;
- `p` 表示段落，`br` 只用于段内换行，连续空白会折叠；
- `ul`、`ol`、`dl` 组织列表，嵌套列表放在 `li` 内；
- `strong` 与 `em` 带语义，`b` 与 `i` 只改字形；
- `a` 的 `target="_blank"` 要配 `rel="noopener"`;`img` 必写 `alt`，给出 `width` 与 `height`，视口外图片用 `loading="lazy"`;
- 路径分清相对、站点绝对与完整 URL；保留字符用实体显示。
