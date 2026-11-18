---
title: 方法重载
summary: '同一个类里方法名相同、参数列表不同,就是重载。编译器按实参挑版本:先精确匹配,再自动拓宽,再装箱,最后可变参数。只有返回值不同不算重载。'
category: java
node: java-oop-overload
order: 13
level: 入门
tags: [重载, 方法签名, 参数匹配]
updated: 2026-11-18
mindmap: java-oop-overload.mindmap.json
terms: ["autoboxing"]
sources:
  - title: 廖雪峰 Java 教程 · 方法重载
    url: https://liaoxuefeng.com/books/java/oop/basic/overload/index.html
    note: 重载判定规则与返回值不参与签名的讲解参照。
  - title: 菜鸟教程 · Java 重写与重载
    url: https://www.runoob.com/java/java-override-overload.html
    note: 重载与覆写的对照。
---

`System.out.println` 传 int 能打,传 String 能打,传数组也能打。一个名字,怎么能接这么多类型?答案是重载:同一个类里定义了一批同名方法,参数列表各不相同,编译器按你递的实参挑一个。

## 重载的定义

```java
class Calculator {
    int add(int a, int b) {
        return a + b;
    }

    double add(double a, double b) {
        return a + b;
    }

    int add(int a, int b, int c) {
        return a + b + c;
    }
}
```

三个 add,参数类型或个数不同,构成重载。调用时:

```java
Calculator c = new Calculator();
c.add(1, 2);        // 调第一个
c.add(1.0, 2.0);    // 调第二个
c.add(1, 2, 3);     // 调第三个
```

判断标准只有一条:**方法签名不同**。上一篇说过,签名 = 方法名 + 参数列表(类型、个数、顺序)。所以:

- 参数类型不同:`f(int)` 和 `f(double)`,是重载;
- 参数个数不同:`f(int)` 和 `f(int, int)`,是重载;
- 参数顺序不同:`f(int, String)` 和 `f(String, int)`,是重载;
- 只有返回值不同:`int f()` 和 `double f()`,**不是**重载,编译报错。

最后一条容易记混。想想调用处就明白了:`f();` 这条语句不接收返回值时,编译器根本无从知道你想调哪个。返回值不参与签名,是语法层面的硬规定。

## 编译器怎么挑版本

实参类型和某个版本完全一致,直接选中,没有悬念。不一致时,编译器按优先级找「最接近」的:

1. 精确匹配;
2. 基本类型自动拓宽(int → long → float → double);
3. 自动装箱 / 拆箱(int ↔ Integer);
4. 可变参数。

看例子:

```java
class Demo {
    static void f(long n)    { System.out.println("long"); }
    static void f(Integer n) { System.out.println("Integer"); }
    static void f(int... n)  { System.out.println("varargs"); }
}

Demo.f(100);   // 打印 long
```

没有 `f(int)`,编译器先试拓宽:int → long 成立,选中。装箱和可变参数排在后面,轮不到。把 `f(long)` 注释掉再跑,打印 Integer;再注释掉,才轮到 varargs。

这个优先级不用背,记住「拓宽优先于装箱,装箱优先于可变参数」就够应付绝大多数代码。真遇到挑不明白的,说明这几个重载设计得有问题——见下文。

## 两个常见的坑

**坑一:传 null 给重载方法。**

```java
static void g(String s)  {}
static void g(Integer n) {}

g(null);   // 编译错误:对 g 的引用不明确
```

null 既能当 String 也能当 Integer,两个版本都匹配且分不出谁更近,编译器拒绝猜。解决办法是显式转型:`g((String) null)`。

**坑二:装箱参与后,语义悄悄变了。**

```java
static void h(int n)     { System.out.println("基本类型"); }
static void h(Integer n) { System.out.println("包装类型"); }

int x = 1;
h(x);            // 基本类型
Integer y = 1;
h(y);            // 包装类型
```

同一个「1」,装没装箱决定走哪个版本。如果两个版本做的事不一样,调用方换个写法结果就变了,查起来很费劲。所以重载的各版本应当**语义一致**——println 的十几个版本都是「打印传进来的东西」,只是类型不同。参数类型相近、行为却不同的重载,是给自己挖坑。

## 重载不是覆写

重载(Overload)发生在同一个类里(子类加一个同名不同参的方法也算),是「多个版本供挑选」,编译期就定下调哪个。

覆写(Override)发生在父子类之间,方法签名完全相同,是「子类替换父类的实现」,运行期才定下调哪个。那是多态的事,后面专门一篇讲。

两个词长得像,机制完全不同,面试也爱问,现在先分清。

## 小结

- 重载 = 同名 + 不同参数列表;只有返回值不同不算;
- 挑选顺序:精确匹配 → 基本类型拓宽 → 装箱拆箱 → 可变参数;
- null 匹配多个引用类型版本会报「引用不明确」,用显式转型解决;
- 重载的各版本语义要一致,别靠参数类型的细微差别改变行为;
- 重载是编译期选版本,覆写是运行期换实现,两回事。