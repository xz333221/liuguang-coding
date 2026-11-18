---
title: 接口
summary: 'interface 是纯契约:方法默认 public abstract,不能定义实例字段。一个类可以实现多个接口,弥补单继承的限制。JDK 8 起接口可以有 default 方法,给接口加方法不再逼所有实现类跟着改。'
category: java
node: java-oop-interface
order: 17
level: 入门
tags: [接口, interface, implements, default方法]
updated: 2026-11-18
mindmap: java-oop-interface.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · 接口
    url: https://liaoxuefeng.com/books/java/oop/basic/interface/index.html
    note: 接口与抽象类对比、default 方法动机的讲解参照。
  - title: 菜鸟教程 · Java 接口
    url: https://www.runoob.com/java/java-interfaces.html
    note: implements 与多接口实现的基础用法对照。
---

抽象类能定契约,但它毕竟是个类,带着字段和实现,一个类只能继承一个。如果只想规定「能做什么」,完全不关心状态和实现,用接口更干净。

## interface:纯契约

```java
interface Runnable {
    void run();
}
```

接口里的方法默认就是 `public abstract`,写不写这两个修饰符效果一样。接口不能定义实例字段——它描述能力,不描述状态。能放的字段只有 `public static final` 常量,一般也不放。

类实现接口用 implements:

```java
class Student implements Runnable {
    private String name;

    public Student(String name) {
        this.name = name;
    }

    @Override
    public void run() {
        System.out.println(name + " 在跑步");
    }
}
```

实现接口和继承抽象类一样,必须实现全部抽象方法,否则自己得声明为抽象类。

## 一个类可以实现多个接口

Java 不许一个类有两个父类,但接口想实现几个实现几个:

```java
interface Hello {
    void hello();
}

class Student implements Runnable, Hello {
    @Override
    public void run() { ... }

    @Override
    public void hello() { ... }
}
```

这就是「单继承 + 多实现」的组合:状态和公共逻辑从唯一的父类继承,能力从多个接口获得。两个接口有同名同参的抽象方法也不冲突——反正都没有实现,子类写一份就同时满足两边。

接口之间也能继承,用 extends,而且接口可以多继承接口:

```java
interface Person extends Runnable, Hello {
    String getName();
}
```

Person 接口现在有三个抽象方法。实现 Person 的类要把三个都实现了。

## 接口引用与多态

接口也是类型,可以当引用变量,多态照常:

```java
Runnable r = new Student("小明");
r.run();   // 小明在跑步
```

实际写代码,尽量用接口类型引用对象:

```java
List<String> list = new ArrayList<>();
```

声明是 List 接口,实现是 ArrayList。哪天想换 LinkedList,改 new 那一处就行,其余代码只依赖 List 的方法,不受影响。这个习惯的价值,和上一篇 totalArea 只认识 Shape 是同一个道理。

## default 方法:给接口加实现

JDK 8 起,接口里可以写带方法体的 default 方法:

```java
interface Person {
    String getName();

    default void run() {
        System.out.println(getName() + " 在跑步");
    }
}
```

实现类可以不覆写 run,直接继承这份默认实现;想定制,覆写即可。

为什么需要它?想象 List 接口已经发布十几年,全世界的代码都在实现它。现在想给 List 加个新方法——如果是抽象方法,所有实现类当场编译失败。加成 default 方法,老实现类一行不改就能用上新功能。JDK 8 给 List 加的 sort、forEach 就是这么进去的。

default 方法和抽象类的具体方法有个本质区别:接口没有实例字段,default 方法里访问不了状态,只能调接口里的其他方法。需要状态支撑的公共逻辑,还是放抽象类。

JDK 8 还允许接口写 static 方法(工具方法,如 Comparator.comparing),JDK 9 起允许 private 方法给 default 方法打杂。见到不奇怪,自己写业务接口很少用到。

## 抽象类 vs 接口

| | 抽象类 | 接口 |
|---|---|---|
| 关键字 | abstract class / extends | interface / implements |
| 数量限制 | 只能继承一个 | 可以实现多个 |
| 实例字段 | 可以有 | 不能有 |
| 构造方法 | 可以有 | 没有 |
| 具体方法 | 普通方法 | default / static 方法 |
| 表达的关系 | is-a(是什么) | can-do(能做什么) |

选型口诀:要复用状态和公共逻辑,用抽象类;只定能力契约,用接口。两者经常配合:接口定规范,抽象类实现一部分公共逻辑,具体类补齐剩下的。Java 集合框架就是这个结构:List 接口 → AbstractList 抽象类 → ArrayList 具体类。

## 函数式接口:一个伏笔

只有一个抽象方法的接口,叫函数式接口,Runnable 就是。JDK 8 起它可以用 Lambda 一行写完:

```java
Runnable r = () -> System.out.println("跑");
```

这是第 7 章函数式编程的主角,这里先认个脸。

## 小结

- 接口是纯契约:方法默认 public abstract,没有实例字段、没有构造方法;
- 类用 implements 实现接口,可以实现多个;接口之间用 extends,可以多继承;
- 用接口类型引用对象,换实现只改一处;
- default 方法让接口能演化而不破坏已有实现类;它访问不了实例字段;
- 抽象类管 is-a 与公共逻辑,接口管 can-do 与能力契约,两者配合使用。