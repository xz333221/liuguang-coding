---
title: 国际化：文案组织、日期数字与复数
summary: '难点不在翻译,在句子结构、复数规则和时区。文案按 key 存、整句带占位符,复数交给 ICU 与 Intl.PluralRules,日期数字交给 Intl,时间以 UTC 存、按 IANA 时区显示。'
category: frontend
node: frontend-i18n-copy
order: 105
level: 进阶
tags: [国际化, i18n, Intl, 复数, 时区]
updated: 2026-11-19
mindmap: i18n-copy.mindmap.json
terms: []
sources:
  - title: MDN · Intl
    url: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl
    note: NumberFormat、DateTimeFormat、PluralRules 等构造函数的用法。
  - title: Unicode · MessageFormat 指南
    url: https://unicode-org.github.io/icu/userguide/format_parse/messages/
    note: ICU 消息语法中 plural 与 select 的写法。
  - title: MDN · 全局属性 lang
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTML/Global_attributes/lang
    note: 语言标记对朗读、断词与样式的影响。
---

上一篇讲读屏怎么把内容念出来。念得对的前提是文案本身能随语言变化,而中文句子直接写进模板,换一种语言就连语序都对不上。这一篇处理文案、数字、日期和复数这四件事。

## 文案与代码分离

所有面向用户的文字放进资源文件,组件里只引用 key:

```json
{
  "cart": {
    "title": "购物车",
    "itemCount": "{count, plural, =0 {购物车是空的} other {# 件商品}}",
    "checkout": "去结算"
  },
  "error": {
    "network": "网络连接失败,请稍后重试"
  }
}
```

key 按页面或模块分组,用英文短语,不要拿中文原文当 key。中文一改 key 就失效,而且同一个词在不同语境下翻译可能不同,「提交」在表单和代码评审里不是一回事。

资源文件里也不要塞 HTML。`"tip": "点击<b>这里</b>继续"` 把标签和文案绑死,翻译者可能改坏标签,后端还会把它当纯文本转义。需要强调时,用占位符传组件,或者把整句拆成带链接的复合结构。

## 不要拼接句子

最常见的错误是按语法成分拼:

```js
// 错:中文语序恰好成立,换了语言就不成立
const message = `已删除 ${count} 个文件`
```

中文是「动词 + 数量 + 量词 + 名词」,英文是「数量 + 名词 + 动词」,日语把动词放句末。三段拼接在一种语言里读得通,在另一种语言里就是病句,翻译者也无从调整顺序,因为顺序写在代码里。

正确做法是整句作为一个 key,变量做占位符:`{count} 个文件已删除`。数字、名称、单位都通过参数传入,翻译者看到的是完整句子。

同理,不要用字符串加法处理标点。英文逗号后要空格,中文不用;引号在法语里是「»,在德语里是 „“。这些都归翻译,不归代码。

## ICU 的复数与选择

数量是最容易写错的部分。英文 `1 file` 和 `2 files` 是两种形式,中文只有一种,俄语有四种,阿拉伯语有六种。ICU MessageFormat 用 `plural` 表达数量,用 `select` 表达分支:

```text
{count, plural,
  =0 {没有文件}
  one {# 个文件}
  other {# 个文件}}

{role, select,
  owner {你是所有者,可以转让}
  admin {你是管理员,可以编辑}
  other {你是访客,只能查看}}
```

- `=0` 是精确匹配,优先级最高;
- `one`、`other` 等是复数类别,由语言决定有几类;
- `#` 会被替换成格式化后的数字,不用自己再插一遍。

`other` 必须写,缺了会直接报错。中文的 `plural` 只有 `other` 一类,中文资源里写一个分支就够,`#` 依然生效。`select` 按字符串精确匹配,不是布尔判断,同样要提供 `other` 兜底,否则后端拿到未知值时格式化会失败。

## 复数类别不止两种

同一套模板要在每种语言里给出对应的分支。常见语言的类别:

| 语言 | 复数类别 | 例子 |
|---|---|---|
| 中文、日文、韩文 | other | 1 个、2 个、5 个同形 |
| 英文 | one、other | 1 file,2 files |
| 俄文 | one、few、many、other | 1 файл,2 файла,5 файлов |
| 波兰文 | one、few、many、other | 1 plik,2 pliki,5 plików |
| 阿拉伯文 | zero、one、two、few、many、other | 0、1、2、3 到 10、11 到 99、100 以上 |

