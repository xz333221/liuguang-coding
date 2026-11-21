---
title: 教程与文档怎么用：MDN、javascript.info 与社区
summary: '查 API 去 MDN，补基础去 javascript.info，报错去 Stack Overflow，库行为去 GitHub 的 issue 与 release notes。来源选错，就会拿五年前博客答案改今天的代码。'
category: frontend
node: frontend-practice-docs
order: 115
level: 入门
tags: [MDN, 文档, 搜索, 版本, 社区]
updated: 2026-11-19
mindmap: practice-docs.mindmap.json
terms: []
sources:
  - title: MDN · 关于 MDN
    url: https://developer.mozilla.org/zh-CN/docs/MDN/About
    note: MDN 的内容来源、浏览器兼容性数据的维护方式。
  - title: javascript.info 中文
    url: https://zh.javascript.info/
    note: 教程的分块结构与每节末尾的任务设计。
  - title: GitHub Docs · Searching issues and pull requests
    url: https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests
    note: label、is:issue、repo 等限定符的用法。
---

站点上线了，之后大部分时间花在「这个东西到底怎么用」上。同样一个问题，查 MDN 只要一分钟，跟着一篇三年前的博客改要半小时，最后还可能改错。区别不在聪明程度，在知道每类问题该去哪个来源。

## 四种来源，四类问题

| 来源 | 回答什么问题 | 典型场景 | 可信度 |
| --- | --- | --- | --- |
| 规范(WHATWG、TC39、W3C) | 行为「应该」是什么 | 边界情况、浏览器行为不一致 | 最高，但读起来最慢 |
| MDN | 这个 API 怎么用、支持哪些浏览器 | 查方法签名、兼容性 | 高，有编辑审核 |
| javascript.info | 这块知识整体怎么串起来 | 系统补基础、理解机制 | 高，偏教学 |
| GitHub issue / release notes | 这个库这个版本为什么这样 | 升级报错、疑似 bug | 高，但要认版本 |
| 博客、视频、AI 回答 | 别人的理解 | 找思路、看演示 | 不定，要回到上面四类验证 |

判断一篇资料值不值得信，看两件事：有没有给出处，有没有标版本。两条都没有，读完也只能当参考。

## MDN:先看语法，再看兼容性

一个 API 页面从上到下是固定结构：概述、语法、参数、返回值、示例、规范链接、浏览器兼容性。查用法看前四段就够，判断能不能用看最后一段。

兼容性表里每个浏览器一列，格子里的数字是「从这个版本开始支持」:

```text
Chrome  Edge   Firefox  Safari
  102    102     101      15.4     ← 数字是起始版本
  ✕      ✕       ✕        9.1      ← 叉号表示完全不支持
  80*    80*     72       14       ← 星号脚注:部分支持,备注说明差在哪
```

星号必须点开看。很多 API 是「支持，但某个参数不支持」或者「需要加前缀」，只看到版本号会得出错误结论。判断「今天能不能用」时先想清楚要支持哪些浏览器，只盯那几列，剩下的扫一眼就够。

页面上方的「实验性」标记意味着规范还没定稿，浏览器随时可能改行为。生产项目里用它，要准备降级方案。

规范链接在页面底部，指向 WHATWG 或 TC39 的原文。日常不用读，但遇到「浏览器行为不一致」「文档说法含糊」时必须看：规范里写的是 `undefined` 还是 `null`，是同步还是微任务，这类细节只有原文准确。

中文页面由志愿者翻译，新 API 常常滞后几个月。页首的语言选择器切到 English，或者把 URL 里的 `zh-CN` 换成 `en-US`，内容通常更全。术语看不懂时再切回中文对照。

## javascript.info:按章节读，不按需查

这个站的定位是教程，不是参考手册。它的结构分三块：JavaScript 语言本身、浏览器相关(DOM、事件、网络请求)、以及一些专题(正则、动画、Web Components)。

每一节末尾有任务，带折叠答案。任务不是练习册，是用来检查「刚才那段话是不是真懂了」。读完闭包那节直接做任务，比读三遍正文有效。

它适合的场景是系统补齐：比如发现自己对原型链、事件循环、微任务这几块一直是模糊的，就从对应章节顺着读一遍。不适合的场景是查某个方法的参数顺序，那种问题 MDN 更快。

两边内容重叠很多，取舍看目的：要「知道怎么用」去 MDN，要「知道为什么这样」去 javascript.info。第 6 章到第 9 章很多篇的讲法就参考了它的顺序。

