---
title: 字符串与编码 / StringBuilder
summary: 'String 不可变,所有「修改」方法都返回新串;比较用 equals。编码转换必须显式指定 UTF-8。循环拼接用 StringBuilder,StringJoiner 负责带分隔符的拼接。'
category: java
node: java-core-string
order: 27
level: 入门
tags: [String, StringBuilder, 编码, UTF-8, 不可变]
updated: 2026-11-18
mindmap: java-core-string.mindmap.json
terms: ["string-pool", "reference-type"]
sources:
  - title: 廖雪峰 Java 教程 · 字符串和编码
    url: https://liaoxuefeng.com/books/java/oop/core/string-encoding/index.html
    note: String 不可变、常用方法与编码的讲解参照。
  - title: 廖雪峰 Java 教程 · StringBuilder
    url: https://liaoxuefeng.com/books/java/oop/core/string-builder/index.html
    note: 可变字符串与链式 append 参照。
  - title: 廖雪峰 Java 教程 · StringJoiner
    url: https://liaoxuefeng.com/books/java/oop/core/string-joiner/index.html
    note: 带分隔符与前缀后缀的拼接参照。
---

String 是用得最多的引用类型,没有之一。它有三个必须记住的性质:不可变、比较用 equals、编码转换要显式指定字符集。这一篇把日常操作过一遍,再讲拼接的正确工具。

## 不可变:改不动,只能换

String 内部装字符的数组是 private final 的,也没有任何修改它的方法。所以 String 对象一旦造出来,内容就定死了:

```java
String s = "Hello";
s.toUpperCase();
System.out.println(s);   // Hello,没变

s = s.toUpperCase();
System.out.println(s);   // HELLO,变量指向了新串
```

toUpperCase 没有改原对象,而是返回了一个新 String。所有看起来「修改字符串」的方法——replace、substring、trim——全是这个套路:返回新串,原串不动。

不可变的好处:可以放心共享(常量池就是靠它),可以安全地当 HashMap 的 key,多线程读不用加锁。代价是频繁拼接会造一堆临时对象,解法见下文 StringBuilder。

比较内容用 equals,忽略大小写用 equalsIgnoreCase。== 的常量池巧合在 3.2 节讲过,这里不重复,只重申结论:别用 == 比字符串内容。

## 常用方法速查

搜索与判断:

```java
"Hello".contains("ll");       // true
"Hello".indexOf("l");         // 2,找不到返回 -1
"Hello".lastIndexOf("l");     // 3
"Hello".startsWith("He");     // true
"Hello".endsWith("lo");       // true
"Hello".isEmpty();            // false,长度是否为 0
"  ".isBlank();               // true,是否全空白(JDK 11)
```

提取与变换:

```java
"Hello".substring(2);         // "llo",从索引 2 到末尾
"Hello".substring(2, 4);      // "ll",含头不含尾
"  Hello ".trim();            // "Hello",去首尾空白
"　Hello　".strip();          // "Hello",连中文全角空格也去(JDK 11)
"hello".replace('l', 'w');    // "hewwo"
"hello".replace("ll", "~~");  // "he~~o"
"Hello".toUpperCase();        // "HELLO"
```

trim 和 strip 的区别:trim 只去 ASCII 空白(空格、\t、\r、\n),strip 按 Unicode 标准去空白,中文全角空格　也认。处理中文文本,用 strip。

分割与拼接:

```java
"A,B,C".split(",");                  // ["A","B","C"],参数是正则
String.join("-", "2026", "11", "18"); // "2026-11-18"
```

split 的参数是正则表达式,按 . 分割要写 `"\\."`,直接写 "." 会按「任意字符」分割,得到空数组——这是个高频坑,正则那篇细讲。

## 编码:字符与字节

Java 的 char 是 UTF-16 编码单元,String 内部按 UTF-16 存。但文件、网络传输用的是字节序列,字符和字节之间的转换必须指定字符集:

```java
byte[] bytes = "流光".getBytes(StandardCharsets.UTF_8);
String s = new String(bytes, StandardCharsets.UTF_8);
```

**永远显式指定字符集。** 不指定的 getBytes() 用平台默认编码,Windows 中文版可能是 GBK,Linux 是 UTF-8,同一份代码换个机器就乱码。乱码的本质是「编码和解码用了不同的字符集」,排查时先问两边各用的什么。

UTF-8 里一个常用汉字占 3 字节,英文占 1 字节。`"流光".getBytes(UTF_8)` 长度是 6,不是 2。涉及字节长度的逻辑(协议、截断)都要按字节算,别按 char 数算。

## StringBuilder:循环拼接的正确工具

`+` 拼接单条表达式没问题,编译器会优化。但循环里用 + 就糟了:

```java
String s = "";
for (int i = 0; i < 10000; i++) {
    s += i;   // 每轮造一个新 String,前面的内容反复复制
}
```

每轮生成新对象,内容越拼越长,复制量是平方级的。StringBuilder 是可变字符串,内部数组就地追加:

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10000; i++) {
    sb.append(i).append(",");
}
String s = sb.toString();
```

append 返回自身,所以能链式写。预估长度时 `new StringBuilder(1024)` 给个初始容量,省得内部数组反复扩容。

StringBuffer 是 StringBuilder 的线程安全版,方法带 synchronized。单线程场景(绝大多数)用 StringBuilder,别为用不到的同步买单。

## StringJoiner:带分隔符的拼接

拼「A, B, C」这种列表,手动 append 要处理最后一个分隔符,啰嗦。StringJoiner 专管这个:

```java
StringJoiner sj = new StringJoiner(", ", "[", "]");
sj.add("A").add("B").add("C");
System.out.println(sj);   // [A, B, C]
```

三个参数:分隔符、前缀、后缀。add 自动在元素之间放分隔符,首尾不多放。String.join 是它的简化版,只要分隔符时用 join 更短。

## 小结

- String 不可变,「修改」方法都返回新串;比较用 equals;
- 常用方法:搜索 contains/indexOf,提取 substring,去空白 strip 优于 trim,分割 split 参数是正则;
- 字符字节转换显式指定 UTF-8,乱码先查两边字符集;
- 循环拼接用 StringBuilder(链式 append),StringBuffer 留给真多线程;
- 带分隔符拼接用 StringJoiner 或 String.join。