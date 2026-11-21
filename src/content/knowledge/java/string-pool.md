---
title: String 常量池与 Integer 缓存
summary: '相同字面量共用常量池里同一个对象，new String 强制新建；编译期能算出的拼接也会进池。Integer.valueOf 缓存 -128~127，区间内 == 恰好为 true。这些「巧合」都不是用 == 比内容的理由。'
category: java
node: java-oop-string-pool
order: 25
level: 入门
tags: [常量池, intern, Integer缓存, 字面量]
updated: 2026-11-18
mindmap: java-oop-string-pool.mindmap.json
terms: ["string-pool", "intern", "literal", "constant-folding"]
sources:
  - title: 廖雪峰 Java 教程 · 字符串和编码
    url: https://liaoxuefeng.com/books/java/oop/core/string-encoding/index.html
    note: 字符串比较与常量池现象的讲解参照。
  - title: Java 语言规范 · 3.10.5 字符串字面量
    url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.5
    note: 字面量驻留与 intern 的规范定义。
  - title: Integer.valueOf 的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int)
    note: -128~127 缓存的官方说明。
---

上一篇说 == 比身份。但很多人第一次写 Java 都见过这个「反例」:

```java
String s1 = "hello";
String s2 = "hello";
System.out.println(s1 == s2);   // true ???
```

两个变量，== 居然是 true?不是说比身份吗？这一篇解释这类「巧合」背后的两个机制：字符串常量池和 Integer 缓存。结论就一条：比内容，永远用 equals。

## 字符串常量池

Java 把字符串字面量统一存放在一个池子里，内容相同的字面量共用同一个对象。s1 和 s2 都指向池里那同一个 "hello",== 自然是 true。这是编译器省内存的优化，不是 == 的语义变了。

换几种写法，巧合立刻消失：

```java
String s1 = "hello";
String s2 = new String("hello");
System.out.println(s1 == s2);   // false

String s3 = "hel" + "lo";
System.out.println(s1 == s3);   // true

String part = "hel";
String s4 = part + "lo";
System.out.println(s1 == s4);   // false
```

逐个解释：

- `new String("hello")`:new 的语义就是创建新对象，强制在堆里另开一份，不进池；
- `"hel" + "lo"`:两个都是字面量，编译器在编译期就把它算成 "hello"(常量折叠)，等价于直接写 "hello"，进池；
- `part + "lo"`:part 是变量，编译期算不出结果，拼接发生在运行时，产生新对象，不进池。

规律：**编译期确定的字符串内容进池，运行期拼出来的不进池，new 出来的不进池。**

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 310" role="img" aria-label="两个字面量指向常量池里的同一个对象，new 出来的字符串指向堆上另一个对象">
    <defs>
      <marker id="poolArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="298" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="430" y="40" width="290" height="100" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="452" y="66" font-size="13" font-weight="700" fill="var(--ink)">字符串常量池</text>
    <rect x="540" y="80" width="120" height="42" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="600" y="107" font-size="14" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)" text-anchor="middle">"hello"</text>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" text-anchor="middle">
      <rect x="40" y="52" width="96" height="36" rx="10" fill="var(--canvas)" stroke="var(--line)" />
      <text x="88" y="75" fill="var(--ink)">s1</text>
      <rect x="40" y="98" width="96" height="36" rx="10" fill="var(--canvas)" stroke="var(--line)" />
      <text x="88" y="121" fill="var(--ink)">s2</text>
      <rect x="40" y="206" width="96" height="36" rx="10" fill="var(--canvas)" stroke="var(--line)" />
      <text x="88" y="229" fill="var(--ink)">s3</text>
    </g>
    <line x1="140" y1="70" x2="534" y2="96" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#poolArrow)" />
    <line x1="140" y1="116" x2="534" y2="104" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#poolArrow)" />
    <text x="190" y="88" font-size="11" fill="var(--muted)">字面量：直接进池</text>
    <rect x="430" y="176" width="290" height="104" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="452" y="200" font-size="13" font-weight="700" fill="var(--ink)">堆</text>
    <rect x="478" y="212" width="180" height="48" rx="10" fill="var(--panel)" stroke="var(--line)" />
    <text x="568" y="234" font-size="13" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)" text-anchor="middle">String 对象</text>
    <text x="568" y="250" font-size="11" fill="var(--muted)" text-anchor="middle">每次 new 都是新的一份</text>
    <line x1="140" y1="224" x2="470" y2="232" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#poolArrow)" />
    <text x="190" y="242" font-size="11" fill="var(--muted)">new String("hello")</text>
    <text x="32" y="292" font-size="12.5" fill="var(--ink)">内容相同不等于同一个对象：s1 == s2 为 true,s1 == s3 为 false，但三者 equals 互等。</text>
  </svg>
  <figcaption>字面量共用池里那一个，<code>new</code> 出来的各自一份；比内容永远用 <code>equals</code>。</figcaption>
</figure>

## intern():手动登记进池

运行期拼出的字符串，可以调 intern() 登记进池：

```java
String s = new String("hello").intern();
System.out.println(s == "hello");   // true
```

intern 返回池里内容相同的那个对象；池里没有就先放进去再返回。日常代码很少用它——查找有开销，池里的对象长期驻留也占内存。知道有这个方法、读老代码见到能认识即可。

## Integer 缓存：-128 到 127

包装类型也有类似机制。自动装箱 `Integer n = 100` 实际调的是 Integer.valueOf(100)，而 valueOf 对 -128~127 的数返回缓存的同一个实例：

```java
Integer a = 127, b = 127;
System.out.println(a == b);   // true,缓存里同一个对象

Integer c = 128, d = 128;
System.out.println(c == d);   // false,区间外每次新建
```

127 和 128，一个 true 一个 false——面试经典题，原理就这一句。这个区间是 javadoc 明确要求的(Byte、Short、Long 同样缓存 -128~127,Character 缓存 0~127,Boolean 只有 TRUE/FALSE 两个实例；Float 和 Double 没有缓存，因为浮点数区间内取值太密，缓存不划算)。

为什么缓存这段？日常程序里小整数出现频率极高，共用实例省内存。和字符串池一个思路。

## 结论：别针对实现写代码

上面所有 == 为 true 的场景，都是「恰好指向了同一个对象」，是实现的优化细节，不是语言承诺。优化可能变(缓存区间可以调大)，写法可能变(字面量改成拼接),== 的结果就跟着变，而 equals 永远稳定。

所以规矩定死：

- 比内容：String、Integer、一切包装类型，一律 equals;
- == 只用于：基本类型比值、判断「是不是同一个对象」(比如用一个全局唯一的对象作标记)、枚举(每个常量全局唯一，== 反而推荐);
- 创建包装对象用 valueOf 或自动装箱，别 new Integer(JDK 9 起已废弃，总是新建，浪费缓存)。

「按语义编程，而不是针对底层实现去优化」。

## 小结

- 字面量进常量池共用，new String 与运行期拼接不进池；编译期常量折叠后进池；
- intern() 把运行期字符串登记进池，日常少用；
- Integer.valueOf 缓存 -128~127，区间内 == 恰好 true，区间外 false;
- 这些巧合是优化不是承诺：比内容一律 equals,== 只比身份或基本类型；
- 包装对象用 valueOf / 自动装箱，别 new。