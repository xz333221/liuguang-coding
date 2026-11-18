---
title: 静态字段和静态方法
summary: 'static 成员属于类本身:静态字段全体实例共用一份,静态方法不用 new 就能调。常量用 public static final 定义。static 代码块在类加载时执行一次。'
category: java
node: java-oop-static
order: 18
level: 入门
tags: [static, 静态字段, 常量, 类加载]
updated: 2026-11-18
mindmap: java-oop-static.mindmap.json
terms: ["object"]
sources:
  - title: 廖雪峰 Java 教程 · 静态字段和静态方法
    url: https://liaoxuefeng.com/books/java/oop/basic/static/index.html
    note: 静态字段共享语义与访问方式的讲解参照。
  - title: 菜鸟教程 · Java 对象和类
    url: https://www.runoob.com/java/java-object-classes.html
    note: static 关键字基础用法对照。
---

方法那篇讲过 static 方法:属于类,不用实例就能调。static 还能修饰字段,含义类似但更值得细说——它改变了字段的「份数」。

## 静态字段:全体实例共用一份

实例字段是每个对象各一份。想统计「一共造了多少个 Student」,字段放实例里就不对了:每个对象只知道自己的事。把计数器声明为 static:

```java
class Student {
    private String name;
    public static int count = 0;   // 静态字段

    public Student(String name) {
        this.name = name;
        count++;
    }
}
```

跑一下:

```java
new Student("小明");
new Student("小红");
System.out.println(Student.count);   // 2
```

count 不属于任何一个 Student,它属于 Student 这个类,内存里只有一份。每 new 一次,构造方法把这一份加 1。无论造多少个实例,甚至一个都不造,Student.count 都在那里。

对比着记:

- 实例字段:每个实例各一份,描述「这个对象的状态」;
- 静态字段:全类一份,描述「这类对象的公共状态」。

## 用类名访问

静态字段推荐用类名访问:`Student.count`。通过实例访问 `s.count` 语法上也允许,但读代码的人会误以为它是 s 的私有状态,实际上改的是全局那份。实例访问静态成员是个坏习惯,IDE 会警告。

静态方法同理:`Math.abs(-1)` 而不是 `new Math().abs(-1)`——Math 的构造方法本来就是 private,根本 new 不了。

## 静态方法:再补两条

方法那篇讲过的结论不重复,这里补两条容易踩的:

**静态方法里不能用 this,也不能直接访问实例字段。** 没有实例,何来 this。需要实例数据,就通过参数传进来:

```java
static void printName(Student s) {
    System.out.println(s.getName());   // 实例从参数来,没问题
}
```

**静态方法没有多态。** 父类引用调静态方法,执行父类版本,上一篇多态里讲过。

## 常量:public static final

一组固定不变的值,标准写法是三个修饰符一起上:

```java
class Config {
    public static final int MAX_RETRY = 3;
    public static final String APP_NAME = "流光";
}
```

- static:全类一份,不用造对象;
- final:赋值后不能再改;
- public:外面随便读。

命名约定全大写加下划线。Math.PI、Integer.MAX_VALUE 都是这个套路。第 2 章讲过的字面量后缀、枚举,和常量是不同层面的东西:常量是「给值起名字」,枚举是「值本身构成一个类型」,3.3 节讲枚举时会对比。

注意:final 修饰引用类型时,锁住的是引用,不是对象内容:

```java
public static final int[] NUMS = {1, 2, 3};
NUMS[0] = 99;      // 合法!数组内容能改
NUMS = new int[5]; // 编译错误:引用不能换
```

「常量数组」其实常量不了,真要不可变,用 List.of 这类不可变集合(第 6 章讲)。

## static 代码块

类里可以写 static 块,类第一次被加载时执行一次,且只执行一次:

```java
class Config {
    public static final Map<String, String> DEFAULTS;

    static {
        DEFAULTS = new HashMap<>();
        DEFAULTS.put("timeout", "30");
        DEFAULTS.put("retry", "3");
    }
}
```

适合「初始化逻辑不止一行」的静态字段。多个 static 块按书写顺序执行。实例字段对应的初始化块(不带 static)则每次 new 都执行,很少用,见到认得即可。

类加载的完整机制(什么时候加载、加载几步)是第 11 章 JVM 的内容,现在记住「static 块跟着类加载走,只跑一次」就够。

## 小结

- 静态字段全类一份,描述公共状态;实例字段各对象一份,描述个体状态;
- 静态成员用类名访问,别用实例访问;
- 静态方法没有 this、摸不到实例字段、没有多态;
- 常量 = public static final + 全大写命名;final 锁引用不锁对象内容;
- static 块在类加载时执行一次,适合复杂的静态初始化。