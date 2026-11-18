---
title: 自动装箱与拆箱
summary: '装箱拆箱是编译器在基本类型与包装类型之间自动插的 valueOf / xxxValue 调用,只发生在编译期。三个坑:null 拆箱抛 NPE、循环里装箱拖性能、== 比出缓存巧合。'
category: java
node: java-oop-boxing
order: 26
level: 入门
tags: [自动装箱, 拆箱, NullPointerException, 性能]
updated: 2026-11-18
mindmap: java-oop-boxing.mindmap.json
terms: ["autoboxing", "wrapper-class", "identity"]
sources:
  - title: 廖雪峰 Java 教程 · 包装类型
    url: https://liaoxuefeng.com/books/java/oop/core/wrapper/index.html
    note: 装箱拆箱机制、NPE 与不变类的讲解参照。
  - title: Java 教程 · 自动装箱与拆箱
    url: https://docs.oracle.com/javase/tutorial/java/data/autoboxing.html
    note: 装箱拆箱发生时机与转换规则的官方说明。
---

基本类型不是对象,进不了集合;包装类型是对象,能进。两边经常要互转,Java 干脆让编译器自动转——这就是自动装箱与拆箱。写法省了,坑也埋下了,这一篇把机制和三个坑一次说清。

## 编译器替你做了什么

```java
Integer n = 100;   // 装箱
int x = n;         // 拆箱
```

编译后等价于:

```java
Integer n = Integer.valueOf(100);   // 装箱 = 调 valueOf
int x = n.intValue();               // 拆箱 = 调 xxxValue
```

八种基本类型各有对应的拆箱方法:intValue、longValue、doubleValue……名字有规律。

注意:**装箱拆箱只发生在编译期**,是编译器插的调用,运行时没有「自动转换」这回事。字节码里基本类型和引用类型分得清清楚楚。所以它不是魔法,是语法糖,糖底下是什么代码,出问题时就按什么代码排查。

发生装箱拆箱的场合:赋值、方法传参与返回值、集合操作。集合只能装对象,`List<Integer> list = new ArrayList<>(); list.add(100);` 里的 100 就悄悄装了箱。

## 坑一:null 拆箱,NPE

包装类型可以是 null,基本类型不行。null 拆箱时,编译器插的 intValue() 对着 null 调,当场 NullPointerException:

```java
Integer n = null;
int x = n;   // NullPointerException
```

更隐蔽的是算术和比较里:

```java
Map<String, Integer> map = new HashMap<>();
int v = map.get("不存在的key") + 1;   // get 返回 null,拆箱 NPE
```

get 返回 Integer,可能是 null;`+ 1` 触发拆箱,炸。这类 NPE 堆栈指向一行看起来人畜无害的算式,排查时先想「这里有没有包装类型参与了运算」。防御写法:先判空,或者用 getOrDefault:

```java
int v = map.getOrDefault("不存在的key", 0) + 1;
```

## 坑二:循环里装箱,性能隐形杀手

```java
Long sum = 0L;
for (long i = 0; i < 1_000_000; i++) {
    sum += i;   // 每轮:拆箱 → 相加 → 装箱,造一百万个 Long 对象
}
```

sum 是 Long,`sum += i` 每轮都要拆箱、相加、再装箱成新对象。一百万轮就是一百万个临时对象,GC 压力白给。改成基本类型:

```java
long sum = 0L;
for (long i = 0; i < 1_000_000; i++) {
    sum += i;   // 纯数值运算,零对象
}
```

规矩:**局部累加、计数、循环变量,一律基本类型**;只有进集合、需要 null 语义(比如「未设置」)时才用包装类型。

## 坑三:== 比出缓存巧合

装箱走 valueOf,Integer 缓存 -128~127,于是:

```java
Integer a = 127, b = 127;
Integer c = 128, d = 128;
a == b;   // true
c == d;   // false
```

原理上一篇讲透了:缓存区间内恰好同一个对象。结论不变:包装类型比内容一律 equals。

还有一个连带坑在三元表达式里:

```java
Integer n = null;
int x = true ? n : 0;   // NPE!
```

两个分支一个是 Integer 一个是 int,表达式整体按 int 算,n 被拆箱——null 拆箱,炸。三元两边类型不一致时,编译器会做拆箱 / 提升统一类型,这是语言规范定的,不是 bug。

## 装箱还影响重载挑选

方法重载那篇的优先级:精确匹配 → 拓宽 → 装箱 → 可变参数。`f(long)`、`f(Integer)`、`f(int...)` 并存时,f(100) 走 long。装箱排在拓宽后面,所以「加了个包装类型版本,调用悄悄换了目标」的事会发生。设计重载时别把基本类型和对应包装类型做成行为不同的两个版本。

## 小结

- 装箱 = 编译器插 valueOf,拆箱 = 插 xxxValue,只在编译期;
- null 拆箱抛 NPE,算式、三元、map.get 里最隐蔽;getOrDefault 防御;
- 循环累加用基本类型,包装类型留给集合与 null 语义;
- == 的缓存巧合不是承诺,比内容用 equals;
- 装箱参与重载挑选,排在拓宽之后。