## 搜报错：关键词要提炼

把控制台的报错整段粘进搜索框，通常搜不到东西，因为里面混着文件路径、变量名、业务数据。先删掉这些，只留错误类型和关键 API:

```text
改写前:
TypeError: Cannot read properties of undefined (reading 'map') at OrdersList (http://localhost:5173/src/views/OrdersList.jsx:24:18)

改写后:
"TypeError: Cannot read properties of undefined" react list map
```

三条经验：

- 用双引号包住完整报错，搜索引擎会按短语匹配；
- 加上框架名或 API 名，能把结果从几十万条缩到几百条；
- 加 `site:developer.mozilla.org` 或 `site:github.com`，直接限定来源。

Stack Overflow 上先看被采纳的答案，再看票数最高的，两者不一致时优先看日期靠后的。前端生态五年前的「最佳实践」经常已经废弃，典型如 `var that = this`、`componentWillMount`、`$.ajax`。答案里如果没写版本号，去 MDN 或官方文档确认一遍再抄。

问题被关闭为 duplicate 时，顺着链接跳到原始问题，那里的答案通常更完整。

## GitHub:issue 与 release notes

库的行为和文档不一致时，issue 区是唯一的事实来源。搜索用限定符：

```text
repo:vercel/next.js is:issue label:"bug" "hydration failed"
repo:vitejs/vite is:issue is:closed "proxy" "504"
```

`is:closed` 很有用：你遇到的问题大概率已经有人报过，也已经修了或者解释了。看关闭原因比看回复更有价值，「won't fix」和「fixed in 5.2」是两种完全不同的结论。

版本对不上时，先确认本地装的是哪个版本：

```bash
npm ls vite                 # 实际装了什么
npm view vite version       # registry 上最新稳定版
npm view vite versions --json | tail -20   # 最近的版本列表
npm outdated                # 哪些依赖落后于声明范围
```

`package.json` 里写 `^5.0.0`，装上的可能是 `5.4.11`，而 issue 说的是 `5.2.3`，讨论的就不是同一份代码。贴 issue 时把 `npm ls` 的输出一起贴上，能省一轮来回。

release notes 在仓库的 Releases 页，重点看 `Breaking Changes` 一节。次版本号里出现行为变更很常见，尤其在大版本刚发布的几个月。CHANGELOG 按 semver 组织，补丁版本一般是修 bug，次版本加功能，主版本才允许破坏性变更，但这个约定很多库执行得不严格。

升级前读一遍目标版本的 release notes，比升级后对着报错猜要快得多。第 10 章讲依赖管理时提过 lockfile 的作用，它是让「本地版本」和「issue 里的版本」对得上的前提。

## 不要用二手资料替代一手文档

二手资料的问题不是错，是「曾经对」。它们省略版本、省略前提、省略边界，读者照着做，错了也不知道错在哪一步。

遇到下面几种情况，必须回到一手来源：

- 参数顺序、返回值类型、异常行为：以 MDN 为准；
- 浏览器支持范围：以 MDN 的兼容性表或 Can I use 为准；
- 库的配置项与默认值：以官方文档为准，别看博客的截图；
- 「为什么我的代码不生效」:以 issue 与 release notes 为准；
- 语言层面的边界行为：以规范原文为准。

一手文档读起来慢，但它给出的信息密度高，而且不需要二次验证。长期看，这是最省时间的路径。

## 三个查文档时容易踩的坑

- 用中文关键词搜报错：中文内容重复率高，多数还是从英文转译的。先用英文错误串搜一遍，再回中文找解释，命中率差一个量级；
- 看到「最新版」就照着配：文档站默认展示主分支，和本地装的可能差一个大版本。页面上一般有版本切换器，选与 `package.json` 一致的那一份；
- 把示例代码当完整代码：MDN 与官方示例都省略了上下文，直接粘进项目往往缺 import、缺类型、缺初始化。示例要看的是调用形状，不是复制粘贴。

## 小结

- 规范定行为，MDN 查用法与兼容性，javascript.info 补体系，issue 与 release notes 定版本行为；
- MDN 的兼容性表看起始版本与星号脚注，中文页滞后时切英文；
- javascript.info 按章节顺序读，任务用来验证是否真懂；
- 搜报错先去掉路径与变量名，用引号包住完整错误，再加框架名限定；
- 看 Stack Overflow 答案先确认版本与日期，过期写法比没有答案更危险；
- 库的行为以 issue 和 release notes 为准，贴问题时带上 `npm ls` 的输出。
