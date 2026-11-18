---
title: 数组
summary: '数组是一组同类型的值,长度定了就不能变,下标从 0 开始。数组是引用类型:赋值复制的是引用,改一个另一个也变;要独立副本用 Arrays.copyOf。'
category: java
node: java-quickstart-array
order: 8
level: 入门
tags: [数组, 下标, 引用, Arrays]
updated: 2026-11-17
mindmap: java-quickstart-array.mindmap.json
terms: ["reference-type", "null"]
sources:
  - title: 廖雪峰 Java 教程 · 数组类型
    url: https://liaoxuefeng.com/books/java/quick-start/basic/array/index.html
    note: 数组定义、默认值、引用语义的讲法参照。
  - title: 廖雪峰 Java 教程 · 遍历数组
    url: https://liaoxuefeng.com/books/java/quick-start/array-op/loop/index.html
    note: for-each 与 Arrays.toString 的例子来源。
  - title: 菜鸟教程 · Java 数组
    url: https://www.runoob.com/java/java-array.html
    note: 声明、初始化、越界异常的对照。
---

一个变量装一个值,要装一组同类型的值,用数组。这一篇讲数组怎么定义、怎么取、怎么遍历,以及它作为引用类型最重要的一个性质。

## 定义与初始化

两种写法:

```java
// 先指定长度,元素拿默认值
int[] a = new int[5];        // 5 个 0

// 直接列出元素,长度由内容定
int[] b = {90, 85, 77};      // 长度 3
```

`int[]` 读作「int 数组」。方括号写在类型后面是推荐写法,`int a[]` 也合法但少见。

只指定长度时,元素自动拿默认值:整数是 0,浮点是 0.0,boolean 是 false,引用类型是 null。不用自己一个个填。

注意:数组长度一旦定了就不能变。`new int[5]` 就是 5 个,装不下第 6 个。需要「随时追加」的容器,用第 6 章的 ArrayList,数组适合长度固定的场景。

## 取下标:从 0 开始

```java
int[] b = {90, 85, 77};
System.out.println(b[0]);      // 90,第一个
System.out.println(b[2]);      // 77,最后一个
System.out.println(b.length);  // 3,长度是属性,不带括号
b[1] = 100;                    // 改第二个
```

最后一个元素的下标是 `length - 1`。下标越界不会编译报错,运行时抛 `ArrayIndexOutOfBoundsException`:

```java
System.out.println(b[3]);   // 运行时炸:下标 3 不存在
```

编译器不管下标范围,因为它经常是变量,只有运行时才知道。所以循环遍历的条件写 `i < b.length`,上一篇强调的边界差一在这里最常犯。

## 遍历

两种:

```java
// 三段式:需要下标时用
for (int i = 0; i < b.length; i++) {
    System.out.println(b[i]);
}

// for-each:只取值时用,不会越界
for (int x : b) {
    System.out.println(x);
}
```

直接 `System.out.println(b)` 打印的不是内容,是一串类似 `[I@1b6d3586` 的东西(类型标记加哈希码)。想看内容,用工具方法:

```java
System.out.println(Arrays.toString(b));   // [90, 100, 77]
```

`Arrays` 是 `java.util` 里的工具类,用之前要 `import java.util.Arrays;`。它还有 `sort`(排序)、`copyOf`(复制)等,后面用到再查。

## 数组是引用类型:赋值复制的是引用

这一节是关键,看例子:

```java
int[] a = {1, 2, 3};
int[] b = a;        // 把 a 的引用复制给 b,不是复制数组
b[0] = 99;
System.out.println(a[0]);   // 99,a 也变了
```

基本类型赋值是复制值,两不相干;数组赋值是复制引用,两个变量指向同一个数组,改哪个名字看到的都是同一份数据。画出来:

```text
a ──┐
    ▼
   [1, 2, 3]   ← 只有一个数组
    ▲
b ──┘
```

想要一份独立的副本,用 `Arrays.copyOf`:

```java
int[] c = Arrays.copyOf(a, a.length);
c[0] = 0;
System.out.println(a[0]);   // 99,不受影响
```

这个性质后面会反复遇到:方法参数传数组、集合里装对象,都是同一套引用语义。第 3 章会把它讲透,这里先在数组上建立直觉。

## 多维数组

数组的元素还是数组,就是二维数组,常用来存表格:

```java
int[][] grid = {
    {1, 2, 3},
    {4, 5, 6},
};
System.out.println(grid[1][2]);   // 6,第 2 行第 3 列
System.out.println(grid.length);  // 2,行数
```

遍历就套两层循环,外层走行、内层走列。二维数组了解即可,实际项目里更常见的是「对象组成的列表」,那是集合章节的事。

## 小结

- 数组长度固定,下标 0 到 length-1,越界运行时抛异常;
- 只指定长度时元素拿默认值:0 / 0.0 / false / null;
- 遍历优先 for-each;打印内容用 Arrays.toString,直接 println 打印的是哈希码;
- 数组是引用类型,赋值复制引用,改一处两处都变;独立副本用 Arrays.copyOf;
- 需要可变长度,等第 6 章的 ArrayList。

下一篇讲方法:把一段逻辑包起来,起个名字,反复用。