判断落在哪一类不要自己写条件。用 `Intl.PluralRules`:

```js
const ru = new Intl.PluralRules('ru')
ru.select(1)  // 'one'
ru.select(2)  // 'few'
ru.select(5)  // 'many'

const enOrdinal = new Intl.PluralRules('en', { type: 'ordinal' })
enOrdinal.select(1)  // 'one'
enOrdinal.select(3)  // 'few'
enOrdinal.select(4)  // 'other'
```

`type: 'ordinal'` 处理第几,英文的 1st、2nd、3rd、4th 就是四个类别。默认的 `cardinal` 处理数量。数字是 `1.5` 这类小数时,类别可能和整数不同,`PluralRules` 一并处理了,手写 `n === 1` 处理不了。

## 数字与日期交给 Intl

小数点和千分位不是通用的。`1234.5` 在德语里写作 `1.234,5`,在法语里小数点用逗号、千分位用窄空格。日期顺序、月份名称、12 小时制与 24 小时制同样随语言变。

```js
const amount = 1234.5

new Intl.NumberFormat('de-DE').format(amount)                       // 1.234,5
new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
  .format(amount)                                                   // ¥1,234.50

const when = new Date('2026-11-19T00:00:00Z')
new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'long',
  timeZone: 'Asia/Shanghai',
}).format(when)                                                     // 2026年11月19日

new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }).format(-1, 'day')  // 昨天
```

三条原则:

- 传明确的 locale,不要依赖运行环境默认值。不传时用的是系统语言,开发机和 CI 机器的结果可能不同,快照测试会挂;
- 用 `dateStyle` 与 `timeStyle`(`full`、`long`、`medium`、`short`),比自己拼 `${year}年${month}月` 更省事,也自动适配语言;
- 货币用 `style: 'currency'` 加三字母代码,不要手动拼 `¥`。日元和人民币都用 `¥`,代码不同。

`Intl.RelativeTimeFormat` 适合「3 天前」这类文案,`numeric: 'auto'` 会让它输出「昨天」「上周」而不是「1 天前」。

## 时区与存储

时间在存储和传输时统一用 UTC,以 ISO 8601 字符串或时间戳保存;只在展示时转成用户所在时区。

用户所在时区从 `Intl.DateTimeFormat().resolvedOptions().timeZone` 拿,返回值是 IANA 名,例如 `Asia/Shanghai`。展示时把这个名字传给 `timeZone`,不要自己加减 8 小时:中国没有夏令时,但用户可能在任何时区,巴西、埃及这些地方历史上多次调整过偏移量。

不要把 `+08:00` 这类固定偏移当成时区保存。偏移只描述某一刻,时区描述规则,包含夏令时的起止日期。存了偏移,半年后显示的时间就会差一小时。

服务端渲染时尤其要注意:服务器时区通常是 UTC,`toLocaleString()` 不传 `timeZone` 会按服务器时区格式化,同一份数据在不同机房渲染出不同结果。

## lang 与语言回退

`<html lang="zh-CN">` 告诉浏览器和读屏页面用什么语言,影响断词、拼写检查、朗读发音,也影响 `:lang()` 选择器。页面里混入其他语言时,局部再标一次:

```html
<html lang="zh-CN">
  <body>
    <p>这个 API 的名字是 <span lang="en">Application Programming Interface</span>。</p>
  </body>
</html>
```

不标 `lang` 的英文片段,中文语音包会按拼音去读,听起来完全无法理解。语言标记用 BCP 47 格式:语言加可选地区,`zh-CN`、`en-US`、`pt-BR`。

回退链要想清楚:请求 `zh-TW` 没有对应资源时退到 `zh`,再退到默认语言。缺 key 时不要静默显示 key 名,把缺失项打日志,上线前用脚本对比各语言资源的 key 集合。

## 小结

- 文案按 key 存进资源文件,key 用语义化英文,不放 HTML;
- 整句作为一个 key 加占位符,不要拼接语法片段,语序归翻译;
- 复数用 ICU `plural`,必须提供 `other`,类别判断交给 `Intl.PluralRules`;
- 数字、货币、日期、相对时间都走 `Intl`,显式传 locale;
- 时间以 UTC 存储,展示时用 IANA 时区名转换,不保存固定偏移;
- `lang` 标在 `html` 上,混排的外语片段局部再标。
