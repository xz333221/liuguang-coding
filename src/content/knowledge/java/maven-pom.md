---
title: Maven 与 pom.xml:坐标、依赖、生命周期
summary: 'Maven 用 pom.xml 描述项目:groupId、artifactId、version 三段坐标定位构件,固定目录承载源码与资源,默认生命周期从 validate 到 deploy 按序执行并绑定插件;mvn clean package 与 mvn install 是最常用的构建命令。'
category: java
node: java-build-maven
order: 65
level: 进阶
tags: [Maven, pom.xml, GAV, 生命周期, 本地仓库]
updated: 2026-11-19
mindmap: maven-pom.mindmap.json
terms: ["maven", "pom", "project-coordinates", "build-lifecycle"]
sources:
  - title: Maven 官方指南 · Introduction to the Lifecycle
    url: https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html
    note: 默认生命周期阶段、阶段与插件目标的绑定关系。
  - title: Maven 官方 · POM Reference
    url: https://maven.apache.org/pom.html
    note: modelVersion、parent、properties、dependencies、build 各元素定义。
  - title: Maven 官方 · Settings Reference
    url: https://maven.apache.org/settings.html
    note: settings.xml 中 mirrors 与本地仓库位置的配置。
---

前面几章讨论 JVM 如何加载 class、如何执行字节码,但没有说明 class 从哪来、依赖的第三方 jar 如何进入 classpath。真实项目里这两件事由构建工具完成,Java 生态最常用的是 Maven。这一篇从 pom.xml 的结构讲到默认生命周期。

## 项目对象模型与 GAV 坐标

Maven 用一份 XML 描述项目,这份文件叫 POM(Project Object Model,项目对象模型),固定命名为 pom.xml。仓库中的每个构件(artifact)用三个字段唯一定位,合称 project-coordinates(项目坐标):

- groupId:组织或域名的反写,如 com.example;
- artifactId:项目或模块名,如 demo;
- version:版本号,如 1.0.0,SNAPSHOT 后缀表示开发中的快照版本。

再加 packaging(产物类型,取值 jar、war、pom,默认 jar),就构成完整的构件标识。同一 groupId 与 artifactId 下可以并存多个 version,依赖声明通常要写全三段;版本由 dependencyManagement 统一管理时可以省略,下一篇展开。

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
</project>
```

packaging 决定 package 阶段产出什么:jar 打 jar,war 打 war,pom 只作为父 POM 或 BOM,不产出代码。父 POM 必须声明 packaging 为 pom,第 67 篇会用到这一点。

## 标准目录结构

Maven 遵循约定优于配置,目录位置固定,不需要在 POM 里声明源码放在哪:

- src/main/java:主代码;
- src/main/resources:主资源,打包时进入 classpath;
- src/test/java:测试代码;
- src/test/resources:测试资源;
- target:构建输出,编译后的 class、测试报告与最终 jar 都在这里,可以随时删除并重新生成。

项目根目录只有 pom.xml 是必需的,其余目录按需创建。IDE 导入 Maven 项目时读取的也是这套约定,换用 IDEA、Eclipse 或命令行,目录含义保持一致。

## POM 的主要元素

除 GAV 与 packaging 外,常用元素有五类:

- modelVersion:固定为 4.0.0,声明 POM 模型版本;
- parent:继承另一个 POM 的配置;
- properties:键值对,供 ${...} 占位符引用;
- dependencies:项目的直接依赖;
- build/plugins:构建插件及其配置。

```xml
<parent>
    <groupId>com.example</groupId>
    <artifactId>demo-parent</artifactId>
    <version>1.0.0</version>
</parent>

<properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>

<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.11.3</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.13.0</version>
        </plugin>
    </plugins>
</build>
```

properties 中的 maven.compiler.release 控制 javac 的 --release 参数,取值 21 表示按 Java 21 的 API 编译;project.build.sourceEncoding 固定为 UTF-8,避免平台默认编码造成乱码。插件不声明 version 时会使用超级 POM 中的默认版本,通常偏旧,显式声明版本是常见做法。

## 超级 POM 与默认生命周期

每个 POM 都隐式继承一份超级 POM(super POM),它定义了中央仓库地址、默认插件版本、标准目录等。所以一个只写 GAV 的 POM 也能直接构建,原因就在这里。

build-lifecycle(构建生命周期)是一组按固定顺序排列的阶段(phase)。默认生命周期包含:

- validate:校验 POM 合法性与项目结构;
- compile:编译 src/main/java;
- test:运行 src/test/java 中的单元测试;
- package:按 packaging 打包;
- verify:运行集成测试与质量检查;
- install:把构件安装到本地仓库;
- deploy:把构件发布到远程仓库。

clean 与 site 是另外两条生命周期,前者删除 target,后者生成项目站点文档。执行某个阶段时,Maven 先依次执行它前面的所有阶段,因此 mvn package 实际执行了 validate 到 package 的全部阶段。

阶段名称只是抽象步骤,绑定在上面的插件目标(plugin goal)才真正执行任务。compile 阶段默认绑定 maven-compiler-plugin:compile,test 绑定 maven-surefire-plugin:test,jar 项目的 package 绑定 maven-jar-plugin:jar。修改插件配置就能改变对应阶段的行为。

## 常用命令与本地仓库

```bash
mvn clean package              # 清理、编译、测试、打包
mvn clean package -DskipTests  # 同上,但跳过测试执行,测试代码仍会编译
mvn install                    # 打包并安装到本地仓库,供其他项目依赖
mvn -o package                 # 离线构建,只使用本地仓库已有构件
```

-DskipTests 跳过测试执行,但测试代码照样参与编译,测试写错仍会构建失败;-Dmaven.test.skip=true 连测试代码一起跳过编译,两者语义不同。

构建时下载的依赖存放在本地仓库,默认路径是用户目录下的 .m2/repository。多个项目共用这份缓存,相同构件不会重复下载。远程仓库地址与认证信息在 settings.xml 中配置,该文件默认位于 ~/.m2/settings.xml,也可以用 -s 参数指定其他位置。

```xml
<settings>
    <mirrors>
        <mirror>
            <id>aliyun</id>
            <mirrorOf>central</mirrorOf>
            <url>https://maven.aliyun.com/repository/public</url>
        </mirror>
    </mirrors>
</settings>
```

mirrors 把对中央仓库的请求重定向到镜像地址,国内构建常配这一项。镜像只改变下载来源,不改变构件坐标,项目仍按 GAV 从本地仓库取用。

## 小结

- POM 是项目描述文件,GAV 三段加 packaging 唯一标识一个构件;
- 源码、资源、测试与输出目录由约定决定,无需逐项配置;
- 默认生命周期从 validate 到 deploy 顺序执行,插件目标绑定在阶段上;
- mvn clean package 完成编译、测试与打包,mvn install 额外写入本地仓库;
- 依赖缓存在 ~/.m2/repository,镜像通过 settings.xml 配置。
