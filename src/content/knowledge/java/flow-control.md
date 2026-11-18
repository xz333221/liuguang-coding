---
title: 流程控制：分支与循环
summary: 'if 管分支,for / while 管循环,switch 管多选。JDK 14 起的箭头 switch 不用写 break。break 跳出循环,continue 跳过本轮,循环边界差一是最常见的 bug。'
category: java
node: java-quickstart-flow
order: 7
level: 入门
tags: [if, switch, for, while, break]
updated: 2026-11-17
mindmap: java-quickstart-flow.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · if条件判断
    url: https://liaoxuefeng.com/books/java/quick-start/flow/if/index.html
    note: if / else if / else 与花括号建议的讲法参照。
  - title: 廖雪峰 Java 教程 · switch多重选择
    url: https://liaoxuefeng.com/books/java/quick-start/flow/switch/index.html
    note: 老式 switch 的 break 穿透与新式箭头 switch 的对照来源。
  - title: 廖雪峰 Java 教程 · for循环
    url: https://liaoxuefeng.com/books/java/quick-start/flow/for/index.html
    note: for 三段式与 for-each 的例子来源。
  - title: 菜鸟教程 · Java 循环结构
    url: https://www.runoob.com/java/java-loop.html
    note: while / do while / break / continue 的对照。
---

程序默认一行一行往下走,流程控制就是让它能分支、能循环。分支用 if 和 switch,循环用 for 和 while。这一篇全部过一遍,例子都能直接跑。

## if:分支

```java
int score = 75;
if (score >= 90) {
    System.out.println("优秀");
} else if (score >= 60) {
    System.out.println("及格");
} else {
    System.out.println("不及格");
}
```

条件必须是 boolean 表达式,从上往下判断,命中哪个分支就执行哪个,其余跳过。`else if` 可以接多个,`else` 兜底。

注意:哪怕分支里只有一行,也建议写上花括号。不写花括号时,只有紧跟的第一行属于分支,后面再补一行代码就会悄悄脱离分支,这是很经典的 bug:

```java
if (score >= 60)
    System.out.println("及格");
    System.out.println("恭喜");   // 缩进骗人:这行不在 if 里,永远执行
```

## switch:多选

同一个变量要和好几个固定值比较时,switch 比一串 else if 清楚。老式写法:

```java
switch (day) {
    case 1:
        System.out.println("周一");
        break;
    case 2:
        System.out.println("周二");
        break;
    default:
        System.out.println("其他");
}
```

老式 switch 有个陷阱:不写 `break`,会穿透到下一个 case 继续执行,不管条件匹不匹配。很多 bug 就是这么来的。

JDK 14 起转正的箭头写法没有这个问题,不用写 break,也不会穿透:

```java
switch (day) {
    case 1 -> System.out.println("周一");
    case 2 -> System.out.println("周二");
    default -> System.out.println("其他");
}
```

它还能当表达式用,直接把结果赋给变量:

```java
String label = switch (day) {
    case 1, 2, 3, 4, 5 -> "工作日";
    case 6, 7 -> "周末";
    default -> "不知道";
};
```

多个值用逗号并列。分支里要写好几行时,用花括号包起来,用 `yield` 返回结果。新代码建议一律用箭头写法,老式写法在读旧项目时认识就行。

## for:循环

知道要循环几次,用 for:

```java
int sum = 0;
for (int i = 1; i <= 100; i++) {
    sum += i;
}
System.out.println(sum);   // 5050
```

三段式:`int i = 1` 初始化,只执行一次;`i <= 100` 每轮开始前判断,false 就退出;`i++` 每轮结束后执行。

遍历数组有更省事的 for-each,不用管下标:

```java
int[] scores = {90, 85, 77};
for (int s : scores) {
    System.out.println(s);
}
```

需要下标(比如要改数组元素、要隔一个取一个)时才用三段式。

## while 和 do while

不知道循环几次、只知道停止条件时,用 while:

```java
int n = 1;
while (n < 100) {
    n *= 2;
}
System.out.println(n);   // 128
```

do while 先执行一轮再判断,所以至少执行一次:

```java
do {
    n /= 2;
} while (n > 1);
```

用得最多的是 for 和 while,do while 认识即可。

注意:while 的条件永远为 true 就是死循环。写循环时先问自己「这个条件什么时候会变 false」,答不上来就别运行。

## break 和 continue

- `break`:整个循环立刻结束,跳出去执行后面的代码;
- `continue`:本轮剩下的代码跳过,直接进入下一轮。

```java
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) continue;   // 偶数跳过
    if (i > 7) break;           // 到 9 就整个退出
    System.out.println(i);      // 1 3 5 7
}
```

在嵌套循环里,break 和 continue 只作用于自己所在的那一层。要一次跳出多层,可以给外层循环起个标签再 `break 标签名;`,但多层嵌套本身就该考虑拆成方法了,标签很少用。

## 边界差一:最常见的循环 bug

循环写错,十有八九错在边界:

```java
int[] a = new int[5];          // 下标 0 ~ 4
for (int i = 0; i <= 5; i++) { // i = 5 时越界,抛异常
    a[i] = i;
}
```

记法:长度为 n 的数组,下标从 0 到 n-1,循环条件写 `i < n`,不写 `i <= n`。for-each 没有这个问题,所以能用的时候优先用。

## 小结

- if 条件必须是 boolean;分支只有一行也写花括号;
- switch 新代码用箭头写法,不穿透、不用 break,还能当表达式;
- 知道次数用 for,只知道停止条件用 while,遍历数组优先 for-each;
- break 结束整个循环,continue 跳过本轮,都只管自己那一层;
- 循环条件写 `i < n`,边界差一是最常见的 bug。

下一篇讲数组:一组同类型的数怎么存、怎么取。