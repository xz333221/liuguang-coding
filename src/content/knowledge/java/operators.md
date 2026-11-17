---
title: 运算符与求值顺序
summary: '整数除法会截断、% 取余、&& 和 || 会短路、++ 分前后。类型不同时先提升再算,优先级不用背,拿不准就加括号。'
category: java
node: java-quickstart-operators
order: 6
level: 入门
tags: [运算符, 短路, 类型提升, 优先级]
updated: 2026-11-17
mindmap: java-quickstart-operators.mindmap.json
terms: ["primitive-type"]
sources:
  - title: 廖雪峰 Java 教程 · 整数运算
    url: https://liaoxuefeng.com/books/java/quick-start/basic/integer/index.html
    note: 整数除法截断、溢出、类型提升的讲法参照。
  - title: 廖雪峰 Java 教程 · 布尔运算
    url: https://liaoxuefeng.com/books/java/quick-start/basic/boolean/index.html
    note: 短路求值、三目运算符的例子来源。
  - title: 菜鸟教程 · Java 运算符
    url: https://www.runoob.com/java/java-operators.html
    note: 运算符分类与优先级表的对照。
---

变量有了,这一篇讲怎么算。Java 的运算符和多数语言长得一样,但有几个地方有自己的脾气:整数除法、短路、类型提升。逐个过一遍。

## 算术运算符

`+ - * / %` 五个,前四个不用解释,`%` 是取余数:

```java
System.out.println(7 / 2);    // 3,不是 3.5
System.out.println(7 % 2);    // 1
System.out.println(-7 % 2);   // -1,余数的符号跟被除数走
```

注意第一条:两个整数相除,结果还是整数,小数部分直接砍掉,不是四舍五入。想要 3.5,让其中一边变成小数:

```java
System.out.println(7 / 2.0);   // 3.5
```

除零也要分情况:

```java
// int 除零:抛 ArithmeticException,程序当场停下
System.out.println(1 / 0);

// double 除零:不抛异常,得到 Infinity 或 NaN
System.out.println(1.0 / 0);   // Infinity
System.out.println(0.0 / 0);   // NaN
```

`NaN` 是「不是数」,它和任何值比都是 false,包括它自己:`NaN == NaN` 是 false。判断要用 `Double.isNaN(x)`。

## ++ 和 --:分前后

`++` 是自增 1,`--` 是自减 1。单独一行时前后没区别,混进表达式里就有区别了:

```java
int a = 5;
int b = a++;   // 先把 a 的旧值 5 给 b,再让 a 变 6
System.out.println(b);   // 5
System.out.println(a);   // 6

int c = 5;
int d = ++c;   // 先让 c 变 6,再把新值 6 给 d
System.out.println(d);   // 6
```

记法:`++` 在前就先加再用,在后就先用再加。实际工程里很少有人把 `++` 混进复杂表达式,可读性差,建议自增单独写一行。

## 比较与逻辑

比较运算符 `> >= < <= == !=` 的结果是 boolean。基本类型用 `==` 比的是值;引用类型用 `==` 比的是「是不是同一个对象」,比内容要用 equals,这是第 3 章的重点,先埋个伏笔。

逻辑运算符三个:`&&`(与)、`||`(或)、`!`(非)。前两个会短路:

```java
// && :左边是 false,右边根本不执行
if (user != null && user.getName().equals("xz")) { ... }

// || :左边是 true,右边根本不执行
if (count == 0 || total / count > 10) { ... }
```

短路不是优化技巧,是常用保命写法:第一个例子靠 `user != null` 挡在前面,右边才不会对着 null 调方法;第二个例子靠 `count == 0` 挡在前面,右边才不会除零。顺序写反就炸。

还有一个三目运算符,`条件 ? 值1 : 值2`,是 if-else 的表达式版:

```java
int max = a > b ? a : b;
String label = score >= 60 ? "及格" : "不及格";
```

## 赋值与复合赋值

`+= -= *= /= %=` 是「算完再赋回去」的缩写:

```java
n += 5;   // 等价于 n = n + 5
```

有一个隐蔽差别:复合赋值自带强制类型转换。

```java
short s = 10;
s = s + 1;    // 编译报错:s + 1 的结果是 int,不能直接赋给 short
s += 1;       // 编译通过:等价于 s = (short)(s + 1)
```

这不是 bug,是规范规定的行为。知道有这回事,看到 `s += 1` 能编译就不奇怪了。

## 类型提升:小类型算之前先变大

两个不同类型的数一起算,结果往「更大」的类型靠:

- byte、short、char 参与运算时,先一律提升成 int;
- int 和 long 一起算,结果是 long;
- 整数和 double 一起算,结果是 double。

```java
short a = 1;
short b = 2;
// short c = a + b;   // 编译报错:a + b 已经是 int
int c = a + b;        // 正确

System.out.println(1 / 2);       // 0,两个 int
System.out.println(1 / 2.0);     // 0.5,int 提升成 double
```

反过来,大类型赋给小类型要强制转换,写个小括号:

```java
int n = (int) 3.9;   // 3,直接砍小数,不是四舍五入
```

注意 `(int) 3.9` 得 3 不是 4。要四舍五入用 `Math.round`。

## 字符串的 +

`+` 遇到字符串就变成拼接,而且从左往右算:

```java
System.out.println("结果:" + 1 + 2);   // 结果:12
System.out.println("结果:" + (1 + 2)); // 结果:3
System.out.println(1 + 2 + "结果");    // 3结果
```

第一条里 `"结果:" + 1` 先拼成 `"结果:1"`,再拼 2;第三条里 `1 + 2` 先算出 3,再拼字符串。想先算加法,加括号。

## 优先级:不用背

运算符有优先级表,乘除高于加减、比较高于逻辑与、逻辑与高于逻辑或,等等。我的建议是:除了最常见的几条,不要背,拿不准就加括号。括号不要钱,读代码的人(包括三个月后的你)会感谢你。

求值顺序记住一条就够:同一个表达式里,操作数从左往右求值。上面字符串拼接的例子就是这条规则的体现。

## 小结

- 整数除法截断小数,`%` 取余;int 除零抛异常,double 除零得 Infinity / NaN;
- `++` 在前先加再用,在后先用再加;建议单独写一行;
- `&&` 和 `||` 短路,常用来挡 null 和除零,顺序不能反;
- byte / short / char 运算先提升成 int;大赋小要强转,强转小数直接砍;
- 复合赋值自带强转;字符串 `+` 从左往右拼,想先算就加括号;
- 优先级不背,拿不准加括号。

下一篇讲流程控制:让程序会分岔、会转圈。