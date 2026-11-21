---
title: 正则表达式：Pattern / Matcher 与常用写法
summary: '正则用一套规则描述字符串模式。Java 里反斜杠要双写；matches 是全匹配，find 是找子串；分组用括号，取内容用 Matcher.group。循环里用的正则先 Pattern.compile 缓存。'
category: java
node: java-core-regex
order: 33
level: 入门
tags: [正则, Pattern, Matcher, 分组, 贪婪]
updated: 2026-11-18
mindmap: java-core-regex.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · 正则表达式简介
    url: https://liaoxuefeng.com/books/java/reg-exp/general/index.html
    note: 正则用途与 Java 字符串转义的讲解参照。
  - title: 廖雪峰 Java 教程 · 匹配规则
    url: https://liaoxuefeng.com/books/java/reg-exp/match-rules/index.html
    note: 字符类、重复修饰符与复杂匹配规则参照。
  - title: 廖雪峰 Java 教程 · 分组匹配
    url: https://liaoxuefeng.com/books/java/reg-exp/group/index.html
    note: Pattern / Matcher 与分组提取参照。
  - title: 菜鸟教程 · Java 正则表达式
    url: https://www.runoob.com/java/java-regular-expressions.html
    note: Pattern / Matcher 用法对照。
---

校验手机号、提取日志里的时间、把一串分隔符统一成逗号——这类「按模式处理字符串」的活，正则表达式是标准工具。它本身是一门独立的小语言，这篇讲 Java 里怎么用，规则只覆盖日常够用的部分。

## 第一个正则

```java
"abc".matches("abc");    // true
"Abc".matches("abc");    // false,大小写敏感
"abcd".matches("abc");   // false,matches 要求整个串完全匹配
```

String.matches 判断**整个字符串**是否匹配规则。注意最后一条：它不是「包含」，是全匹配。

Java 里正则写在字符串里，反斜杠要双写：正则的 `\d` 对应 Java 字符串 `"\\d"`。第一层转义是 Java 字符串的，第二层才是正则的。看到 `\\\\` 别慌，那只是正则里的一个 `\`。

## 基本规则速查

单个字符：

| 规则 | 匹配 |
|---|---|
| `.` | 任意一个字符 |
| `\d` | 一个数字，`\D` 是非数字 |
| `\w` | 一个字母 / 数字 / 下划线，`\W` 取反 |
| `\s` | 一个空白(空格、\t 等),`\S` 取反 |
| `[abc]` | a、b、c 中的一个 |
| `[a-z]` | 一个小写字母 |
| `[^abc]` | 除 a、b、c 外的一个字符 |

重复(跟在某个规则后面):

| 修饰符 | 含义 |
|---|---|
| `*` | 0 个或多个 |
| `+` | 1 个或多个 |
| `?` | 0 个或 1 个 |
| `{n}` | 恰好 n 个 |
| `{n,m}` | n 到 m 个 |
| `{n,}` | 至少 n 个 |

组合：`A\d{3}` 匹配 A380;`0\d{2,3}-\d{7,8}` 匹配 010-12345678 这类国内电话。

其他：`|` 是或，`abc|def` 匹配两者之一；`^` 锚定开头，`$` 锚定结尾；特殊字符(. * + 等)要匹配本身，前面加 `\`。

## 分组：把一部分圈出来

括号把规则分组，匹配后能把各组的内容单独取出来。这要用 Pattern 和 Matcher:

```java
Pattern p = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
Matcher m = p.matcher("今天是 2026-11-18,明天是 2026-11-19");
while (m.find()) {
    System.out.println(m.group(0));   // 2026-11-18,整个匹配
    System.out.println(m.group(1));   // 2026,第一组
    System.out.println(m.group(2));   // 11
    System.out.println(m.group(3));   // 18
}
```

三个角色分工：

- Pattern:编译好的正则，不可变，线程安全；
- Matcher:拿着 Pattern 去某个字符串上匹配的引擎，有状态，不线程安全；
- group(0) 是整个匹配，group(n) 是第 n 个括号组，从 1 数。

find() 是「找下一个匹配的子串」，循环调就能遍历所有匹配；matches() 是全匹配；lookingAt() 是从头匹配但不要求到末尾。提取用 find，校验用 matches。

**循环里用的正则，先 compile 成 static final Pattern。** String.matches 每次调用都重新编译正则，高频调用白白烧 CPU。

## 贪婪与非贪婪

重复修饰符默认贪婪：尽可能多吃。

```java
Pattern p = Pattern.compile("<.+>");
Matcher m = p.matcher("<b>粗体</b>");
m.find();
m.group();   // "<b>粗体</b>",一口吞到最后一个 >
```

想只匹配到第一个 >，修饰符后加 `?` 变非贪婪：

```java
Pattern.compile("<.+?>").matcher("<b>粗体</b>").find();
// 匹配 "<b>"
```

`*?`、`+?`、`??` 同理。提取 HTML 标签、引号内容这类「到最近的边界为止」的场景，用非贪婪。

顺带一个警告：嵌套量词(如 `(a+)+`)配上不匹配的输入，回溯次数会指数爆炸，一个正则能把 CPU 打满。写复杂正则时避免量词套量词，拿不准就用在线工具测一下边界输入。

## 替换与分割

String 的三个方法参数是正则：

```java
"A,,B;C ,D".replaceAll("[,;\\s]+", ",");   // "A,B,C,D"
"hello123world".replaceFirst("\\d+", "#"); // "hello#world"
"a1b2c3".split("\\d");                     // ["a","b","c"]
```

而 replace('x','y') 和 replace("x","y") 是**字面量**替换，不走正则。想按字面量替换特殊字符(比如把 "." 换成 "-")，用 replace，别用 replaceAll——后者会把 "." 当任意字符，全串遭殃。

split 的易错点前面字符串篇提过：按点分割写 `split("\\.")`。

## 常用例子

```java
// 手机号(11 位,1 开头)
"13812345678".matches("1\\d{10}");

// 简单邮箱校验(够用级别,严格版很长)
"me@flowdash.cn".matches("[\\w.]+@[\\w.]+");

// 日期
"2026-11-18".matches("\\d{4}-\\d{2}-\\d{2}");

// 提取时间戳里的时分秒
Pattern.compile("(\\d{2}):(\\d{2}):(\\d{2})");
```

正则校验邮箱、URL 这类复杂格式，网上有成熟表达式，理解后复用，不必从零编写。校验只是第一道门，业务合法性(日期是否真实存在等)还得代码再查。

## 小结

- matches 全匹配，find 找子串；Java 字符串里反斜杠双写；
- 字符类 \d \w \s 与 []，重复 * + ? {n,m}，或 |，锚 ^ $;
- 分组用括号，Matcher.group(n) 取内容；Pattern 编译一次复用，Matcher 每次新建；
- 默认贪婪，加 ? 变非贪婪；避免量词嵌套导致回溯爆炸；
- replaceAll / replaceFirst / split 走正则，replace 是字面量。