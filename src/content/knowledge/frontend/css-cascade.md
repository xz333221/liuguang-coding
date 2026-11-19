---
title: 层叠、优先级与继承
summary: '多条规则命中同一元素时,浏览器按来源与重要性、优先级、源码顺序三步选出胜者,这套算法叫层叠。优先级用 (行内, ID, 类/属性/伪类, 类型/伪元素) 四元组比较;可继承的属性默认从父元素取值,并可用 inherit/initial/unset/revert 改写。样式不生效时按选择器、优先级、层叠三步排查。'
category: frontend
node: frontend-css-cascade
order: 11
level: 入门
tags: [CSS, 层叠, 优先级, 继承]
updated: 2026-11-19
mindmap: css-cascade.mindmap.json
terms: []
sources:
  - title: MDN · 层叠
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/Cascade
    note: 来源顺序、重要声明与层叠算法的定义。
  - title: MDN · 优先级
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/Specificity
    note: 四元组计算方式与比较规则。
  - title: 'web.dev · Learn CSS: The cascade'
    url: https://web.dev/learn/css/the-cascade
    note: 层叠、继承与来源顺序的入门讲解。
---

上一篇用选择器确定了样式作用在哪些元素上。实际页面里往往有多条规则同时命中一个元素,最终哪一条生效,由层叠决定。

## 层叠解决什么问题

层叠(cascade)是浏览器处理样式冲突的算法:对每一个元素、每一个属性,收集所有命中的声明,排序后取最高的一条。排序依次比较三个因素:来源与重要性、优先级、源码顺序。前一个因素分出胜负就不再往下比较。

不冲突的属性不会互相覆盖。`color` 来自一条规则,`padding` 来自另一条规则,两者同时生效,层叠只在同一个属性出现多个值时起作用。

## 来源与 !important

声明的来源有四类:

1. **用户代理样式**:浏览器内置的默认样式,例如 `h1` 的字号与 `p` 的外边距;
2. **用户样式**:用户在浏览器设置或扩展中指定的样式,日常开发很少遇到;
3. **作者样式**:页面自己引入的 CSS,也就是我们写的部分;
4. **动画**:`@keyframes` 运行期间产生的声明。

普通声明中,作者样式覆盖用户代理样式,动画期间的声明又高于普通作者声明。加 `!important` 会把声明移入重要声明的序列,这个序列的来源顺序与普通声明相反:用户代理的重要声明高于用户的重要声明,用户的重要声明高于作者的重要声明。对页面作者而言,关键结论是自己写的 `!important` 压不过用户设置的 `!important`,这是为可访问性保留的通道。

```css
p { color: #333 !important; }
```

`!important` 不应作为处理优先级的手段。它一旦出现,后续想覆盖同一条属性就只能继续加 `!important`,不同文件之间还会互相竞争。它适合的场景很窄:覆盖第三方组件的内联样式,或在打印样式里强制某些值。

## 优先级

优先级(specificity)衡量选择器本身的权重,用四元组表示,从左到右比较:

| 组成部分 | 记法 | 示例 |
| --- | --- | --- |
| 行内 style 属性 | 1,0,0,0 | `style="color: red"` |
| ID 选择器 | 0,1,0,0 | `#intro` |
| 类、属性、伪类 | 0,0,1,0 | `.note`、`[type="text"]`、`:hover` |
| 类型、伪元素 | 0,0,0,1 | `p`、`::before` |

通配选择器 `*` 与组合器不增加权重。同一个类重复写会累加,`.note.note` 是 0,0,2,0。

```css
#intro { color: red; }
.note { color: blue; }
p { color: green; }
```

对 `<p id="intro" class="note">文本</p>`,`#intro` 的 0,1,0,0 最高,文字为红色;去掉 ID 后 `.note` 胜出。

行内样式高于所有选择器,只有带 `!important` 的声明能超过它。这也解释了为什么在 DevTools 里临时改样式容易失效:面板写入的是行内 style,而原规则可能带 `!important`。

## 源码顺序

来源与优先级都相同时,后出现的声明胜出。这里的「后」指浏览器读到的顺序:外链样式表按 `<link>` 在文档中的位置排列,`<style>` 与行内样式按出现位置排列。

```html
<link rel="stylesheet" href="./base.css">
<link rel="stylesheet" href="./theme.css">
```

两条规则优先级相同且都设置 `body` 背景时,`theme.css` 生效,因为它在后面。习惯上把基础样式放在前面,主题与覆盖样式放在后面。

## 继承与四个关键字

继承(inheritance)指元素没有为某个属性声明值时,取父元素的计算值。默认会继承的是文本相关属性:`color`、`font-family`、`font-size`、`line-height`、`text-align`、`visibility`、`cursor` 等。盒模型、背景、边框不继承,否则每个子元素都会重复父元素的边框。

可以用关键字显式控制:

- `inherit`:强制取父元素的值;
- `initial`:取属性的初始值,注意不是浏览器默认样式,`display` 的初始值是 `inline`;
- `unset`:可继承属性按 `inherit` 处理,不可继承属性按 `initial` 处理;
- `revert`:回退到上一层来源的值,作者样式回退后通常得到用户代理的默认样式。

```css
.card { color: #222; }
.card a { color: inherit; }  /* 链接跟随卡片文字色,不用浏览器默认蓝色 */

h2 { all: unset; }           /* 清除全部声明,包括浏览器默认的 display 与字号 */
```

`all: unset` 会把 `h2` 变成行内元素并继承正文字号,想保留标题外观需要重新声明 `display`、`font-size`、`font-weight`。清除默认样式时优先逐条重置,`all` 的影响范围太大。

## 为什么样式不生效

遇到「写了但没生效」,按顺序检查三件事,不要凭感觉反复加选择器:

1. **选择器是否命中。** 在 DevTools 的 Elements 面板选中元素,看 Styles 面板里有没有这条规则。没有出现就是没匹配:检查类名拼写、层级关系、类是否由脚本在渲染后才加上。
2. **是否被更高优先级覆盖。** 规则出现了但属性值被划掉,把指针移到划掉的声明上,面板会显示覆盖它的规则与文件位置。
3. **是否被层叠顺序或 `!important` 决定。** 两条规则优先级相同,后加载的胜出;带 `!important` 的声明会压过普通声明。

```html
<style>
  .card p { color: #666; }
  #main p { color: #111; }
</style>

<main id="main">
  <div class="card"><p>文本</p></div>
</main>
```

`.card p` 的优先级是 0,0,1,1,`#main p` 是 0,1,0,1,后者胜出,文字为 `#111`。DevTools 的 Computed 面板显示最终计算值,并给出取值来源的链接;Rules 面板里可以看到败方被划线。两个面板配合,能定位绝大多数样式冲突。

## 小结

- 层叠对每个属性按来源与重要性、优先级、源码顺序依次比较;
- 来源分为用户代理、用户、作者与动画,`!important` 提升重要性并反转来源顺序;
- 优先级按行内、ID、类/属性/伪类、类型/伪元素四元组比较,组合器不加权;
- 来源与优先级相同时,后出现的声明胜出;
- 文本属性默认继承,`inherit`、`initial`、`unset`、`revert` 可以改变取值来源;
- 排查样式问题先确认选择器命中,再看优先级,最后看层叠与 `!important`。
