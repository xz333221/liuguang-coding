---
title: 抽象类
summary: 'abstract 方法只有签名没有实现,abstract 类不能 new。它把「子类必须做什么」定成规范,把公共逻辑留在自己这里。子类不实现全部抽象方法,就得自己也声明为抽象类。'
category: java
node: java-oop-abstract
order: 16
level: 入门
tags: [抽象类, abstract, 模板]
updated: 2026-11-18
mindmap: java-oop-abstract.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · 抽象类
    url: https://liaoxuefeng.com/books/java/oop/basic/abstract-class/index.html
    note: 抽象方法、抽象类与多态配合的讲解参照。
  - title: 菜鸟教程 · Java 抽象类
    url: https://www.runoob.com/java/java-abstraction.html
    note: abstract 关键字用法对照。
---

多态那篇的 Income 有个隐患:`new Income(3000)` 是合法的,但「一笔说不清是什么的收入」按 10% 算税,业务上未必成立。更典型的例子是形状:定义一个 Shape 父类,面积怎么算?形状本身没有面积公式,只有圆、矩形这些具体形状才有。

父类的方法写不出有意义的实现,但又必须要求子类都有这个方法——这时用抽象类。

## abstract 方法与 abstract 类

```java
abstract class Shape {
    public abstract double area();
}
```

`abstract double area();` 只有签名,没有方法体,分号直接结束。它是一份契约:凡是我的子类,必须提供 area 的实现。

带抽象方法的类必须声明为 abstract。抽象类**不能实例化**:

```java
Shape s = new Shape();   // 编译错误:Shape 是抽象的,无法实例化
```

道理很直白:area 没有实现,造出来也没法用。抽象类存在的意义就是被继承:

```java
class Rect extends Shape {
    private double width, height;

    public Rect(double width, double height) {
        this.width = width;
        this.height = height;
    }

    @Override
    public double area() {
        return width * height;
    }
}

class Circle extends Shape {
    private double r;

    public Circle(double r) {
        this.r = r;
    }

    @Override
    public double area() {
        return Math.PI * r * r;
    }
}
```

子类实现了全部抽象方法,才是具体类,才能 new。如果子类只实现了一部分,或者一个都没实现,那它自己也得声明为 abstract,把剩下的契约继续往下传。

## 抽象类引用 + 多态

抽象类不能 new,但可以当引用类型,多态照常工作:

```java
static double totalArea(Shape[] shapes) {
    double total = 0;
    for (Shape s : shapes) {
        total += s.area();   // 运行时调各自子类的实现
    }
    return total;
}

Shape[] shapes = { new Rect(3, 4), new Circle(5) };
System.out.println(totalArea(shapes));   // 12 + 78.54 = 90.54
```

和 Income 的例子一个套路:totalArea 只认识 Shape,新加一种三角形,它一行不用改。抽象类在这里的作用是「定义规范」:它保证所有 Shape 都有 area,多态才有得调。

## 抽象类里可以有具体成员

抽象类不是「全抽象」,它可以有字段、构造方法、具体方法,一样不少:

```java
abstract class Shape {
    protected String name;

    public Shape(String name) {
        this.name = name;
    }

    public abstract double area();

    // 具体方法:所有子类共用
    public void printInfo() {
        System.out.println(name + " 的面积是 " + area());
    }
}
```

printInfo 是写好的公共逻辑,里面的 area() 留给子类实现。子类继承后直接拥有 printInfo,调它时 area() 走自己的版本。「公共流程写在父类,变化的步骤留给子类」——这个结构叫模板方法,第 16 章设计模式会正式讲。

抽象类的构造方法虽然不能直接 new 来调,但子类构造方法第一行的 super(...) 调的就是它,公共字段的初始化照样靠它完成。

## 什么时候用抽象类

两条标准,占一条就值得考虑:

- 一组类有公共字段或公共逻辑,想复用 → 抽象类当父类;
- 想强制子类实现某些方法,又不关心它们怎么实现 → 抽象方法定契约。

如果只需要定契约,连字段和公共逻辑都没有,那用接口更合适——下一篇就讲它。抽象类和接口不是二选一的对立关系,Java 集合框架里两者是配合使用的:接口定规范,抽象类放公共实现,具体类做最终实现。

## 小结

- abstract 方法只有签名没有实现;带抽象方法的类必须是 abstract 类,不能 new;
- 子类必须实现全部抽象方法才能成为具体类,否则自己也得是 abstract;
- 抽象类可以有字段、构造方法和具体方法,公共逻辑放这里,变化步骤留给子类;
- 抽象类引用配合多态,面向规范编程,新增子类不改旧代码;
- 只定契约不带状态时,用接口比抽象类更合适。