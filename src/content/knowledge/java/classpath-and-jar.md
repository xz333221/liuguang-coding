---
title: classpath 和 jar
summary: 'classpath 是 JVM 找类的搜索清单，目录要按包名展开，jar 是打包好的类容器。java -jar 会忽略 -cp，依赖要么写进 manifest 的 Class-Path，要么老老实实用 -cp 指定主类。'
category: java
node: java-oop-classpath-jar
order: 21
level: 进阶
tags: [classpath, jar, manifest, ClassNotFoundException]
updated: 2026-11-18
mindmap: java-oop-classpath-jar.mindmap.json
terms: ["classpath", "bytecode"]
sources:
  - title: 廖雪峰 Java 教程 · classpath和jar
    url: https://liaoxuefeng.com/books/java/oop/basic/classpath-jar/index.html
    note: classpath 搜索规则与 jar 打包的讲解参照。
  - title: java · The Java Development Kit tool reference
    url: https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html
    note: -cp、-jar 与类路径解析的官方说明。
  - title: jar · The Java Development Kit tool reference
    url: https://docs.oracle.com/en/java/javase/25/docs/specs/man/jar.html
    note: jar 命令与 manifest 参数对照。
---

第 1 章跑程序用过 `java -cp out Hello`，那时类少，一句话带过。现在类多了、包深了、还要引第三方库，classpath 的规则值得完整讲一遍。jar 也在这篇一起说清。

## classpath:JVM 找类的清单

JVM 拿到一个全限定名，比如 com.flowdash.Main，就去 classpath 列出的位置里找 com/flowdash/Main.class。classpath 就是这张搜索清单：

```bash
java -cp out com.flowdash.Main
```

规则逐条看：

- classpath 的每一项是一个**目录**或一个 **jar 文件**;
- 目录项要从包的根算起。类在 out/com/flowdash/Main.class,classpath 写 out，不是 out/com/flowdash;
- 多项之间用分隔符：Windows 是 `;`,Linux 和 macOS 是 `:`;
- 不指定 -cp 时，默认是当前目录 `.`。

```bash
# Windows
java -cp out;lib/a.jar;lib/b.jar com.flowdash.Main

# Linux / macOS
java -cp out:lib/a.jar:lib/b.jar com.flowdash.Main
```

jar 项直接定位到 jar 内部的类，不用解压。lib 目录下 jar 很多时，可以写通配 `lib/*`(注意是 `*` 不是 `*.jar`，后者不生效)，展开为该目录下所有 jar。

标准库不用写进 classpath。JDK 自带的类(java.lang、java.util 那些)JVM 自己知道去哪找，手动把 rt.jar 之类的加进去反而干扰运行。

## 找不到类：两种报错

清单没写对，运行时就报找不到类，常见两个：

- `ClassNotFoundException`:加载时主动找某个类没找到，常出现在 Class.forName、引了编译期有运行期没有的依赖；
- `NoClassDefFoundError`:编译时这个类还在，运行时没了(或者它的静态初始化炸了)。

排查思路都一样：确认那个类到底在哪个目录 / jar 里，再看 classpath 有没有包含它。IDE 里跑没事、命令行跑报错，九成是两边 classpath 不一致。

## jar:类的压缩包

一个项目几百个 .class 散着放不好分发。jar 就是把它们按包目录结构打成一个 zip 包，外加一份元信息：

```bash
jar --create --file app.jar -C out .
```

`-C out .` 表示切到 out 目录、把里面所有内容打进去。解开 jar 看，结构是：

```
app.jar
├── META-INF
│   └── MANIFEST.MF
└── com
    └── flowdash
        └── Main.class
```

MANIFEST.MF 是清单文件，可以写各种属性。最重要的一条是 Main-Class:

```
Main-Class: com.flowdash.Main
```

有了它，jar 就能直接运行：

```bash
java -jar app.jar
```

JVM 读 manifest 找到主类，不用你再写类名。打包时一步到位：

```bash
jar --create --file app.jar --main-class com.flowdash.Main -C out .
```

## -jar 会忽略 -cp

这是个关键的陷阱：

```bash
java -cp lib/a.jar -jar app.jar   // lib/a.jar 不生效!
```

**用了 -jar,classpath 就只认 app.jar 自己，-cp 和 CLASSPATH 环境变量全部被忽略。** app 依赖的第三方类一个都找不到，运行就抛 ClassNotFoundException。

三种解法：

1. 不用 -jar，改回 -cp，把 app.jar 和依赖一起列上，主类写全名：

```bash
java -cp app.jar;lib/a.jar;lib/b.jar com.flowdash.Main
```

2. 把依赖写进 app.jar 的 manifest:

```
Main-Class: com.flowdash.Main
Class-Path: lib/a.jar lib/b.jar
```

Class-Path 里的路径相对 jar 所在目录，空格分隔。这样 -jar 也能带上依赖。

3. 用构建工具打「胖 jar」(fat jar)，把依赖的类全合并进一个 jar。Maven 的 shade 插件、Spring Boot 的打包干的就是这事，第 12 章讲。

日常开发用 IDE 或 Maven,classpath 它们替你管；但命令行部署、排查「IDE 能跑服务器跑不了」的问题时，上面这些规则就是排查地图。

## 小结

- classpath 是目录与 jar 的搜索清单，目录从包根算起，分隔符 Windows 用 ; 其他用 :;
- 默认 classpath 是当前目录；标准库不用写进去；
- jar 是按包结构打包的类容器，manifest 的 Main-Class 让 java -jar 找到主类；
- -jar 忽略 -cp:依赖走 manifest 的 Class-Path、改用 -cp 列全、或打胖 jar;
- ClassNotFoundException / NoClassDefFoundError 先查类在哪，再查清单有没有包含。