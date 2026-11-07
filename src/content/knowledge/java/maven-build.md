---
title: Maven:一个 pom.xml 说清的三件事
summary: 'Maven 只做三件事:按约定找代码、按坐标取依赖、按生命周期跑插件。pom.xml 里的标签都挂在这三条上,记住这三条就不用背配置。'
category: java
order: 2
level: 入门
tags: [Maven, 构建, 依赖管理, 多模块, 面试高频]
updated: 2026-11-07
mindmap: maven-build.mindmap.json
demo: maven-build
terms: ["maven", "pom", "project-coordinates", "dependency-scope", "dependency-management", "build-lifecycle", "plugin", "local-repository", "aggregation"]
sources:
  - title: Maven 文档 · Introduction to the POM
    url: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html
    note: pom 的继承、聚合、属性与 dependencyManagement 的官方说明。
  - title: Maven 文档 · Standard Directory Layout
    url: https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html
    note: src/main/java、src/main/resources、src/test/java 这套约定以它为准。
  - title: Maven 文档 · Introduction to the Build Lifecycle
    url: https://maven.apache.org/guides/introduction/introduction-to-the-build-lifecycle.html
    note: 三套生命周期、阶段顺序,以及 jar 打包时各阶段默认绑定了哪个插件的哪个目标。
  - title: Maven 文档 · Introduction to the Dependency Mechanism
    url: https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html
    note: 依赖传递、作用域与冲突调解(最近优先)的规则。
  - title: Maven 文档 · Guide to Working with Multiple Modules
    url: https://maven.apache.org/guides/mini/guide-multiple-modules.html
    note: 多模块工程与 reactor 的构建顺序。
  - title: Maven · POM Reference
    url: https://maven.apache.org/pom.html
    note: 每个标签的准确定义,包括 scope 的取值与可选值。
---

先说结论:**Maven 不是"一个会写 XML 的编译器",它只负责三件事 —— 按约定找到代码、按坐标取回依赖、按生命周期把插件一个个跑起来。** `pom.xml` 里的标签,几乎都能归到这三条里的一条。

一个最小的工程长这样(配套示例在仓库的 `examples/maven-demo/`,是个两模块的工程):

```text
maven-demo/
├─ pom.xml                        父工程:管版本、管模块清单(packaging=pom)
├─ common/                        模块一:工具类
│  ├─ pom.xml                     继承父工程,只写自己的 artifactId 与依赖
│  └─ src/
│     ├─ main/
│     │  ├─ java/                 Java 源码 → 打进 jar
│     │  └─ resources/            配置与静态文件 → 原样打进 jar
│     └─ test/
│        └─ java/                 测试源码 → 只在 test 阶段用,不进产物
├─ app/                           模块二:入口,依赖 common
│  ├─ pom.xml
│  └─ src/...                     同上
└─ target/                        每个模块构建后的产物目录,必须在 .gitignore 里
```

这套 `src/main/java`、`src/main/resources`、`src/test/java` 不是 Spring Boot 定的,是 Maven 的**约定**。约定固定下来的好处是:不需要在 pom 里写"源码在哪、测试在哪",任何 IDE 打开都能认识;代价是目录不能随便改,改了就得自己在 pom 里补配置。

## 三套坐标,是工程的身份证

```xml
<groupId>com.liuguang</groupId>
<artifactId>maven-demo</artifactId>
<version>1.0.0</version>
<packaging>pom</packaging>
```

- `groupId` 一般写成反向域名,表示"这一族工程属于谁";
- `artifactId` 是工程名;
- `version` 是版本号;
- `packaging` 决定产出什么:`jar`(默认)、`war`、`pom`(只做聚合/继承,不产出文件),以及 `maven-plugin` 等。

这三项合起来(写成 `com.liuguang:maven-demo:1.0.0`)就是**坐标**,本地仓库里的路径也是按它拼的:`~/.m2/repository/com/liuguang/maven-demo/1.0.0/`。所以 groupId 里不该有空格或中文,artifactId 大小写也要一致 —— 它们同时是目录名和索引键。

