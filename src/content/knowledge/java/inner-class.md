---
title: 内部类
summary: '定义在另一个类内部的类分三种:Inner Class 依附外部实例,能摸外部的 private;匿名类在 new 的同时定义实现;Static Nested Class 独立存在,不依附外部实例。日常用得少,读框架源码必须认识。'
category: java
node: java-oop-inner-class
order: 20
level: 进阶
tags: [内部类, 匿名类, 静态内部类]
updated: 2026-11-18
mindmap: java-oop-inner-class.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · 内部类
    url: https://liaoxuefeng.com/books/java/oop/basic/inner-class/index.html
    note: Inner Class、Anonymous Class、Static Nested Class 三类的讲解参照。
---

类通常定义在包里,互相平级。Java 还允许把类定义在另一个类内部,统称内部类(Nested Class)。日常业务代码写得不多,但框架源码里到处都是,不认识就读不下去。内部类分三种,逐个看。

## Inner Class:依附于外部实例

```java
class Outer {
    private String name;

    Outer(String name) {
        this.name = name;
    }

    class Inner {
        void hello() {
            System.out.println("你好, " + Outer.this.name);
        }
    }
}
```

Inner 定义在 Outer 内部,它和普通类最大的区别:**实例不能单独存在,必须依附一个 Outer 实例**:

```java
Outer outer = new Outer("流光");
Outer.Inner inner = outer.new Inner();   // 注意写法:outer.new
inner.hello();   // 你好, 流光
```

`outer.new Inner()` 这个别扭的写法正说明了依附关系:先有 outer,才能造 inner。Inner 实例内部隐含持有一个 Outer 实例的引用,用 `Outer.this` 访问它。

Inner 还有个特权:能访问 Outer 的 private 字段和方法。作用域在人家内部,自然看得见人家的私货。上面 hello 里直接读 name 也行,写 Outer.this.name 只是更明确。

编译后,Outer 生成 Outer.class,Inner 生成 Outer$Inner.class——$ 符号是内部类的文件名标记,见到别当成乱码。

## Anonymous Class:连名字都省了

有时只想临时实现一个接口,用一次,专门定义个类太啰嗦。匿名类在 new 的同时把实现写出来:

```java
Runnable r = new Runnable() {
    @Override
    public void run() {
        System.out.println("跑起来");
    }
};
new Thread(r).start();
```

Runnable 是接口,不能实例化,这段代码实际是「定义了一个实现 Runnable 的无名类,并立刻 new 了它」。类名没有,编译后按出现顺序叫 Outer$1.class、Outer$2.class。

匿名类也能继承普通类:

```java
HashMap<String, String> map = new HashMap<>() {
    {
        put("A", "1");
        put("B", "2");
    }
};
```

这是继承 HashMap 的匿名类,里面那层花括号是实例初始化块。这种「双花括号初始化」看着方便,实际造了个多余的匿名子类,序列化、equals 都可能出幺蛾子,不推荐用,认得就行。

匿名类和 Inner Class 本质相同:依附外部实例,能访问外部 private。JDK 8 之后,单方法接口的匿名类基本被 Lambda 取代:

```java
Runnable r = () -> System.out.println("跑起来");
```

一行顶十行。第 7 章细讲。现在写新代码,函数式接口一律 Lambda;匿名类留给需要多个方法、或需要继承类的场合。

## Static Nested Class:独立的嵌套类

加 static 的内部类,性质完全不同:

```java
class Outer {
    private static String NAME = "OUTER";
    private String name;

    static class StaticNested {
        void hello() {
            System.out.println("你好, " + Outer.NAME);   // 只能摸静态成员
        }
    }
}

Outer.StaticNested sn = new Outer.StaticNested();   // 不需要 Outer 实例
sn.hello();
```

它不依附任何 Outer 实例,没有 Outer.this,就是个恰好住在别人家里的独立类。能访问 Outer 的 private **静态**成员;实例字段摸不到,因为没有外部实例可依附。

把它挪到 Outer 外面,就失去访问 private 的权限——住在里面唯一的实惠就是这个。Map.Entry 就是典型的静态内部类:Entry 描述「键值对」,逻辑上属于 Map,但不需要依附某个 Map 实例。

## 三种怎么选

| 种类 | 依附外部实例 | 访问外部 private | 典型场景 |
|---|---|---|---|
| Inner Class | 是 | 实例 + 静态 | 迭代器(依附集合实例) |
| Anonymous Class | 是 | 实例 + 静态 | 临时实现接口 / 继承类 |
| Static Nested Class | 否 | 仅静态 | 逻辑上归属外部类的独立类型 |

还有一种定义在方法里的局部类(Local Class),用得极少,规则与匿名类类似,见到认得即可。

实际建议:能用顶层类解决就别用内部类;需要「逻辑归属 + 访问 private」时,优先静态内部类;只有真要依附外部实例状态时,才用 Inner Class。

## 小结

- Inner Class 依附外部实例,outer.new Inner() 创建,Outer.this 访问外部,能摸 private;
- 匿名类在 new 处定义并实例化,编译为 Outer$1.class;单方法接口优先用 Lambda;
- Static Nested Class 独立存在,只能访问外部静态成员,是最常用的内部类形态;
- 内部类编译产物带 $ 符号;日常少用,读源码必识。