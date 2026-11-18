---
title: JavaBean 与枚举
summary: 'JavaBean 是「私有字段 + getter/setter + 无参构造」的约定,框架靠反射按约定读写属性;只装数据的不可变载体用 record 更省。枚举把一组常量变成类型,编译器帮你查错,比较用 ==。'
category: java
node: java-core-bean-enum
order: 29
level: 入门
tags: [JavaBean, record, enum, getter, setter]
updated: 2026-11-18
mindmap: java-core-bean-enum.mindmap.json
terms: ["enum", "record"]
sources:
  - title: 廖雪峰 Java 教程 · JavaBean
    url: https://liaoxuefeng.com/books/java/oop/core/javabean/index.html
    note: JavaBean 命名约定与反射读写属性的讲解参照。
  - title: 廖雪峰 Java 教程 · 枚举类
    url: https://liaoxuefeng.com/books/java/oop/core/enum/index.html
    note: enum 类型安全、ordinal 风险与带字段枚举参照。
  - title: 廖雪峰 Java 教程 · 记录类
    url: https://liaoxuefeng.com/books/java/oop/core/record/index.html
    note: record 自动生成成员与紧凑构造器参照。
---

这一篇讲两种「装数据」的类:JavaBean 和枚举,顺带讲 JDK 16 的记录类 record——它是 JavaBean 在不可变场景下的现代替代。

## JavaBean:一种约定

JavaBean 不是某个类或接口,是一套命名约定:

- 字段 private;
- 每个字段配 public 的 getter/setter:`getXxx()` / `setXxx(...)`,boolean 字段可以用 `isXxx()`;
- 有一个 public 无参构造方法。

```java
public class Student {
    private String name;
    private int age;

    public Student() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
}
```

约定本身平平无奇,值钱的是**框架按约定办事**:Spring、MyBatis、Jackson 这些框架通过反射扫描 getXxx/setXxx,自动完成「数据库列 → 字段」「JSON 键 → 属性」的映射。你不用写任何映射代码,只要遵守命名规则。属性名由方法名推导:getName → name,isPassed → passed。

字段和 getter 类型不一致、方法名拼错,框架就认不出这个属性,而且常常不报错,只是默默丢数据。排查「字段没被注入」时,先核对命名约定。

getter/setter 手写啰嗦,IDE 一键生成(IDEA 里 Alt+Insert)。后面学了 Lombok 的 @Data 还能省掉这一步,但原理要懂:生成的就是这套约定代码。

## record:不可变数据载体

很多类只是「装几个值」:坐标、DTO、查询结果。给它们写全套 JavaBean 样板,纯属体力活。JDK 16 正式引入 record:

```java
public record Point(int x, int y) {}
```

一行,编译器自动生成:

- 两个 private final 字段;
- 全参构造方法;
- 访问器 `x()`、`y()`(注意没有 get 前缀);
- 基于全部字段的 equals、hashCode、toString。

```java
Point p = new Point(1, 2);
System.out.println(p.x());        // 1
System.out.println(p);            // Point[x=1, y=2]
p.equals(new Point(1, 2));        // true,自动生成的
```

要加校验,写紧凑构造器:

```java
public record Point(int x, int y) {
    public Point {
        if (x < 0 || y < 0) {
            throw new IllegalArgumentException("坐标不能为负");
        }
    }
}
```

`public Point { ... }` 没有参数列表,校验完编译器自动接上字段赋值。

record 是隐式 final 的,不能继承,字段不可变。需要可变、需要继承体系的场景,还是 JavaBean;纯数据载体,优先 record。它自动生成的 equals/hashCode 天然满足契约,省掉 3.2 节那套手写。

## 枚举:让常量成为类型

表示星期,老写法是一组 int 常量:

```java
public static final int MON = 1;
public static final int TUE = 2;
```

问题:编译器管不住。`int day = 99;` 照样能参与比较,传错了不报错;星期常量和颜色常量都是 int,混用也不报错。

enum 把常量变成类型:

```java
enum Weekday {
    MON, TUE, WED, THU, FRI, SAT, SUN;
}

Weekday day = Weekday.MON;
if (day == Weekday.SAT || day == Weekday.SUN) {
    System.out.println("休息");
}
```

好处立刻显现:

- `int day = 1; day == Weekday.MON` 编译报错,类型不同;
- 赋一个不存在的值?写不出来,编译期就挡住;
- 不同枚举类型互不相容,星期和颜色混不了。

## 枚举的比较与方法

enum 的每个常量在 JVM 里全局唯一,所以**用 == 比较就行**,这是引用类型里唯一推荐 == 的场合(equals 也行,但多此一举)。

常用方法:

```java
Weekday.MON.name();      // "MON",常量名
Weekday.MON.ordinal();   // 0,定义顺序
Weekday.values();        // 全部常量的数组
Weekday.valueOf("MON");  // 按名字取常量,不存在抛 IllegalArgumentException
```

**别依赖 ordinal()。** 它是定义顺序,有人在中间插一个常量,所有序号全变,存进数据库的旧序号就错位了。要编号,给枚举加字段:

```java
enum Weekday {
    MON(1), TUE(2), WED(3), THU(4), FRI(5), SAT(6), SUN(0);

    public final int dayValue;

    private Weekday(int dayValue) {
        this.dayValue = dayValue;
    }
}
```

枚举本质是 class:构造方法 private(不许外面 new),可以有字段、方法,甚至实现接口。每个常量还能各自覆写方法,做到「每个常量自己的行为」,读框架源码时会见到。

枚举也能进 switch,第 2 章的箭头 switch 配枚举特别清爽:

```java
String type = switch (day) {
    case SAT, SUN -> "休息日";
    default -> "工作日";
};
```

## 小结

- JavaBean = private 字段 + getter/setter + 无参构造的约定,框架靠反射按约定映射;
- 纯数据不可变载体用 record:一行生成构造器、访问器、equals/hashCode/toString;紧凑构造器加校验;
- 枚举把常量变成类型,编译期查错;比较用 ==(全局唯一实例);
- 别依赖 ordinal(),要编号就加字段;枚举是 class,能有字段和方法。