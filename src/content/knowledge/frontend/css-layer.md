---
title: '@layer、@scope 与样式隔离'
summary: '@layer 把样式按声明顺序分层,未分层的普通声明强于所有分层声明;@scope 把规则限制在 DOM 子树内,两者在不提高选择器权重的前提下控制覆盖关系与作用范围。'
category: frontend
node: frontend-css-layer
order: 23
level: 进阶
tags: [CSS, '@layer', '@scope', 样式隔离]
updated: 2026-11-19
mindmap: css-layer.mindmap.json
terms: []
sources:
  - title: MDN · @layer
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@layer
    note: 层的声明顺序、嵌套层与未分层样式的优先级规则。
  - title: MDN · @scope
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/@scope
    note: 作用域上下边界与选择器匹配范围。
  - title: web.dev · Learn CSS
    url: https://web.dev/learn/css
    note: 层叠、继承与层组织的整体讲解。
---

上一篇把颜色与间距收进自定义属性,令牌解决了「用哪个值」,没有解决「谁覆盖谁」;这一篇处理覆盖顺序与作用范围。

## 权重之外的排序

CSS 的层叠按来源、重要性、权重、源码顺序决定胜者。项目变大后,常见做法是不断加深选择器或追加 `!important` 来压过已有规则,结果每条规则都更难改。`@layer` 在权重之外增加一层排序,`@scope` 则限制规则能够匹配的范围。

## 声明层顺序

`@layer` 先声明顺序,再往里写规则:

```css
@layer reset, base, components, utilities;

@layer base {
  a { color: var(--color-brand); }
}

@layer components {
  .button { color: #ffffff; }
}
```

层名在第一条语句里出现的顺序就是优先级:列表靠后的层覆盖靠前的层。`utilities` 排在最后,工具类总能覆盖组件样式,不需要提高选择器权重。没有在列表里声明的层,按第一次出现的顺序追加到末尾。

层可以嵌套:

```css
@layer components {
  @layer buttons, forms;

  @layer buttons { .button { padding: 8px 16px; } }

  @layer forms {
    .field { margin-bottom: 16px; }
  }
}
```

子层只在本层内部排序。外部看到的是 `components` 整体;`components.buttons` 与 `components.forms` 的比较只在 `components` 内进行。

## 未分层样式优先

没有包进任何 `@layer` 的作者样式,在普通声明中排在最前 —— 比所有分层样式都强。这条规则常被忽略:

```css
@layer base {
  a { color: #2f6fed; }
}

a { color: #b42318; }
```

链接是红色。未分层规则不参与层的排序,直接压过分层规则,哪怕它的选择器更简单。引入分层后,要么把存量样式全部纳入层,要么接受未分层样式作为最高优先级。

`!important` 的方向相反。对重要声明,层顺序倒过来:先声明的层更强,并且所有分层的重要声明都强于未分层的重要声明。这样底层可以放无障碍相关的强制规则,不被上层覆盖。

## 与 !important 的交互

把两边合起来看:

- 普通声明: 未分层 > 后层 > 前层;
- 重要声明: 前层 > 后层 > 未分层。

```css
@layer base {
  .visually-hidden { position: absolute !important; }
}

@layer utilities {
  .hidden { display: none !important; }
}
```

`base` 在前,它的 `!important` 压过 `utilities` 的 `!important`。如果希望工具类始终能关掉某条样式,就不要给工具类加 `!important`,改为在普通声明里让 utilities 排在最后。`!important` 在分层后的方向与直觉相反,是这一节最容易错的地方。

在层内使用 `revert-layer` 可以把属性回退到前一层的计算结果,适合组件默认值;它只回退一个属性,与 `revert` 回到用户代理样式不同。

## 管理第三方样式

第三方 CSS 通常不希望参与自己的权重竞争,包进一个靠前的层即可:

```css
@layer vendor, base, components, utilities;
@import url("./vendor.css") layer(vendor);
```

`@import` 必须位于样式表开头(除 `@charset` 与 `@layer` 语句外),`layer()` 把导入内容整体放进指定层。也可以在构建工具里配置,不必修改第三方源码。

## @scope

`@scope` 划定规则的适用范围,并提供可选的下边界:

```css
@scope (.card) to (.card__body) {
  img { border-radius: 4px; }
  .title { font-size: 18px; }
}
```

规则只在 `.card` 子树内匹配,遇到 `.card__body` 就不再深入。省略 `to` 时只限制上边界。`@scope` 本身不增加选择器权重,内部选择器按原有方式计算;需要调整优先级时仍用 `:where()` 或层。

浏览器支持: Chrome 118、Safari 17.4 起提供支持,Firefox 在后续版本跟进。生产环境若需兼容旧浏览器,可以用后代选择器或 CSS Modules 达到近似效果,`@scope` 作为增强。

## Shadow DOM 的隔离层次

Shadow DOM 是浏览器级封装:外部样式默认进不到影子树,只有可继承属性、`::part()` 与自定义属性等少数通道能穿透。`@layer` 与 `@scope` 处理的是同一文档内的顺序与范围,不替代 Shadow DOM,二者解决的问题不同。

## 完整分层示例

```css
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
}

@layer base {
  :root { --space-2: 8px; --color-border: #d0d7de; }
  body { margin: 0; font: 16px/1.6 system-ui, sans-serif; }
  a { color: #2f6fed; }
}

@layer components {
  .card {
    padding: calc(var(--space-2) * 3);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }
}

@layer utilities {
  .mt-4 { margin-top: 16px; }
}
```

预期结果:`.card` 的内边距来自 components;给同一个元素再加 `mt-4` 时,外边距由 utilities 决定。后续新增层只要排在 `utilities` 之前,就无法覆盖工具类。样式表的加载顺序不再影响结果,覆盖关系由层声明集中管理。

## 小结

- `@layer` 按声明顺序排序,后层覆盖前层;
- 未分层的普通声明强于所有分层声明;
- `!important` 让层顺序反转,前层更强,分层的重要声明强于未分层;
- 第三方 CSS 用 `@import ... layer()` 或构建配置包进低优先级层;
- `@scope` 限制匹配范围,不增加权重,兼容旧浏览器时作为渐进增强;
- Shadow DOM 提供浏览器级隔离,与层、作用域属于两个层次。
