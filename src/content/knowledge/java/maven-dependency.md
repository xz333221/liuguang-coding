---
title: 依赖坐标、scope 与冲突仲裁
summary: 'Maven 用 scope 控制依赖在编译、测试、运行与打包时的可见性,传递依赖按 scope 收敛;同一构件多版本并存时先按最短路径、再按声明顺序仲裁;exclusions、dependencyManagement、BOM 与 optional 用于排除与统一版本。'
category: java
node: java-build-dependency
order: 66
level: 进阶
tags: [Maven, scope, 传递依赖, 冲突仲裁, dependencyManagement]
updated: 2026-11-19
mindmap: maven-dependency.mindmap.json
terms: ["maven", "pom", "dependency-scope", "dependency-management"]
sources:
  - title: Maven 官方指南 · Introduction to the Dependency Mechanism
    url: https://maven.apache.org/guides/introduction/introduction-to-the-dependency-mechanism.html
    note: 六种 scope 的可见性、传递依赖规则与冲突仲裁依据。
  - title: Maven 官方 · POM Reference
    url: https://maven.apache.org/pom.html
    note: exclusions、dependencyManagement、optional 的元素定义。
  - title: Maven 官方 · Dependency Plugin
    url: https://maven.apache.org/plugins/maven-dependency-plugin/
    note: dependency:tree 的用法与参数。
---

上一篇的 POM 已经出现 dependencies,但只写了坐标。同一个 jar 在不同场景下的可见范围、从直接依赖带进来的间接依赖、以及多个版本并存时选哪一个,都由依赖机制决定。这一篇逐项说明。

## scope:依赖的可见范围

scope(依赖作用域,dependency-scope)声明一个依赖在哪些 classpath 中可见,以及是否进入最终产物。Maven 共有六种:

- compile:默认值。编译、测试、运行都可见,并打进产物;
- provided:编译与测试可见,运行期由容器或 JDK 提供,不打进产物,Servlet API 是典型;
- runtime:编译不可见,测试与运行可见,打进产物,JDBC 驱动是典型,代码只依赖 java.sql 接口;
- test:仅测试可见,不进入产物,JUnit 与 Mockito 属于这一类;
- system:与 provided 类似,但用本地文件路径声明,已标记废弃,不推荐使用;
- import:只允许出现在 dependencyManagement 中,用于导入 BOM,不引入真实 jar。

四种主要 scope 的可见性如下:

| scope | 编译 | 测试 | 运行 | 打包 |
| --- | --- | --- | --- | --- |
| compile | 是 | 是 | 是 | 是 |
| provided | 是 | 是 | 否 | 否 |
| runtime | 否 | 是 | 是 | 是 |
| test | 否 | 是 | 否 | 否 |

```xml
<dependency>
    <groupId>jakarta.servlet</groupId>
    <artifactId>jakarta.servlet-api</artifactId>
    <version>6.0.0</version>
    <scope>provided</scope>
</dependency>
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.4.0</version>
    <scope>runtime</scope>
</dependency>
```

provided 依赖在运行期必须由外部提供,直接用 java -jar 启动会报 NoClassDefFoundError;test 依赖不会进入产物,打包后运行报缺少类,通常是把测试库误声明成了这个 scope。

## 传递依赖与作用域收敛

A 依赖 B,B 依赖 C,C 就是 A 的传递依赖。Maven 自动把 C 加入 A 的 classpath,同时按 scope 收敛,避免测试库泄漏到运行期:

- 直接依赖 compile:传递的 compile 记为 compile,传递的 runtime 记为 runtime;
- 直接依赖 provided:传递的 compile 与 runtime 都记为 provided;
- 直接依赖 runtime:传递的 compile 与 runtime 都记为 runtime;
- 直接依赖 test:传递的 compile 与 runtime 都记为 test;
- 传递依赖自身的 provided 与 test 不会继续向下传递,直接省略。

因此声明一个 provided 依赖时,不能假设它的下游依赖在运行期可用。需要哪些类,就在 pom 中显式声明。

## 冲突仲裁:两条规则

同一构件在依赖树中出现多个版本时,Maven 只保留一个,规则有两条,依次生效:

1. 最短路径优先:离当前项目层级最少的版本胜出;
2. 路径长度相同,先声明者优先:写在前面 dependency 胜出。

例如 A 依赖 B,B 依赖 common 1.0,路径长度为 2;A 又依赖 D,D 依赖 E,E 依赖 common 2.0,路径长度为 3。仲裁结果是 common 1.0。若两个版本路径长度相同,则以 pom 中声明顺序靠前的为准。

声明顺序会影响结果,这是排查版本问题时的关键。调整 dependency 顺序可能改变仲裁,但只在路径等长时有效;层级不同时,再调整顺序也没有作用。

## 用 dependency:tree 定位冲突

```bash
mvn dependency:tree
# [INFO] com.example:demo:jar:1.0.0
# [INFO] +- com.example:lib-a:jar:1.0.0:compile
# [INFO] |  \- com.example:common:jar:1.0.0:compile
# [INFO] \- com.example:lib-b:jar:1.0.0:compile
# [INFO]    \- com.example:common:jar:2.0.0:compile
```

这棵树里 common 1.0 位于第二层,common 2.0 位于第三层,Maven 保留 1.0。加上 -Dverbose 会显示被省略的版本及省略原因,用 -Dincludes=com.example:common 可以只看指定构件。定位到冲突后,再决定是排除旧版本还是在 dependencyManagement 中统一版本。

## exclusions:排除传递依赖

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>lib-a</artifactId>
    <version>1.0.0</version>
    <exclusions>
        <exclusion>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
```

exclusion 只需 groupId 与 artifactId,不写 version,含义是把该构件及其子树从这条依赖中剪掉。常见用途是排除旧日志实现、重复的 JSON 库。排除之后如果代码仍需要相关类,必须自己声明替代依赖,否则运行期会出现缺类错误。

## dependencyManagement、BOM 与 optional

dependencyManagement(依赖管理)集中声明版本,子模块或当前 POM 的 dependency 省略 version,版本由这里决定:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>common</artifactId>
            <version>2.0.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.3.5</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

BOM(Bill of Materials,物料清单)是一份只含 dependencyManagement 的 POM,用 scope=import 导入后,该套件内所有构件的版本都由 BOM 决定。spring-boot-dependencies 是常见例子,导入后声明 Spring 相关依赖不必逐个写版本。

dependencyManagement 中的版本还优先于传递依赖的仲裁结果:只要管理了某个构件,依赖树中的其他版本都会被替换。统一版本时,这一条比调整声明顺序更可靠。

optional 取值为 true 时,该依赖只对当前项目生效,不向下游传递。使用方确实需要时必须自己声明,适合只在部分功能中使用的驱动或适配库。

## 小结

- compile、provided、runtime、test 决定依赖在四个阶段的可见性,import 只用于导入 BOM;
- 传递依赖按 scope 收敛,provided 与 test 不再向下传递;
- 冲突仲裁先最短路径,路径相同再按声明顺序;
- exclusions 剪掉指定传递依赖,dependencyManagement 与 BOM 统一版本,optional 阻断传递;
- 用 mvn dependency:tree 查看实际生效版本,加 -Dverbose 查看被省略项。
