---
title: == 与 equals:比身份还是比内容
summary: '== 比的是身份,equals 默认也只看身份,只有被重写之后才比内容。String 常量池与 Integer 缓存会把这条规则变得更绕,但也更好记。'
category: java
order: 1
level: 入门
tags: [equals, hashCode, 常量池, 面试高频]
updated: 2026-10-13
mindmap: java-equality.mindmap.json
demo: java-equality
sources:
  - title: Java 语言规范 · 15.21 相等运算符
    url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.21
    note: 数值相等、布尔相等、引用相等三种情况分别怎么判定,以它为准。
  - title: Java 语言规范 · 3.10.5 字符串字面量
    url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.5
    note: 字面量驻留与编译期常量折叠的规则,本文 String 那一段的依据。
  - title: Object.equals 与 hashCode 的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)
    note: equals 要满足的五条约定,以及 equals 与 hashCode 的配套要求。
  - title: Integer.valueOf 的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int)
    note: -128 到 127 的缓存区间是规范写明的,区间之外不做保证。
  - title: Java 教程 · 自动装箱与拆箱
    url: https://docs.oracle.com/javase/tutorial/java/data/autoboxing.html
    note: 官方对装箱语义与"什么时候不该用自动装箱"的说明。
---

先把结论说清楚:**`==` 比的是身份,也就是两个引用是不是指向同一个对象。`equals` 是一个方法,`Object` 给的默认实现就是 `==`,只有子类重写过,它才比内容。**

```java
String a = new String("hello");
String b = new String("hello");

System.out.println(a == b);        // false  两个不同的对象
System.out.println(a.equals(b));   // true   内容一样
```

## == 在两处的含义不一样

- **基本类型**(`byte` / `short` / `int` / `long` / `float` / `double` / `char` / `boolean`)的 `==` 比的是**值**;
- **引用类型**的 `==` 比的是**引用**,也就是"是不是同一个对象"。

基本类型没有对象可指,只能比值;一旦是引用,比的就是身份。语言规范里把这两种情况分开写,不是同一个规则。

## Object.equals 的默认实现

`Object` 源码里就这么一行:

```java
public boolean equals(Object obj) {
    return (this == obj);
}
```

所以自定义类如果不重写 `equals`,它和 `==` 完全等价。

## String 为什么总被当成反例

`String` 重写了 `equals`(逐字符比较),而且字符串字面量会被**驻留**到常量池里复用:

```java
String a = "hello";
String b = "hello";              // 复用常量池里那一个
String c = new String("hello");  // 强制新建
String d = "hel" + "lo";         // 编译期就拼成了 "hello"
String e = "hel";
String f = e + "lo";             // 运行期拼接，结果是新对象

System.out.println(a == b);      // true
System.out.println(a == c);      // false
System.out.println(a == d);      // true
System.out.println(a == f);      // false
System.out.println(a.equals(c)); // true
```

三条规律:

- 内容相同的**字面量**复用同一个对象,所以 `==` 是 true;
- `new String(...)` 每次都造新对象,所以 `==` 是 false;
- **编译期**能算出来的常量拼接(`"hel" + "lo"`)会被折叠成常量;一旦参与拼接的是变量,就只能运行期做,结果是新对象。

`intern()` 可以把运行期得到的字符串放进常量池,但用它要清楚代价,日常代码里不常见。

## Integer:小于 128 才是同一个对象

```java
Integer a = 127, b = 127;
Integer c = 128, d = 128;

System.out.println(a == b);   // true
System.out.println(c == d);   // false
```

自动装箱走的是 `Integer.valueOf`,而它对 **-128 到 127** 之间的值做了缓存。规范只保证这一段(上限可以用 `-XX:AutoBoxCacheMax` 调大),超出范围每次都是新对象。

所以:**包装类型一律用 `equals` 比,不要用 `==`。** 这条规则对 `Long`、`Short`、`Byte`、`Character` 同样成立。

## equals 要守的五条约定

javadoc 里写明了,重写时必须满足:

1. **自反**:`x.equals(x)` 为 true;
2. **对称**:`x.equals(y)` 与 `y.equals(x)` 结果一致;
3. **传递**:`x.equals(y)` 且 `y.equals(z)`,则 `x.equals(z)`;
4. **一致**:只要参与比较的状态没变,多次调用结果不变;
5. **对 null**:`x.equals(null)` 必须返回 false。

违反任何一条都会出问题。比如对称性被破坏之后,`list.contains(x)` 的结果会取决于列表里的顺序,排查起来很费劲。

## 重写 equals 就必须重写 hashCode

`HashMap`、`HashSet` 先按 `hashCode` 找桶,再用 `equals` 在桶里定位。如果两个 `equals` 相等的对象 `hashCode` 不同,它们会落到不同的桶里:

```java
class Point { /* 只重写了 equals */ }

Set<Point> set = new HashSet<>();
set.add(new Point(1, 2));
System.out.println(set.contains(new Point(1, 2)));   // false  ← 明明相等却找不到
```

约定是:**`equals` 相等,则 `hashCode` 必须相等**;反过来不要求,不同对象撞到同一个哈希值是允许的,那叫哈希冲突。

现代写法(Java 16+ 的 `instanceof` 模式匹配):

```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Point p)) return false;
    return x == p.x && y == p.y;
}

@Override
public int hashCode() {
    return Objects.hash(x, y);
}
```

两个补充:`Objects.hash` 是可变参数,内部会装箱,热点路径上想省可以通过 `Objects.hashCode` 逐个组合;`record` 类型会自动生成这两个方法,手写类才需要自己维护。

## 四个容易踩的点

1. **拿可能为 null 的引用去调 equals**。`a.equals(b)` 在 `a` 为 null 时直接抛 `NullPointerException`。用 `Objects.equals(a, b)`,或者把确定非空的写在前面:`"X".equals(x)`。
2. **BigDecimal 的 equals 会比较刻度**。`new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 是 `false`,要按数值比得用 `compareTo(...) == 0`。
3. **枚举用 `==` 就够**。每个枚举常量只有一个实例,`==` 既是身份比较又更快,还不用担心中间为空。
4. **数组的 equals 是身份比较**。数组类型没有重写 `equals`,要比内容得用 `Arrays.equals`,`Objects.equals` 对数组也只能到这一层。

## 一句话总结

**`==` 问"是不是同一个对象",`equals` 问"内容一不一样"。** 包装类型恒用 `equals`;自定义类重写 `equals` 时把 `hashCode` 一起重写;不确定谁可能为空就用 `Objects.equals`。记住 String 常量池和 Integer 缓存这两个特例,面试里的坑基本就这几处。
