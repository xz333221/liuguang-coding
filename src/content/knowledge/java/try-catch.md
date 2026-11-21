---
title: try-catch-finally 与 try-with-resources
summary: 'catch 按声明顺序匹配、子类在前；finally 无论是否异常都执行；try-with-resources 让 AutoCloseable 资源自动关闭，并把关闭时的异常记为 suppressed。'
category: java
node: java-exception-try
order: 35
level: 入门
tags: [try, catch, finally, try-with-resources, AutoCloseable]
updated: 2026-11-18
mindmap: java-exception-try.mindmap.json
terms: ["null", "runtime"]
sources:
  - title: Oracle Java 教程 · Catching and Handling Exceptions
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/catch.html
    note: catch 匹配顺序与多 catch 的讲法参照。
  - title: Oracle Java 教程 · The try-with-resources Statement
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html
    note: AutoCloseable 自动关闭与 suppressed 异常的依据。
---

上一篇分清了异常类别，这一篇讲怎么接住它们：try-catch-finally 的执行顺序，以及 JDK 7 引入的 try-with-resources 如何保证资源被关闭。

## 基本结构与执行顺序

```java
try {
    int n = Integer.parseInt("abc");   // 抛 NumberFormatException
    System.out.println(n);             // 不执行
} catch (NumberFormatException e) {
    System.out.println("解析失败:" + e.getMessage());
} finally {
    System.out.println("finally 总会执行");
}
```

顺序规则：

- try 中某行抛出异常后，该行**之后**的 try 语句不再执行；
- 从上到下匹配第一个类型兼容的 catch，进入后其余 catch 跳过；
- 无论是否抛出异常、是否被捕获，finally 都执行(除非 JVM 退出，如 `System.exit`)。

## 多 catch:子类必须在前

catch 按声明顺序匹配，父类写在前面会把子类全部拦截，导致子类 catch 永远进不去，编译器直接报错：

```java
try {
    // ...
} catch (Exception e) {          // 编译错误:下面的子类 catch 不可达
} catch (java.io.FileNotFoundException e) {
}
```

正确写法是子类在前、父类在后。JDK 7 起还可以用 `|` 合并互不继承的多个类型：

```java
catch (NumberFormatException | java.io.IOException e) {
    // 两种异常同一段处理逻辑
}
```

## finally 与 return 的交互

finally 在 return **之后**、方法真正返回**之前**执行。因此在 finally 里写 return 会覆盖 try/catch 的返回值，也会吞掉异常——这是应当避免的写法：

```java
static int bad() {
    try {
        return 1;
    } finally {
        return 2;   // 实际返回 2,try 的返回值被覆盖
    }
}
```

finally 的正确用途是释放资源、复位状态，而不是改变返回值或吞异常。

## try-with-resources:自动关闭资源

手动在 finally 里 close 资源繁琐且易错(close 本身也可能抛异常)。try-with-resources 把资源声明在 try 的括号里，退出 try 块时自动调用 close:

```java
import java.io.BufferedReader;
import java.io.FileReader;

try (BufferedReader r = new BufferedReader(new FileReader("a.txt"))) {
    System.out.println(r.readLine());
}   // 离开时自动 r.close(),无需 finally
```

前提：资源类实现 `AutoCloseable` 接口(只有一个 close 方法)。InputStream、Reader、Connection、PreparedStatement 等都实现了它。

可以声明多个资源，用分号隔开；**关闭顺序与声明顺序相反**:

```java
try (FileReader fr = new FileReader("a.txt");
     BufferedReader br = new BufferedReader(fr)) {
    // 先关 br,再关 fr
}
```

### suppressed 异常

如果 try 块抛了异常 A,close 时又抛了异常 B,Java 不会让 B 覆盖 A:主异常仍是 A,B 被记为 A 的**抑制异常**(suppressed exception)，可用 `A.getSuppressed()` 取回。这保证了真正的业务异常不被资源关闭异常掩盖。

## 不要吞异常

```java
catch (Exception e) {
    // 空着:错误信息被丢弃,排查时无从下手
}
```

至少记录日志或包装后重新抛出。捕获的意义是"处理"，不是"让报错消失"。

## 小结

- try 抛异常后其后语句不执行；catch 按声明顺序匹配，子类在前；
- finally 总执行，适合释放资源；不要在 finally 里 return 或吞异常；
- try-with-resources 自动 close AutoCloseable 资源，多资源逆序关闭；
- close 抛出的异常记为主异常的 suppressed，不覆盖主异常；
- 禁止空 catch。

下一篇讲自定义异常：什么时候该定义自己的异常类型，以及抛出的时机。