---
title: 包装类型
summary: '八种基本类型各有一个包装类,都是不可变类。创建用 valueOf 静态工厂,比较用 equals;parseInt 与进制转换、MAX_VALUE 等常量是日常高频 API。装箱拆箱的易错点见 3.2 节。'
category: java
node: java-core-wrapper
order: 28
level: 入门
tags: [包装类型, Integer, valueOf, 进制转换]
updated: 2026-11-18
mindmap: java-core-wrapper.mindmap.json
terms: ["wrapper-class", "autoboxing"]
sources:
  - title: 廖雪峰 Java 教程 · 包装类型
    url: https://liaoxuefeng.com/books/java/oop/core/wrapper/index.html
    note: 包装类型一览、静态工厂与进制转换的讲解参照。
  - title: 菜鸟教程 · Java Number 类
    url: https://www.runoob.com/java/java-number.html
    note: Number 抽象类与包装类型体系对照。
---

基本类型不是对象,进不了集合,也不能泛型。包装类型把基本类型包成对象,补上这些能力。装箱拆箱的机制和易错点在 3.2 节专门讲过,这一篇讲包装类本身的 API:怎么创建、有哪些常用方法、有哪些常量。

## 八对一一对应

| 基本类型 | 包装类型 |
|---|---|
| byte | Byte |
| short | Short |
| int | Integer |
| long | Long |
| float | Float |
| double | Double |
| char | Character |
| boolean | Boolean |

注意 int 对 Integer、char 对 Character,名字不是简单首字母大写,这两个最容易写错。

所有包装类都是**不可变类**:内部值 private final,造出来就不变。所以它们能放心当 Map 的 key、放心共享。比较内容用 equals,别用 ==(缓存巧合的原理见 3.2 节常量池那篇)。

## 创建:用 valueOf,别 new

```java
Integer n1 = Integer.valueOf(100);      // 推荐
Integer n2 = Integer.valueOf("100");    // 从字符串
Integer n3 = 100;                       // 自动装箱,等价于 valueOf
Integer n4 = new Integer(100);          // JDK 9 起废弃,别用
```

valueOf 是静态工厂方法:它可能返回缓存实例(Integer 缓存 -128~127),把优化空间留给实现者。new 总是创建新对象,浪费缓存,所以被废弃了。

「创建对象优先静态工厂而不是 new」是个通用原则,后面 List.of、Map.of、EnumSet 都是这个思路。

## 字符串与进制

parseInt 把字符串解析成基本类型:

```java
int x = Integer.parseInt("100");       // 100
int y = Integer.parseInt("ff", 16);    // 255,按十六进制解析
int z = Integer.parseInt("101", 2);    // 5,按二进制
```

解析失败(空串、带字母、超范围)抛 NumberFormatException。用户输入转数字,要么 try-catch,要么先校验。

反过来,整数转指定进制字符串:

```java
Integer.toString(100);        // "100"
Integer.toString(100, 36);    // "2s"
Integer.toHexString(100);     // "64"
Integer.toOctalString(100);   // "144"
Integer.toBinaryString(100);  // "1100100"
```

记住:内存里只有二进制,「十六进制」只是显示格式。存储和显示分离,这是程序设计的一条基本原则。

## 有用的常量

```java
int max = Integer.MAX_VALUE;   // 2147483647
int min = Integer.MIN_VALUE;   // -2147483648
long lmax = Long.MAX_VALUE;    // 9223372036854775807

int bits = Long.SIZE;          // 64,占多少 bit
int bytes = Long.BYTES;        // 8,占多少字节

Boolean t = Boolean.TRUE;      // 全局就这两个实例
Boolean f = Boolean.FALSE;
```

第 2 章讲整数溢出时用的 Integer.MAX_VALUE 就是它。判断「会不会溢出」的逻辑里,这些常量是边界哨兵。

## Number:数值包装类的父类

Integer、Long、Double 等数值包装类都继承自 Number,它定义了统一的取值方法:

```java
Number n = Integer.valueOf(100);
int i = n.intValue();
long l = n.longValue();
double d = n.doubleValue();
```

写「接收任意数值类型」的方法时,参数用 Number 就能通吃。注意 intValue 之类是窄化转换,大数转 int 会截断,和强制转型一个规则。

## 什么时候用包装类型

三条场景,占一条才用:

- 进集合、当泛型参数:`List<Integer>`;
- 需要 null 语义:数据库字段可空、配置「未设置」;
- 需要对象方法:调 equals、compareTo、toString。

其余场景——局部变量、循环计数、累加器——一律基本类型,省内存省 GC,还躲开拆箱 NPE。这条和装箱那篇的结论一致。

## 小结

- 八种基本类型各有包装类,int→Integer、char→Character 名字特殊;都是不可变类;
- 创建用 valueOf / 自动装箱,new Integer 已废弃;
- parseInt 解析字符串(可带进制),失败抛 NumberFormatException;toHexString 等负责显示格式;
- MAX_VALUE / MIN_VALUE / SIZE / BYTES 是边界与度量常量;
- 数值包装类共父类 Number;局部运算用基本类型,集合与 null 语义才用包装。