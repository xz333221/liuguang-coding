---
title: 类加载机制
summary: '加载→验证→准备→解析→初始化五阶段;准备赋零值、初始化执行 clinit;双亲委派保证核心类唯一与安全,可被 SPI/热部署打破;类初始化触发时机与被动引用不触发。'
category: java
node: java-jvm-classload
order: 62
level: 深入
tags: [类加载, 双亲委派, clinit, 初始化时机]
updated: 2026-11-18
mindmap: java-jvm-classload.mindmap.json
terms: ["bytecode", "runtime"]
sources:
  - title: JVM 规范 · 5. Loading, Linking, Initializing
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html
    note: 加载/链接/初始化阶段与触发时机的规范依据。
  - title: java.lang.ClassLoader javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html
    note: 双亲委派模型与自定义加载器的参照。
---

一个 .class 文件从磁盘到可用,要经过加载、链接、初始化。理解这套流程,才能解释"静态块何时执行""为什么两个同名类不冲突""SPI 为何打破双亲委派"。

## 五个阶段

1. **加载**:通过全限定名获取字节流,转成方法区运行时数据,堆中生成 Class 对象作为访问入口;
2. **验证**:字节码格式/语义/符号引用校验,防恶意或损坏 class;
3. **准备**:为**静态变量**分配内存并赋**零值**(int 0、引用 null);static final 常量(ConstantValue)在此直接赋真值;
4. **解析**:符号引用(字符串描述)转直接引用(内存地址/偏移);
5. **初始化**:执行 `<clinit>`(静态变量赋值语句 + 静态块,按源码顺序合并),JVM 保证线程安全(加锁),故静态块天然线程安全、单例可用静态内部类实现。

注意准备赋零值、初始化才赋真值:`static int a = 1;` 准备后 a=0,初始化后 a=1。

## 初始化触发时机(主动引用)

- new / 读写静态字段(非 final 常量)/ 调用静态方法;
- 反射 Class.forName;
- 初始化子类先初始化父类;
- 主类(含 main)启动时初始化;
- MethodHandle/动态语言支持解析到未初始化类。

**被动引用不触发**:通过子类引用父类静态字段(只初始化父类)、数组定义 `A[] arr = new A[10]`(不初始化 A)、引用 static final 编译期常量(常量池已传播)。

## 双亲委派

类加载器层次:Bootstrap(核心 rt.jar/java.base)→ Extension/Platform → Application(classpath)→ 自定义。加载请求**先委派父加载器**,父无法加载才自己加载。

收益:核心类(java.lang.Object)始终由 Bootstrap 加载,保证唯一与安全,防止用户自定义 Object 替换核心类。

**打破场景**:

- **SPI**(JDBC Driver):Bootstrap 加载的 DriverManager 需加载 classpath 的实现类,用**线程上下文类加载器**(默认 Application)反向委派;
- **热部署/模块化**(OSGi、Tomcat 多应用):每个应用独立加载器,同名类隔离,网状委派;
- 自定义 loadClass 重写(不推荐,应重写 findClass 保留委派)。

## 自定义加载器

继承 ClassLoader,重写 findClass(读字节流 defineClass),保留 loadClass 的委派逻辑。用途:加密 class 解密加载、隔离加载、从非文件源(网络/数据库)加载。

## 小结

- 加载→验证→准备(零值)→解析→初始化(clinit,线程安全);
- 主动引用触发初始化,被动引用(父类静态/数组/final 常量)不触发;
- 双亲委派保核心类唯一安全;SPI 用上下文加载器、热部署用隔离加载器打破;
- 自定义重写 findClass 而非 loadClass。

下一篇讲 GC:对象怎么判死、分代怎么回收、收集器怎么选。