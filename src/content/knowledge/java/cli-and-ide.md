---
title: 命令行与 IDE 编译运行
summary: '把「编译」和「运行」拆成两步亲手做一遍:javac 产出字节码,java 按类名加载执行。IDE 只是把这两步自动化了,先在命令行跑通,才不会被按钮牵着走。'
category: java
node: java-intro-cli-ide
order: 3
level: 入门
tags: [javac, classpath, jar, jshell, IDE]
updated: 2026-11-14
terms: ["classpath", "bytecode", "compile-time", "jdk"]
sources:
  - title: javac · The Java Development Kit tool reference
    url: https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html
    note: -d、-cp、--release、-encoding 等编译旗标的官方定义。
  - title: java · The Java Development Kit tool reference
    url: https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html
    note: -cp 与 -jar 的行为、类名解析规则的官方定义。
  - title: 'JEP 330: Launch Single-File Source-Code Programs'
    url: https://openjdk.org/jeps/330
    note: JDK 11 起 java 直接跑单文件源码的出处。
  - title: 'JEP 458: Launch Multi-File Source-Code Programs'
    url: https://openjdk.org/jeps/458
    note: JDK 22 起 java 直接跑多文件源码的出处。
  - title: Introduction to JShell
    url: https://docs.oracle.com/en/java/javase/25/jshell/introduction-jshell.html
    note: jshell 交互式 REPL 的官方入门。
  - title: dev.java · Launching Simple Source-Code Programs
    url: https://dev.java/learn/first-steps/first-java-code/launch-simple-source-code-programs/
    note: 源码直接运行模式的限制与适用场景。
  - title: Install IntelliJ IDEA · JetBrains Help
    url: https://www.jetbrains.com/help/idea/installation-guide.html
    note: 2025.3 起 IDEA 合并为统一发行版、核心功能免费的官方说明。
  - title: Extension Pack for Java · VS Code Marketplace
    url: https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack
    note: VS Code 写 Java 的官方扩展包。
---

结论先说:**命令行把「编译」和「运行」拆成两步,IDE 只是把这两步自动化了。** 先在命令行把这两步走通,你才会知道 IDE 的绿三角背后发生了什么,报错时也才知道该查哪一步。

## 编译和运行是两步

接着上一篇的 `Hello.java`,这次不用源码直跑,而是规规矩矩走两步:

```bash
javac -d out Hello.java   # 第一步:编译,产出 out/Hello.class
java -cp out Hello        # 第二步:运行,告诉 JVM 去 out 里找类
```

两个旗标各管一件事:

- `-d out`:编译产物放到 `out` 目录,不跟源码混在一起;
- `-cp out`:运行时去 `out` 里找 `.class`。`-cp` 就是 classpath,一张「去哪儿找类」的清单。

带上包名之后,目录结构会替你说话。假设源码是 `src/demo/Hello.java`,开头写着 `package demo;`:

```bash
javac -d out src/demo/Hello.java   # 产出 out/demo/Hello.class
java -cp out demo.Hello            # 包名 + 类名,一个都不能少
```

**包名就是目录名**,这不是约定而是规则:`demo.Hello` 这个类,JVM 一定去 classpath 下的 `demo/Hello.class` 找。理解了这条,后面看到 `ClassNotFoundException` 就知道先查目录结构。

## java 后面跟的是类名,不是文件名

这是新手最常撞的一个错:

```text
错误: 找不到或无法加载主类 Hello.java
```

出现这个错,多半是你把文件路径当成了类名。记住:**`java` 后面跟的是类的全限定名**(`demo.Hello`),不是 `demo/Hello.class`,更不是 `Hello.java`。唯一的例外是上一篇的源码直跑模式 —— 那要求 `.java` 文件真的在当前目录里,否则 `java` 会把 `Hello.java` 当成类名去找,找不到就报上面这个错。

对照一下:

| 你敲的 | 实际含义 | 结果 |
| --- | --- | --- |
| `java Hello` | 找名为 `Hello` 的类 | classpath 里有就能跑 |
| `java demo.Hello` | 找 `demo` 包下的 `Hello` 类 | 正确姿势 |
| `java Hello.java` | 当前目录有该源码则直跑,否则当成类名 | 文件不在就报错 |
| `java out/demo/Hello.class` | 找一个叫 `out/demo/Hello.class` 的类 | 必然报错 |

## 练习可以跳过编译:java Hello.java

JDK 11 起(JEP 330),`java Hello.java` 会在内存里编译并执行,**不落 `.class`**;JDK 22 起(JEP 458)连多文件源码也能这样跑,入口文件里引用到的其他 `.java` 会一并编译。

这条捷径适合练习与写小脚本,不适合交付:

