---
title: 方法
summary: '实例方法通过对象调用，this 指向当前对象；static 方法属于类本身，不用 new 就能调，但也访问不了实例字段。可变参数本质是数组，必须放在参数列表最后。'
category: java
node: java-oop-method
order: 11
level: 入门
tags: [方法, this, static, 可变参数, 方法签名]
updated: 2026-11-18
mindmap: java-oop-method.mindmap.json
terms: ["pass-by-value"]
sources:
  - title: 廖雪峰 Java 教程 · 方法
    url: https://liaoxuefeng.com/books/java/oop/basic/method/index.html
    note: 实例方法、this、可变参数与封装的讲解顺序参照。
  - title: 菜鸟教程 · Java 方法
    url: https://www.runoob.com/java/java-methods.html
    note: 方法定义与调用结构的对照。
---

第 2 章写过方法，那时所有方法都带 static，在 main 里通过方法名直接调用。上一篇定义了 Student 类，方法写在类里、通过实例调用，那是另一种形态。这一篇把两种形态分清楚，再讲 this 和可变参数。

## 实例方法：通过对象调用

```java
class Student {
    private String name;
    private int score;

    public boolean isPassed() {
        return score >= 60;
    }
}
```

isPassed 没有 static，叫实例方法。调用它必须先有实例：

```java
Student s = new Student();
s.isPassed();
```

实例方法里用到的字段，是当前实例的字段。s1.isPassed() 用 s1 的 score,s2.isPassed() 用 s2 的 score。方法代码一份，数据各用各的。

## this:当前实例

方法内部有一个隐含变量 this，指向「正在调这个方法的那个实例」。字段和参数同名时，靠它区分：

```java
class Student {
    private String name;

    public void setName(String name) {
        this.name = name;   // 左边是字段,右边是参数
    }
}
```

不写 this 行不行？参数名和字段名不冲突时可以省略，编译器自动找字段。但同名时必须写，否则 `name = name` 是参数自己赋自己，字段不会被修改——这是个不报错的 bug，很隐蔽。习惯上，给字段赋值一律写 this，省得记哪个冲突哪个不冲突。

this 还有一个用途：在构造方法里调用本类的另一个构造方法，写作 `this(...)`，下一篇构造方法里讲。

注意：static 方法里没有 this。this 指向实例，static 方法不依附任何实例，自然没有「当前实例」可言。在 static 方法里写 this，编译报错。

## static 方法：属于类本身

带 static 的方法属于类，不属于任何实例，用类名直接调：

```java
class MathUtil {
    static int square(int n) {
        return n * n;
    }
}

int x = MathUtil.square(5);   // 25,不用 new MathUtil()
```

main 就是 static 方法：程序刚启动，一个实例都没有，JVM 只能按类名找到它。第 2 章我们写的方法都加 static，就是因为那时还没有对象可依附。

static 方法有一条硬限制：**不能访问实例字段，也不能调实例方法**。道理很直白——static 方法可以在没有任何实例的时候被调用，这时实例字段根本不存在，自然无法访问。

```java
class Student {
    private int score;

    static void print() {
        System.out.println(score);   // 编译错误:static 里访问不了实例字段
    }
}
```

反过来，实例方法访问 static 字段、调 static 方法，不受限制。

什么时候用 static?方法只依赖参数、不依赖对象状态的时候。Math.abs、Integer.parseInt 都是这类：给什么参数算什么结果，和任何对象无关。需要读写对象状态的方法，一律实例方法。

## 参数绑定：还是值传递

第 2 章的结论在这里原样适用：Java 只有值传递。基本类型复制值；引用类型复制引用，方法里通过引用修改对象内容，外面看得见；把形参重新指向新对象，外面看不见。对象传参和数组传参没有任何区别，不再重复举例，忘了就回第 2 章翻方法那一篇。

## 可变参数

方法有时要接收「个数不定」的同类型参数，比如求任意多个数的和。常规办法是传数组：

```java
static int sum(int[] numbers) {
    int total = 0;
    for (int n : numbers) {
        total += n;
    }
    return total;
}

sum(new int[]{1, 2, 3});   // 每次调用都得先创建数组
```

可变参数(varargs)让调用方省掉创建数组这一步：

```java
static int sum(int... numbers) {
    int total = 0;
    for (int n : numbers) {
        total += n;
    }
    return total;
}

sum(1, 2, 3);   // 6
sum();          // 0,一个都不传也行
sum(new int[]{1, 2, 3});   // 传数组也兼容
```

`int... numbers` 读作「任意多个 int」。方法体里 numbers 就是 int[]，可以遍历、可以取长度。编译器在调用处自动把零散的参数打包成数组。

两条规则：

- 可变参数必须放在参数列表的**最后**。`void f(int... nums, String name)` 编译报错，因为编译器没法知道零散参数到哪里结束；
- 一个参数列表里只能有一个可变参数。

`System.out.printf("%s 今年 %d 岁", name, age)` 的第二个参数就是 `Object...`，所以可以传任意类型的参数。

## 方法签名

方法名加参数列表(参数的类型、个数、顺序)，合称方法签名。返回值类型**不算**签名的一部分。这个词下一篇重载、后面多态都会用到：重载看签名是否不同，覆写看签名是否相同。先初步认识。

## 小结

- 实例方法通过对象调用，用当前实例的字段；static 方法通过类名调用，不依附实例；
- this 指向当前实例，字段与参数同名时靠它区分；static 方法里没有 this;
- static 方法不能访问实例字段和实例方法；只依赖参数的工具方法适合 static;
- 传参规则不变：只有值传递，引用类型复制的是引用；
- 可变参数 `类型... 名` 本质是数组，必须放最后，只能有一个；
- 方法签名 = 方法名 + 参数列表，不含返回值。