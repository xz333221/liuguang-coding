---
title: 构造方法
summary: '构造方法在 new 的时候自动执行,负责把对象初始化到可用状态。不写它编译器送一个无参的;写了任何一个,送的那个就没了。多个构造方法之间用 this(...) 串起来。'
category: java
node: java-oop-constructor
order: 12
level: 入门
tags: [构造方法, 初始化, this, 重载]
updated: 2026-11-18
mindmap: java-oop-constructor.mindmap.json
terms: ["object"]
sources:
  - title: 廖雪峰 Java 教程 · 构造方法
    url: https://liaoxuefeng.com/books/java/oop/basic/constructor/index.html
    note: 默认构造方法、多构造方法与 this 调用的讲解参照。
  - title: 菜鸟教程 · Java 对象和类
    url: https://www.runoob.com/java/java-object-classes.html
    note: 构造方法的定义与调用时机对照。
---

上一篇造学生对象,是 new 出来再一个个字段赋值:

```java
Student s = new Student();
s.setName("小明");
s.setScore(89);
```

两行还好,字段多了就啰嗦,而且容易漏——漏赋一个字段,对象就带着默认值出去干活了。构造方法解决的就是这个问题:在 new 的同时把初始化做完。

## 构造方法长什么样

```java
class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }
}
```

构造方法有两个硬特征:

- 方法名**必须和类名一模一样**;
- **没有返回值类型**,连 void 都不写。

写了 void 会怎样?那就不再是构造方法,而是一个恰好和类同名的普通方法,编译器不报错,但 new 的时候不会调它。这是个经典手误。

调用不用喊名字,new 的时候自动执行:

```java
Student s = new Student("小明", 89);   // 构造方法在这里执行
```

`new Student("小明", 89)` 干了两件事:造出实例,执行构造方法把字段填好。对象一出生就是可用状态,不存在「造出来了但还没初始化」的中间态。

构造方法里同样可以写检查逻辑:

```java
public Student(String name, int score) {
    if (score < 0 || score > 100) {
        throw new IllegalArgumentException("分数必须在 0~100 之间");
    }
    this.name = name;
    this.score = score;
}
```

不合理的参数在出生这一刻就被挡住,比事后 setScore 再检查更彻底。

## 默认构造方法:不写才有

一个构造方法都不写时,编译器自动补一个无参的:

```java
class Student {
    // 编译器悄悄加了: public Student() {}
}

Student s = new Student();   // 能编译,调的是编译器补的那个
```

但只要你写了**任何一个**构造方法,编译器就不补了:

```java
class Student {
    public Student(String name) { ... }
}

Student s = new Student();   // 编译错误:找不到无参构造方法
```

道理也直白:你既然专门写了带参的初始化逻辑,说明这个对象不该被「什么都不填」地造出来。需要无参版本,就自己再写一个。很多框架(比如后面的 MyBatis、Spring)靠无参构造方法反射造对象,类里只写了带参构造时它们会报错,原因就在这。

## 多个构造方法与 this(...)

一个类可以有多个构造方法,参数列表不同即可——构造方法也参与重载:

```java
class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    public Student(String name) {
        this(name, 0);   // 调用上面那个构造方法
    }

    public Student() {
        this("无名氏");   // 调用带一个参数的
    }
}
```

`this(...)` 表示调用本类的另一个构造方法,按参数匹配。这样初始化逻辑只写在最完整的那个里,其余的层层委托,不重复。

注意:`this(...)` 必须是构造方法的**第一条语句**。先把自己初始化完,才有资格干别的。两个构造方法互相 this 调用会形成环,编译器直接报错。

## 初始化顺序

字段从「无」到「可用」,经过三步:

1. 先赋默认值(0、false、null);
2. 再执行字段声明处的初始化,比如 `private int score = 60;`;
3. 最后执行构造方法体。

```java
class Student {
    private int score = 60;

    public Student() {
        System.out.println(score);   // 60,不是 0
    }
}
```

构造方法体执行时,字段声明处的初始化已经做完了。日常代码很少需要纠结这个顺序,但读别人代码时看到字段初始化和构造方法赋值并存,要知道谁后执行谁生效。

## private 构造方法

构造方法也能加 private。加了之后,类外面 new 不了它:

```java
class MathUtil {
    private MathUtil() {}   // 禁止实例化

    static int square(int n) {
        return n * n;
    }
}
```

全是 static 方法的工具类,造实例没有意义,private 构造方法把这条路堵死。单例模式(第 16 章)也靠它:全局只许有一个实例,造实例的权力收归类自己。

## 小结

- 构造方法与类同名、无返回值类型,new 时自动执行,负责初始化;
- 不写构造方法,编译器补一个无参的;写了任何一个,补的那个消失;
- 多个构造方法构成重载;`this(...)` 委托另一个构造方法,必须放第一行;
- 初始化顺序:默认值 → 字段声明处初始化 → 构造方法体;
- private 构造方法禁止外部 new,工具类和单例常用。