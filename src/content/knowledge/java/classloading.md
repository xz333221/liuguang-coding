---
title: 类加载机制
summary: '类从字节码到可用要经历加载、验证、准备、解析、初始化五个阶段,加载由 Bootstrap、Platform、Application 三层类加载器按双亲委派完成;Tomcat 与 JDBC SPI 是打破双亲委派的真实场景,Class.forName 默认初始化而 ClassLoader.loadClass 默认只加载。'
category: java
node: java-jvm-classload
order: 62
level: 深入
tags: [类加载, 双亲委派, ClassLoader, 初始化]
updated: 2026-11-19
mindmap: classloading.mindmap.json
terms: ["jvm", "bytecode", "runtime", "classpath"]
sources:
  - title: The Java Virtual Machine Specification, Java SE 21 · Chapter 5
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/index.html
    note: 加载、链接、初始化的阶段划分与主动引用规则。
  - title: java.lang.ClassLoader javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html
    note: loadClass 的委派流程与 findClass 的扩展点。
---

上一篇划分了堆与元空间;类信息进入元空间之前,要先由类加载子系统把字节码读入,并完成验证、准备、解析与初始化。这一篇说明这条链路,以及类加载器如何组织。

## 五个阶段

- **加载**:按全限定名获取类的二进制字节流,转成方法区的运行时数据结构,并在堆中生成 java.lang.Class 对象,作为访问类元数据的入口;
- **验证**:检查字节码格式、元数据、指令与符号引用,保证不会危害虚拟机;
- **准备**:为静态变量分配内存并设零值(如 static int 先为 0);static final 常量若在编译期确定,直接赋为常量值;
- **解析**:把常量池中的符号引用替换为直接引用,部分场景可推迟到初始化之后;
- **初始化**:执行 `<clinit>()` 方法,即静态变量赋值与静态代码块,按源码顺序执行。

准备阶段赋零值、初始化阶段赋真实值。「static 变量在类初始化前读到默认值」正源于这个顺序:

```java
class Config {
    static int timeout = 30;
    static {
        System.out.println("clinit: " + timeout);   // clinit: 30
    }
}

public class Main {
    public static void main(String[] args) {
        System.out.println(Config.timeout);          // 先打印 clinit: 30,再打印 30
    }
}
```

## 类加载器的层次

- **Bootstrap ClassLoader**:启动类加载器,由 C++ 实现,加载 JAVA_HOME/lib 下的核心类(如 java.lang.*),在 Java 中取不到它的引用(getClassLoader() 返回 null);
- **Platform ClassLoader**:JDK 9 起取代扩展类加载器,加载 JDK 自带的部分平台模块;
- **Application ClassLoader**:应用类加载器,加载 classpath 与模块路径上的应用类。

自定义加载器继承 ClassLoader,通常只重写 findClass,按自己的来源读取字节码。

## 双亲委派

ClassLoader.loadClass 的默认流程:

1. 先查自己是否已加载该类;
2. 把请求交给父加载器;
3. 父加载器无法完成时,才调用自己的 findClass。

即收到加载请求先向上委派到 Bootstrap,顶层加载不了再逐层向下尝试。

这个模型解决三个问题:

- **唯一性**:同一个类被不同加载器加载会得到不同的 Class 对象,instanceof 与强制类型转换都会失败;
- **安全**:java.lang.String 这类核心类始终由 Bootstrap 加载,自定义的同名类无法替换;
- **避免重复**:父加载器加载过的类,子加载器直接复用。

## 打破双亲委派的场景

双亲委派是推荐模型,规范并未强制要求。真实系统中有两类常见例外。

**Tomcat 的 WebappClassLoader。** 一个 Tomcat 可部署多个 Web 应用,每个应用需要加载自己 WEB-INF/classes 与 WEB-INF/lib 下同名不同版本的类(如不同版本的 Spring)。WebappClassLoader 重写 loadClass:先自己加载 Web 应用内的类,加载不到再交给父加载器;但 JDK 核心类仍先委派,避免覆盖 java.*。

**JDBC SPI。** DriverManager 位于 java.base 模块,由 Bootstrap 加载,却要加载各数据库厂商在 classpath 上提供的 Driver 实现。父加载器看不到子加载器路径上的类,于是通过线程上下文类加载器(Thread.currentThread().getContextClassLoader())反向委派,由应用类加载器完成加载。

## Class.forName 与 loadClass

```java
// forName:加载并初始化,执行静态代码块
Class.forName("com.example.Driver");

// loadClass:只加载,不初始化
ClassLoader.getSystemClassLoader().loadClass("com.example.Driver");

// forName 的第三个参数控制是否初始化
Class.forName("com.example.Driver", false, ClassLoader.getSystemClassLoader());
```

JDBC 驱动注册依赖 forName 触发静态代码块里的 DriverManager.registerDriver。需要明确控制初始化时机时,用带 initialize 参数的版本。

## 主动引用与被动引用

JVM 规定六种主动引用会触发初始化:

1. new、读取或设置静态字段(getstatic/putstatic)、调用静态方法(invokestatic);
2. 使用 java.lang.reflect 包的方法对类进行反射调用;
3. 初始化子类时,先初始化父类;
4. 虚拟机启动时指定的主类(含 main 方法的类);
5. 使用 MethodHandle 解析到上述静态成员;
6. 接口定义了 default 方法时,实现类初始化会先初始化该接口。

被动引用不触发初始化,常见三种:

```java
class Parent {
    static { System.out.println("Parent"); }
    static final int CONST = 2;
    static int value = 1;
}

class Child extends Parent {
    static { System.out.println("Child"); }
}

System.out.println(Child.value);    // 只输出 Parent:静态字段定义在父类
Parent[] arr = new Parent[10];      // 不输出:数组类由虚拟机自动生成
System.out.println(Parent.CONST);   // 不输出:编译期常量已写入调用方常量池
```

## 类的卸载

类要同时满足三个条件才能卸载:

1. 该类的所有实例已被回收;
2. 加载该类的 ClassLoader 已被回收;
3. 对应的 Class 对象没有在任何地方被引用。

Bootstrap 加载的核心类基本不会被卸载。自定义类加载器可以配合「加载、使用、丢弃加载器」实现类卸载,这是热部署与插件化的基础。

## 小结

- 类加载分加载、验证、准备、解析、初始化五阶段,准备赋零值,初始化执行 `<clinit>`;
- 类加载器分 Bootstrap、Platform、Application 三层,默认按双亲委派自下而上请求、自上而下尝试;
- 双亲委派保证类的唯一性与核心类安全;Tomcat 的 WebappClassLoader 与 JDBC SPI 的线程上下文加载器是打破它的真实场景;
- Class.forName 默认初始化,ClassLoader.loadClass 默认只加载;
- 主动引用六种触发初始化,子类引用父类静态字段、数组定义、编译期常量属于被动引用;
- 类卸载要求实例、ClassLoader、Class 对象都不可达。
