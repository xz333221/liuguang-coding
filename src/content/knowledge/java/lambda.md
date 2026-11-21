---
title: Lambda 与方法引用
summary: 'Lambda 是函数式接口(单一抽象方法)实例的简写；捕获的局部变量须 effectively final；方法引用有静态/实例/特定对象/构造器四种；与匿名类相比 this 指向外层且编译为 invokedynamic。'
category: java
node: java-functional-lambda
order: 45
level: 进阶
tags: [Lambda, 方法引用, 函数式接口, effectively final]
updated: 2026-11-18
mindmap: java-functional-lambda.mindmap.json
terms: ["syntax-sugar", "compile-time", "reference-type"]
sources:
  - title: Oracle Java 教程 · Lambda Expressions
    url: https://docs.oracle.com/javase/tutorial/java/javaOO/lambdaexpressions.html
    note: Lambda 语法、省略规则与变量捕获的依据。
  - title: Oracle Java 教程 · Method References
    url: https://docs.oracle.com/javase/tutorial/java/javaOO/methodreferences.html
    note: 四种方法引用形式的参照。
---

第 6 章的 removeIf、sort 都接收一个"行为"作为参数。Java 8 之前这种行为要用匿名内部类写，冗长；Lambda 把"传一段行为"变得简洁。这一篇讲 Lambda 的前提、语法与捕获规则，以及更简的方法引用。

## 前提：函数式接口

Lambda 不是独立的"函数类型"，它必须赋值给一个**函数式接口**:只含**一个抽象方法**的接口(SAM,Single Abstract Method)。例如：

```java
@FunctionalInterface
interface Transformer {
    String transform(String s);
}

Transformer upper = s -> s.toUpperCase();   // Lambda 实现唯一抽象方法
System.out.println(upper.transform("hi"));  // HI
```

编译器从目标类型(Transformer)推断 Lambda 的参数与返回类型。接口可以有 default / static 方法，不影响"单一抽象方法"的判定。JDK 内置的 Function、Consumer、Predicate 等都是函数式接口(下一篇)。

## 语法与省略规则

完整形式 `(参数) -> { 语句; return 值; }`，可按规则省略：

```java
(String s) -> { return s.toUpperCase(); }   // 完整
s -> s.toUpperCase()                        // 单参数省括号;单表达式省 {} 与 return
(a, b) -> a + b                             // 多参数保留括号
() -> 42                                    // 无参数
```

参数类型通常可省略(由目标类型推断)；省略后就不能再写显式类型混用。

## 变量捕获：effectively final

Lambda 可以引用外部的局部变量，但该变量必须是 **effectively final**:初始化后不再被赋值(不要求写 final 关键字):

```java
int factor = 3;
Function<Integer, Integer> mul = n -> n * factor;   // 合法
// factor = 4;   // 若重新赋值,上一行编译错误
```

原因：Lambda 可能在方法返回后才执行，捕获的是值的副本；允许修改会造成内外不一致。成员字段不受此限制(捕获的是 this 引用，字段可变)。

## 方法引用：四种形式

当 Lambda 体只是"调用一个已有方法"，可用方法引用进一步简写：

| 形式 | 语法 | 等价 Lambda |
| --- | --- | --- |
| 静态方法 | `Integer::parseInt` | `s -> Integer.parseInt(s)` |
| 特定对象的实例方法 | `System.out::println` | `x -> System.out.println(x)` |
| 任意对象的实例方法 | `String::toUpperCase` | `s -> s.toUpperCase()` |
| 构造器 | `ArrayList::new` | `() -> new ArrayList<>()` |

第三种注意：第一个参数成为接收者(`s.toUpperCase()`)，其余参数传给方法。

```java
List<String> names = List.of("bob", "alice");
names.stream().map(String::toUpperCase).forEach(System.out::println);
```

## 与匿名内部类的区别

- **this 指向**:Lambda 内的 this 指向**外层类**实例；匿名类内的 this 指向匿名类自身；
- **编译产物**:匿名类生成独立 class 文件；Lambda 编译为 invokedynamic 指令，运行时由 LambdaMetafactory 生成实现类，不产生额外 class 文件；
- **状态**:匿名类可有自己的字段；Lambda 只能捕获外部变量。

需要持有状态或覆写多个方法时用匿名类/普通类；只传单一行为用 Lambda。

## 小结

- Lambda 目标是函数式接口(单一抽象方法);
- 单参数省括号、单表达式省 {} 与 return;
- 捕获局部变量须 effectively final；字段不受限；
- 方法引用四种：静态 / 特定对象实例 / 任意对象实例 / 构造器；
- Lambda 的 this 指外层，编译为 invokedynamic，无额外 class 文件。

下一篇讲 JDK 内置函数式接口与组合。