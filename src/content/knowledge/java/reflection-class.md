---
title: Class 对象与反射三件套
summary: '每个类在 JVM 里有唯一 Class 对象;反射经 Field/Method/Constructor 在运行时读写字段、调用方法、创建实例;setAccessible 突破访问检查但有安全与性能代价,是框架的底层能力。'
category: java
node: java-reflection-class
order: 49
level: 深入
tags: [反射, Class, Field, Method, Constructor]
updated: 2026-11-18
mindmap: java-reflection-class.mindmap.json
terms: ["jvm", "runtime", "compile-time", "bytecode"]
sources:
  - title: Oracle Java 教程 · The Reflection API
    url: https://docs.oracle.com/javase/tutorial/reflect/
    note: Class 获取与 Field/Method/Constructor 用法的依据。
  - title: java.lang.Class javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Class.html
    note: Class 对象唯一性与反射入口的官方描述。
---

Spring 能把你写的类自动装配成 Bean,MyBatis 能把结果集填进你的对象——它们都不在编译期认识你的类,靠的是**反射**:在运行时检查并操作类、字段、方法。这一篇讲反射的入口与三件套。

## Class 对象:反射的入口

每个被加载的类在 JVM 里对应**唯一一个** Class 对象,描述该类的结构(字段、方法、构造器、注解)。三种获取方式:

```java
Class<?> c1 = String.class;          // 类字面量,编译期已知
Class<?> c2 = "hi".getClass();       // 实例 getClass
Class<?> c3 = Class.forName("java.lang.String");   // 全限定名,运行时加载
```

`Class.forName` 会触发类加载与初始化(第 11 章),常用于按配置名加载驱动/实现类。同一类的三种方式得到同一个 Class 对象。

## 三件套:Field / Method / Constructor

从 Class 取出成员描述对象,再读写/调用:

```java
Class<?> c = User.class;

// 字段
Field f = c.getDeclaredField("name");
f.setAccessible(true);          // 突破 private 访问检查
User u = new User();
f.set(u, "alice");              // 写
String name = (String) f.get(u); // 读

// 方法
Method m = c.getDeclaredMethod("setName", String.class);
m.setAccessible(true);
m.invoke(u, "bob");             // 调用

// 构造器
Constructor<?> ctor = c.getDeclaredConstructor(String.class);
User u2 = (User) ctor.newInstance("carol");
```

getDeclaredXxx 取本类声明的全部成员(含 private);getXxx 取 public(含继承)。setAccessible(true) 关闭访问检查,是反射能操作 private 成员的关键。

## 反射能做什么

- 运行时按名字加载类、创建实例(配置驱动、插件化);
- 读写字段、调用方法,包括 private(框架注入、ORM 映射);
- 读取注解(下一篇),驱动声明式行为;
- 动态代理(第 2 篇)、序列化、依赖注入容器都建立在反射之上。

## 代价与边界

- **性能**:反射调用比直接调用慢(无法内联、需访问检查与装箱);热点路径避免,框架多在启动期反射一次后缓存 Method/Field;
- **安全**:setAccessible 突破封装,受 SecurityManager / 模块系统(JPMS)限制;强封装下对未开放包反射会抛 InaccessibleObjectException;
- **编译期检查丢失**:名字写错、签名不匹配到运行时才报 NoSuchFieldException / NoSuchMethodException;
- **可读性**:反射代码绕过了正常类型系统,滥用会让调用关系难以追踪。

业务代码优先用正常调用与多态;反射留给框架与确实需要运行时动态性的场景。

## 小结

- 每类唯一 Class 对象;类字面量 / getClass / forName 三种获取;
- Field/Method/Constructor 三件套读写字段、调用方法、创建实例;
- getDeclaredXxx 含 private,setAccessible 突破访问检查;
- 反射是框架底层能力,但有性能、安全、编译期检查丢失的代价;
- 业务优先正常调用,反射用于运行时动态性。

下一篇讲动态代理:在不改目标类的前提下织入横切逻辑。