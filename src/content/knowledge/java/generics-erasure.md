---
title: 类型擦除
summary: 'Java 泛型是编译期机制:编译后类型参数被擦除到左边界或 Object,运行时 List<String> 与 List<Integer> 是同一个 Class;由此带来不能 new T()、instanceof 不能带类型参数等限制。'
category: java
node: java-generics-erasure
order: 39
level: 深入
tags: [类型擦除, 桥方法, 泛型限制, 反射]
updated: 2026-11-18
mindmap: java-generics-erasure.mindmap.json
terms: ["compile-time", "runtime", "bytecode", "reference-type"]
sources:
  - title: Oracle Java 教程 · Type Erasure
    url: https://docs.oracle.com/javase/tutorial/java/generics/erasure.html
    note: 擦除规则与桥方法的依据。
  - title: Oracle Java 教程 · Restrictions on Generics
    url: https://docs.oracle.com/javase/tutorial/java/generics/restrictions.html
    note: 不能实例化类型参数、instanceof 限制等条目参照。
---

前两篇的泛型约束都发生在编译期。这一篇回答:编译之后,那些 `<String>`、`<T>` 去了哪里?答案是**类型擦除**(type erasure)——泛型信息在生成字节码时被移除,运行时并不存在"List<String> 类"。

## 擦除规则

编译器把类型参数替换为它的**左边界**(第一个约束);无界则替换为 Object:

- `class Box<T>` → 字节码里 T 变成 Object;
- `class Box<T extends Number>` → T 变成 Number;
- `List<String>` 与 `List<Integer>` → 运行时都是 `java.util.List` 同一个 Class。

验证:

```java
List<String> a = new ArrayList<>();
List<Integer> b = new ArrayList<>();
System.out.println(a.getClass() == b.getClass());   // true
```

擦除后,编译器在取值处自动插入强转(把 Object 转回声明的类型),所以源码里看不到强转,字节码里有。

## 桥方法:擦除后如何保持多态

擦除会破坏覆写关系。例如:

```java
class Node<T> {
    public T get() { ... }
}
class StringNode extends Node<String> {
    @Override
    public String get() { ... }   // 协变返回
}
```

擦除后父类 get 返回 Object,子类 get 返回 String,签名不同,不构成覆写。编译器为此在子类生成一个**桥方法**(bridge method):`Object get()` 内部调用 `String get()`,从而在字节码层面维持多态。桥方法是合成方法,反射可见但源码不可见。

## 擦除带来的限制

因为运行时没有类型参数信息,以下写法被禁止:

- **不能实例化类型参数**:`new T()`、`new T[10]` 编译错误——运行时不知道 T 是什么,无法确定构造器与数组组件类型;
- **instanceof 不能带类型参数**:`o instanceof List<String>` 编译错误,只能 `o instanceof List<?>`;
- **不能 catch 泛型异常**:`class MyException<T> extends Exception` 不允许,catch 参数也不能是类型参数;
- **不能创建泛型数组**:`new List<String>[10]` 编译错误(可用 `List<?>[]` 或 ArrayList 替代);
- **静态成员不能用类的类型参数**:static 字段/方法属于类而非某次实例化,T 在静态上下文无意义。

需要"按 T 创建对象"时,传入 `Class<T>` 或 `Supplier<T>` 由调用方提供构造能力,而不是 new T()。

## 声明处的泛型签名仍保留

擦除移除的是**实例化处**的类型实参,但类/方法/字段**声明处**的泛型签名会保留在字节码的 Signature 属性里,反射可读:

```java
class StringList extends ArrayList<String> {}
// 反射:getGenericSuperclass() 得到 ParameterizedType,
// 其实际类型实参为 String
```

这正是 Jackson、Spring 等框架能识别 `new TypeReference<List<User>>(){}` 的原理:利用匿名子类把泛型实参固化到声明处,再反射读取。

## 为什么选擦除:迁移兼容

Java 5 引入泛型时,必须让泛型代码与既有非泛型代码、既有 JVM 字节码共存。擦除使泛型不改变运行时类结构,老类库无需重编译即可互操作。代价是运行时拿不到类型实参、以及上面那些限制。C++ 模板走另一条路(每个实参实例化一份代码,无擦除),换来运行时类型信息但带来代码膨胀。两者是不同权衡。

## 小结

- 泛型是编译期机制,编译后类型参数擦除到左边界或 Object;
- List<String> 与 List<Integer> 运行时同一个 Class;取值处编译器自动插强转;
- 桥方法在字节码层维持擦除后的覆写/多态;
- 限制:不能 new T()/T[]、instanceof 不带实参、不能 catch 泛型异常、静态成员不用类 T;
- 声明处泛型签名保留,反射可读,是 TypeReference 类技巧的基础;
- 擦除是为迁移兼容做的权衡。

下一章进入集合框架:List / Map / Set 各自的结构与选型。