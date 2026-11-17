---
title: 变量与基本类型
summary: '变量必须先定义后使用,可以反复赋值。Java 有八种基本类型:四种整数、两种浮点、char 和 boolean;整数默认 int,小数默认 double。String 和数组是引用类型,第 3 章再展开。'
category: java
node: java-quickstart-variables
order: 5
level: 入门
tags: [变量, 基本类型, int, double, var]
updated: 2026-11-17
mindmap: java-quickstart-variables.mindmap.json
terms: ["variable", "primitive-type", "reference-type", "literal"]
sources:
  - title: 廖雪峰 Java 教程 · 变量和数据类型
    url: https://liaoxuefeng.com/books/java/quick-start/basic/var-type/index.html
    note: 先定义后使用、重新赋值、八种基本类型分类的讲法参照。
  - title: 廖雪峰 Java 教程 · 整数运算
    url: https://liaoxuefeng.com/books/java/quick-start/basic/integer/index.html
    note: 整数溢出、long 后缀 L、除法截断的例子来源。
  - title: 廖雪峰 Java 教程 · 浮点数运算
    url: https://liaoxuefeng.com/books/java/quick-start/basic/float/index.html
    note: 0.1 + 0.2 不等于 0.3、float 后缀 f、金额用 BigDecimal 的提醒来源。
  - title: 菜鸟教程 · Java 基本数据类型
    url: https://www.runoob.com/java/java-basic-datatypes.html
    note: 八种类型的字节数与取值范围对照。
---

程序处理的数据都存在变量里。这一篇把变量的用法和 Java 的八种基本类型过一遍,学完你能定义变量、做赋值、知道每个类型装什么。

## 变量:先定义,后使用

Java 的变量必须先定义后使用。定义的时候指定类型,可以顺便给一个初始值:

```java
int age = 18;
```

这条语句定义了一个 `int` 类型的变量,名字叫 `age`,初始值 18。代码里直接写出来的 18 叫字面量。

变量可以重新赋值。注意第一次定义要写类型,后面赋值不能再写:

```java
public class Main {
    public static void main(String[] args) {
        int n = 100;
        System.out.println(n);   // 100
        n = 200;                 // 重新赋值,不写 int
        System.out.println(n);   // 200
        int x = n;               // 把 n 的值抄一份给 x
        x = x + 100;
        System.out.println(x);   // 300
        System.out.println(n);   // 200,n 不受影响
    }
}
```

保存为 `Main.java`,`java Main.java` 直接跑(第 1 章讲过)。

两个要点:

- `=` 是赋值,不是数学里的相等。`x = x + 100` 的意思是先算右边的值,再写进 x,数学里这个等式不成立,代码里完全合法;
- `int x = n` 是把 n 当时的值抄一份给 x,之后 x 怎么变都不影响 n。基本类型的变量里装的就是值本身,这一点和引用类型不同,第 3 章会对比。

变量名有规矩:字母、数字、下划线、`$` 组成,不能以数字开头,不能用关键字(`int`、`class` 这些)。约定俗成的写法是驼峰命名:`userName`、`totalCount`;常量全大写加下划线:`MAX_SIZE`。

JDK 10 起还可以用 `var` 让编译器自己推断类型:

```java
var name = "Java";   // 编译器推断出 String
var count = 10;      // 推断出 int
```

注意:`var` 只能用在方法内部的局部变量,而且推断完类型就定死了,`count = "abc"` 照样报编译错误。它不是把 Java 变成动态类型语言,只是少写一个类型名。

## 八种基本类型

Java 的基本类型有八种,分四类:

| 类别 | 类型 | 占用 | 说明 |
| --- | --- | --- | --- |
| 整数 | byte | 1 字节 | -128 ~ 127,很少用 |
| 整数 | short | 2 字节 | -32768 ~ 32767,很少用 |
| 整数 | int | 4 字节 | 约 ±21 亿,整数的默认选择 |
| 整数 | long | 8 字节 | 很大,字面量要加 L 后缀 |
| 浮点 | float | 4 字节 | 字面量要加 f 后缀 |
| 浮点 | double | 8 字节 | 小数的默认选择 |
| 字符 | char | 2 字节 | 一个 Unicode 字符,单引号 |
| 布尔 | boolean | — | 只有 true / false |

日常写代码,整数用 `int`,小数用 `double`,真假用 `boolean`,这三个覆盖绝大多数场景。其余的知道有就行:

```java
long population = 1400000000L;   // 超出 int 范围,必须加 L
float price = 9.9f;              // 不加 f 会被当成 double,编译报错
double pi = 3.14159;
char grade = 'A';                // 单引号,一个字符
boolean passed = true;
```

几个容易踩的点:

- `long` 的字面量不加 `L`,编译器先按 `int` 处理,超出范围直接编译报错。建议大写 `L`,小写 `l` 容易和 1 看混;
- `char` 用单引号,`String` 用双引号。`'A'` 是字符,`"A"` 是字符串,两个类型;
- `boolean` 只有 `true` 和 `false`,不能拿 0 和 1 当真假用,这和 C 不一样。

## 整数会溢出,小数不精确

基本类型都有范围,超出范围不会报错,而是悄悄绕回去:

```java
int max = 2147483647;      // int 的最大值
System.out.println(max + 1);   // -2147483648,绕回最小值
```

这叫溢出。int 装不下就换 long,这是最常见的解法。

浮点数的问题相反:范围很大,但不精确。

```java
System.out.println(0.1 + 0.2);   // 0.30000000000000004
```

原因是小数在二进制里表示不精确,0.1 存进去就已经是个近似值了。所以:

- 比较两个小数是否相等,不要直接用 `==`,判断差的绝对值是否小于一个极小值;
- 算钱不要用 double,用 `BigDecimal`(第 3 章核心类会讲)。

注意:这两条不是 Java 的毛病,几乎所有语言的浮点数都这样,源头是 IEEE 754 标准。

## 引用类型:先认个脸

除了八种基本类型,其余全是引用类型:String、数组、后面学的类,都是。

```java
String name = "Java";
int[] scores = {90, 85, 77};
```

引用类型的变量里装的不是值本身,而是一个指向对象的引用。现在只需要记住两件事:

- `String` 是引用类型,不是基本类型,虽然它写起来很像;
- 引用类型变量可以是 `null`,表示什么都不指;对着 null 调方法会抛 NullPointerException。

引用到底怎么比、怎么传,是第 3 章的主线,这里不展开。

## 小结

- 变量先定义后使用,`=` 是赋值;基本类型的赋值是抄一份值,互不影响;
- 八种基本类型:byte / short / int / long / float / double / char / boolean;整数默认 int,小数默认 double;
- long 字面量加 L,float 加 f;char 单引号,boolean 只有 true / false;
- 整数溢出会绕回,浮点数不精确,算钱用 BigDecimal;
- String、数组是引用类型,变量里装的是引用,可以为 null。

下一篇讲运算符:这些变量之间怎么算、按什么顺序算。