- 每次运行都重新编译,文件多了会慢;
- 要用外部 jar,还是得显式给 `-cp`;
- 产物不落盘,没法交给别人运行。

所以本站的建议是:**练习用直跑,理解用两步,交付打 jar。**

## 打包与运行 jar

把 `out` 里的产物打成一个可执行 jar:

```bash
jar --create --file app.jar --main-class demo.Hello -C out .
java -jar app.jar
```

`--main-class` 写进 jar 的清单文件(manifest),`java -jar` 时 JVM 读它决定从哪个类开始。这里有一个真坑:**用了 `-jar`,命令行的 `-cp` 就被忽略**,classpath 改由 manifest 里的 `Class-Path` 决定。所以「`java -cp lib/* -jar app.jar` 为什么找不到依赖」的答案是:依赖要写进 manifest,或者干脆不用 `-jar`,改回 `java -cp "app.jar;lib/*" demo.Hello`(Windows 分隔符是 `;`,Linux 与 macOS 是 `:`)。

## jshell:把 API 当草稿纸

JDK 自带一个交互式 REPL,试 API 不用建文件:

```text
$ jshell
jshell> List.of(1, 2, 3).stream().map(x -> x * 2).toList()
$1 ==> [2, 4, 6]
jshell> /exit
```

学到新类时,先在 jshell 里敲两下看返回值,比读十遍文档记得牢。它也是后面第 7 章练 Stream 的顺手工具。

## 值得记住的几个旗标

| 旗标 | 属于 | 作用 |
| --- | --- | --- |
| `--release 21` | javac | 按 21 的语法与 API 编译,产物能在 21 的 JVM 上跑 |
| `-encoding UTF-8` | javac | 指定源码编码,Windows 上防中文乱码 |
| `-Xlint:all` | javac | 打开全部警告,学习期建议常开 |
| `-g` | javac | 保留调试信息,断点调试需要 |
| `-Xmx512m` | java | 限制堆内存上限,排查内存问题时常用 |
| `--enable-preview` | 两者 | 启用预览特性,**编译和运行都要加**,少一步就报错 |

`--release` 值得多说一句:它同时锁语法、类库与字节码版本,比老的 `-source` / `-target` 组合更可靠 —— 后者可能让你用上新 API 却编出旧 JVM 跑不了的产物。

## IDE 做了什么

三个主流选择:

- **IntelliJ IDEA**:2025.3 起社区版与旗舰版合并成一个统一发行版,Java / Kotlin 核心开发功能免费(含商用),Spring 深度支持、数据库工具等高级功能走 Ultimate 订阅,装完送 30 天试用。学 Java 装它就够;
- **VS Code + Extension Pack for Java**:轻量,适合已经住在 VS Code 里的人;
- **Eclipse**:老牌免费选项,公司里存量不少。

IDE 替你做的事,拆开就是这几件:**增量编译**(改一个文件只编它)、**索引**(全项目跳转与补全)、**调试**(断点单步)、**重构**(改名改签名不漏)。它没有发明新步骤,只是把 `javac` 与 `java` 包了起来。

对照表,左边的事右边都能做:

| 动作 | 命令行 | IDEA 里对应什么 |
| --- | --- | --- |
| 编译 | `javac -d out ...` | Build Project(增量自动) |
| 运行 | `java -cp out demo.Hello` | 点 main 旁的绿三角 |
| 指定 JDK | `JAVA_HOME` / PATH | Project Structure → SDK |
| 指定语言级别 | `--release 21` | Project Structure → Language Level |
| 加依赖 jar | `-cp` | 库配置 / Maven 依赖 |

**项目里的 SDK 与语言级别,要和你命令行用的一致。** 两边不一致,就会出现「IDE 能跑命令行跑不了」的怪事。

## 四个常见坑

1. **中文乱码。** Windows 默认编码是 GBK,源码存成 UTF-8 而编译没指定编码,中文就花了。统一 `-encoding UTF-8`,编辑器也设成 UTF-8。
2. **改了代码没重新编译。** 命令行模式下 `.class` 不会自己更新,跑的还是旧字节码;IDE 里则检查是否开了自动构建。
3. **IDE 能跑,命令行不能跑。** 九成是 classpath 不一致:IDE 偷偷帮你加了依赖或模块路径。回到第一步,把 `-cp` 写全。
4. **预览特性报错。** 编译加了 `--enable-preview`,运行忘了加(或反过来)。两步都要加,且 JDK 版本要一致。

## 一句话总结

**javac 管「翻译成字节码」,java 管「按类名加载执行」,classpath 是两者之间的桥。** 把这条桥亲手搭一遍,IDE 就从黑盒变成了快捷键。