## 生命周期:阶段是顺序,插件才是干活的

Maven 定义了三套相互独立的生命周期:**clean**、**default**(也叫 build)、**site**。每套都由一串**阶段(phase)**组成,阶段有先后顺序。

default 这套里最常打交道的几个阶段,按顺序是:

```text
validate → compile → test → package → verify → install → deploy
```

关键规则只有一条:**执行某个阶段时,排在它前面的阶段会全部先跑一遍**。所以 `mvn package` 等于"校验 → 编译 → 跑测试 → 打包",而不会跑到 install。`mvn install` 则把前面所有阶段跑完,再把 jar 装进本地仓库。

真正写文件、跑测试的不是阶段本身,而是**插件**。阶段只是挂钩点,插件的**目标(goal)** 被绑到某个阶段上。以 `packaging=jar` 为例,默认绑定大致是:

| 阶段 | 默认绑定的插件目标 | 干了什么 |
| --- | --- | --- |
| `process-resources` | `resources:resources` | 把 `src/main/resources` 拷到 `target/classes` |
| `compile` | `compiler:compile` | 编译 `src/main/java` |
| `process-test-resources` | 同上(resources) | 拷测试资源 |
| `test-compile` | `compiler:testCompile` | 编译 `src/test/java` |
| `test` | `surefire:test` | 跑单元测试 |
| `package` | `jar:jar` | 打成 `target/*.jar` |
| `install` | `install:install` | 装进本地仓库 |
| `deploy` | `deploy:deploy` | 推到远程仓库 |

自己加的插件也是同一个机制:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-shade-plugin</artifactId>
  <version>3.5.2</version>
  <executions>
    <execution>
      <phase>package</phase>        <!-- 绑到 package 阶段 -->
      <goals>
        <goal>shade</goal>          <!-- 到这一步时执行 shade 目标 -->
      </goals>
    </execution>
  </executions>
</plugin>
```

**把 `phase` 写成 `compile` 还是 `package`,决定了这个插件在流水线的哪一步插手** —— 这是自定义打包、生成代码、拷贝脚本时最常改动的一行。

## 依赖:坐标 + 作用域

```xml
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>5.10.2</version>
  <scope>test</scope>
</dependency>
```

`scope` 决定这条依赖在哪些阶段可见、要不要跟着传递:

| scope | 编译 | 测试 | 运行 | 传递 |
| --- | --- | --- | --- | --- |
| `compile`(默认) | 是 | 是 | 是 | 是 |
| `provided` | 是 | 是 | 否(容器提供) | 否 |
| `runtime` | 否 | 是 | 是 | 是 |
| `test` | 否 | 是 | 否 | 否 |

选错的典型后果:`servlet-api` 用了 `compile`,打出来的 war 里就多一份,和容器自带的版本打架;JDBC 驱动用了 `compile`,代码里就能误 import 驱动类,而它本该只在运行时出现。

依赖还有传递性:`app` 依赖 `common`,而 `common` 依赖了 `guava`,那么 `app` 的 classpath 里也会有 `guava`。同一坐标出现多个版本时,Maven 用"**最近优先**"调解:路径最短的胜出;路径一样长,先声明的胜出。要断开某条传递链,用 `exclusions`:

```xml
<dependency>
  <groupId>com.liuguang</groupId>
  <artifactId>common</artifactId>
  <exclusions>
    <exclusion>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
    </exclusion>
  </exclusions>
</dependency>
```

排查用了哪个版本,别猜:跑 `mvn dependency:tree`。

## dependencyManagement 只定版本,不引依赖

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.10.2</version>
    </dependency>
  </dependencies>
</dependencyManagement>
```

