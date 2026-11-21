---
title: 模块
summary: 'Java 9 的模块是自带依赖声明的类容器：module-info.java 写 requires 和 exports。它让 JDK 拆成了几十个模块，jlink 能按需裁出小 JRE。业务项目大多仍跑在 classpath 上，模块认识即可。'
category: java
node: java-oop-module
order: 22
level: 进阶
tags: [模块, module-info, jlink, JPMS]
updated: 2026-11-18
mindmap: java-oop-module.mindmap.json
terms: ["classpath", "jdk"]
sources:
  - title: 廖雪峰 Java 教程 · 模块
    url: https://liaoxuefeng.com/books/java/oop/basic/module/index.html
    note: module-info、jmod 与 jlink 裁剪 JRE 的完整流程参照。
  - title: java · The Java Development Kit tool reference
    url: https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html
    note: --module-path 与 --module 参数说明。
---

jar 解决了「类怎么打包」，但没解决「依赖怎么声明」。a.jar 必须配 b.jar 才能跑，这件事 jar 自己不知道，全靠人在命令行把 classpath 写全，漏一个就 ClassNotFoundException。Java 9 引入模块(Module)，就是给类容器加上依赖说明书。

## 从 rt.jar 说起

Java 9 之前，标准库是一个 60 多 MB 的 rt.jar，不管你用不用，整个跟着 JVM。Java 9 把它拆成了几十个模块，放在 $JAVA_HOME/jmods 目录下：java.base.jmod、java.xml.jmod、java.desktop.jmod……

其中 java.base 是根模块，String、System 这些最基础的类都在里面，所有模块都直接或间接依赖它，只有它不依赖任何模块——地位类似继承树里的 Object。

模块和 jar 的区别：jar 只是打包；模块除了打包，还写明「我依赖谁」「我把哪些包开放给别人」。这份说明编译后是模块里的 module-info.class。

## module-info.java

写一个模块，只需在源码根目录加一个 module-info.java:

```java
module hello.world {
    requires java.xml;
    exports com.flowdash.sample;
}
```

- `module hello.world`:模块名，命名规范同包名；
- `requires java.xml`:声明依赖。不声明就用不了那个模块的类，编译直接报错；java.base 自动引入，不用写；
- `exports com.flowdash.sample`:把指定包开放给别的模块。不 export 的包，外面连 public 类都访问不到。

最后一条是模块最硬的地方：**public 不再等于全世界可见**。跨模块访问，必须对方明确 exports 了那个包。上一篇说的「包级私有组织内部代码」，模块又加了一道更外的墙。

## 编译、打包、运行

目录结构比普通项目只多一个 module-info.java:

```
hello-world
└── src
    ├── module-info.java
    └── com/flowdash/sample/Main.java
```

编译时把它一起编：

```bash
javac -d bin src/module-info.java src/com/flowdash/sample/*.java
```

打成 jar(带主类):

```bash
jar --create --file hello.jar --main-class com.flowdash.sample.Main -C bin .
```

运行时不再用 -cp，改用模块路径 + 模块名：

```bash
java --module-path hello.jar --module hello.world
```

--module-path 列模块 jar,--module 指定跑哪个模块的主类。这个 hello.jar 既是普通 jar(java -jar 也能跑)，也是模块 jar，取决于你怎么启动它。

## jmod 与 jlink:裁一个自己的 JRE

JDK 还有个 jmod 命令，能把 jar 转成 .jmod 文件：

```bash
jmod create --class-path hello.jar hello.jmod
```

注意：**.jmod 不能放进 --module-path 运行**，会报 JMOD format not supported at execution time。jmod 格式是给打包工具用的中间产物，运行还是用 jar。

那它有什么用？配合 jlink 裁剪运行时：

```bash
jlink --module-path hello.jmod --add-modules java.base,java.xml,hello.world --output jre/
```

jlink 把程序用到的模块(连同它们依赖的模块)复制成一份精简 JRE，输出到 jre 目录。之后直接：

```bash
jre/bin/java --module hello.world
```

分发程序时把这个 jre 目录一起发过去，对方不用装 JDK，拿到的运行时只有用到的那几十个模块，而不是完整的几百 MB。第 1 章提过「JDK 11 起没有独立 JRE，用 jlink 裁」，机制就是这套。

## 业务项目要不要用模块

说实话：大多数业务项目今天仍跑在 classpath 上，Maven 依赖管理得挺好，模块化改造收益有限。模块真正的主场是：

- JDK 自身和基础库的组织；
- 需要 jlink 定制运行时分发的场景(客户端、容器镜像瘦身);
- 强隔离需求的平台型代码(明确 exports，未导出的包外部无法访问)。

学习阶段的目标是：见到 module-info.java 知道是什么，见到 --module-path 知道怎么跑，知道 jlink 能裁 JRE。不必把自己的练习项目模块化。

## 小结

- 模块 = 类容器 + 依赖声明，解决 jar 不管依赖的问题；Java 9 起标准库拆成几十个模块；
- module-info.java 写 requires(依赖)与 exports(开放包);java.base 自动引入；
- 跨模块访问必须对方 exports,public 不再全球可见；
- 运行用 --module-path + --module;.jmod 不能运行，是给 jlink 用的；
- jlink 按需裁出精简 JRE，分发时对方不用装 JDK。