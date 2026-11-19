---
title: 注解的定义与读取
summary: '注解是声明式元数据:@interface 定义,元注解 @Target/@Retention 约束作用位置与保留阶段;RetentionPolicy 分 SOURCE/CLASS/RUNTIME,只有 RUNTIME 可反射读取;注解本身不执行逻辑,需处理器驱动。'
category: java
node: java-reflection-annotation
order: 51
level: 深入
tags: [注解, 元注解, Retention, 反射读取]
updated: 2026-11-18
mindmap: java-reflection-annotation.mindmap.json
terms: ["runtime", "compile-time", "bytecode"]
sources:
  - title: Oracle Java 教程 · Annotations
    url: https://docs.oracle.com/javase/tutorial/java/annotations/
    note: 注解定义、元注解与保留策略的依据。
  - title: java.lang.annotation.RetentionPolicy javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/annotation/RetentionPolicy.html
    note: SOURCE/CLASS/RUNTIME 三档的官方定义。
---

@Override、@Transactional、@RequestMapping 都是注解。注解不改变代码的执行逻辑,它只是**贴在声明上的元数据**,由编译器或运行时处理器读取后驱动行为。这一篇讲怎么定义注解、怎么保留、怎么读。

## 注解是元数据,不是逻辑

先纠正一个常见误解:给方法加 @Transactional 不会"自动"开启事务——是 Spring 的处理器读到这个注解后,用动态代理织入事务逻辑。注解本身只是标记,行为来自**读取并解释它的处理器**。没有处理器,注解毫无作用。

## 定义:@interface

```java
import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Audit {
    String value() default "";        // 名为 value 的属性使用时可省略名字
    int level() default 1;
}
```

- 属性只能是基本类型、String、Class、枚举、注解及它们的数组;
- `default` 给默认值;无默认值的属性使用时必须赋值;
- 名为 `value` 的单属性使用时可写 `@Audit("x")` 省略 `value=`。

使用:

```java
@Audit("createOrder")
public void createOrder() { ... }
```

## 元注解:约束注解本身

- **@Target**:能贴在哪里。ElementType.TYPE(类/接口)、METHOD、FIELD、PARAMETER、CONSTRUCTOR、LOCAL_VARIABLE 等;不写则处处可贴;
- **@Retention**:保留到哪个阶段(见下);
- **@Documented**:纳入 javadoc;
- **@Inherited**:类上的注解可被子类继承(仅对类有效,方法/接口无效);
- **@Repeatable**(JDK8):允许同一位置重复贴,需指定容器注解。

## RetentionPolicy:三档保留

| 策略 | 保留到 | 典型 |
| --- | --- | --- |
| SOURCE | 仅源码,编译丢弃 | @Override、Lombok |
| CLASS | 字节码,运行时不可反射(默认) | 某些字节码增强 |
| RUNTIME | 字节码 + 运行时可反射 | @Transactional、自定义业务注解 |

**只有 RUNTIME 的注解才能被反射读到**。自定义业务注解若打算运行时处理,必须显式 `@Retention(RUNTIME)`——漏写则默认 CLASS,反射读不到,是高频错误。

## 反射读取

```java
Method m = OrderService.class.getMethod("createOrder");
if (m.isAnnotationPresent(Audit.class)) {
    Audit a = m.getAnnotation(Audit.class);
    System.out.println(a.value() + " level=" + a.level());
}
```

类、字段、方法、参数、构造器都可 getAnnotation / isAnnotationPresent。框架在启动期扫描类路径,收集带特定注解的成员,注册成 Bean / 路由 / 切面——这就是"约定优于配置"的底层机制。

## 注解处理器:两条路线

- **编译期**(SOURCE/CLASS):Annotation Processing Tool(APT)在编译时生成代码,Lombok、MapStruct 走这条;
- **运行时**(RUNTIME):反射读取 + 动态代理/容器注册,Spring 走这条。

定义注解时先想清楚由谁、在哪个阶段处理,再选 Retention 与 Target。

## 小结

- 注解是元数据,行为来自处理器,本身不执行逻辑;
- @interface 定义,属性类型受限,value 可省名;
- 元注解 @Target/@Retention/@Documented/@Inherited/@Repeatable 约束;
- Retention 三档:SOURCE/CLASS/RUNTIME,仅 RUNTIME 可反射读;
- 反射 getAnnotation 读取;编译期 APT 与运行时反射是两条处理路线。

下一章进入 IO 与 NIO:字节流、字符流与缓冲。