它是一张**版本价目表**:子模块写同名依赖时可以省掉 `<version>`,版本从表里取。表本身**不会**把依赖加进 classpath —— 这点错得最多:只在 `dependencyManagement` 里写一条,然后奇怪"为什么代码里 import 不到"。

对应的 `pluginManagement` 管插件版本,规则一样。

## 多模块:聚合与继承是两件事

```text
maven-demo (packaging=pom)
   ├─ <modules> → common、app        聚合:一次构建带上它们
   └─ <parent>  ← 两个子模块继承它    继承:共用 properties / 版本管理
```

- **聚合(aggregation)** 用 `<modules>` 声明"这个工程包含哪些模块",在父工程目录跑 `mvn package`,Maven 会把它们按依赖关系排好顺序(reactor)依次构建;
- **继承(inheritance)** 用 `<parent>` 让子模块共享父工程的配置与版本。

两件事常常同时用,但可以分开:一个工程可以聚合而不被继承(只当构建入口),也可以继承而不聚合(只当版本规范的父 pom)。

构建多模块时还要知道:**兄弟模块之间靠 reactor,不靠本地仓库**。在父目录跑 `mvn package`,`app` 用到的是 reactor 里刚构建出来的 `common`,所以不必先 `install`;但换个工程去引用 `com.liuguang:common:1.0.0` 时,就必须先 `mvn install` 把它放进本地仓库。

## 仓库:下载从哪来,装到哪去

- **本地仓库**默认在 `~/.m2/repository`,第一次构建会把依赖下载到这里,之后离线也能构建;
- **远程仓库**默认是 Maven Central,公司通常再配一个 Nexus / Artifactory 做私服,写进 `settings.xml` 的 `<mirrors>`;
- 同一个坐标的 `SNAPSHOT` 版本会被反复覆盖更新,可以加 `-U` 强制刷新缓存:`mvn -U package`。

别把本地仓库当备份:它是纯缓存,删掉只影响下次构建要重新下载。

## 常用命令速查

| 命令 | 做什么 |
| --- | --- |
| `mvn -v` | 版本与 JDK |
| `mvn clean` | 删掉各模块的 `target/` |
| `mvn test` | 跑到 test 阶段为止 |
| `mvn package` | 编译 + 测试 + 打包 |
| `mvn install` | 再装进本地仓库 |
| `mvn -pl app -am package` | 只构建 `app` 和它依赖的模块 |
| `mvn -pl common test -Dtest=TextTest` | 只跑某个测试类 |
| `mvn dependency:tree` | 看依赖树,排查版本冲突 |
| `mvn -o package` | 离线模式,不联网 |
| `mvn -X package` | 调试日志,插件到底跑了什么 |
| `mvn help:effective-pom` | 看继承合并之后的最终 pom |

## 五个常见坑

1. **只有 `dependencyManagement`、没在 `dependencies` 里写**。价目表不是依赖,代码里 import 不到就是这个原因。
2. **`mvn package` 之后 `java -jar` 报 `NoClassDefFoundError`**。普通 jar 不带依赖,要靠 shade / assembly 打胖包,或者把依赖 jar 也放进 classpath。
3. **版本冲突时去改 `<version>`**。先看 `dependency:tree`,用 `exclusions` 切掉问题来源,比在顶层硬改版本稳。
4. **改了 pom 但 IDE 没反应**。pom 是工程模型,不是纯文本,改完要重新加载项目(IntelliJ 的 Maven 面板里刷新)。
5. **`SNAPSHOT` 依赖不更新**。快照默认有更新策略,但缓存没刷就会用旧的,联调时加 `-U`。

## 一句话总结

**约定决定代码去哪找,坐标决定依赖从哪来、装到哪去,生命周期决定插件按什么顺序跑。** 阶段是按顺序排的钩子,活都是插件干的;`dependencyManagement` 是价目表不是依赖;多模块里聚合和继承是两件事。把这几句记住,再看到陌生的 pom 标签,也能立刻归到它该在的位置。
