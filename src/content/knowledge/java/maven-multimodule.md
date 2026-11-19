---
title: 多模块与生命周期
summary: '多模块项目里聚合与继承是两件独立的事:聚合通过 modules 一次构建全部模块,继承通过 parent 复用配置;reactor 按模块依赖推导构建顺序,-pl、-am、-amd 支持定向构建,版本统一放在 parent 的 dependencyManagement。'
category: java
node: java-build-multimodule
order: 67
level: 进阶
tags: [Maven, 多模块, reactor, 聚合, 继承]
updated: 2026-11-19
mindmap: maven-multimodule.mindmap.json
terms: ["maven", "aggregation", "build-lifecycle", "dependency-management"]
sources:
  - title: Maven 官方指南 · Guide to Working with Multiple Modules
    url: https://maven.apache.org/guides/mini/guide-multiple-modules.html
    note: 聚合、继承、reactor 与 -pl/-am/-amd 的官方说明。
  - title: Maven 官方 · POM Reference
    url: https://maven.apache.org/pom.html
    note: modules、parent 与 dependencyManagement 的元素定义。
  - title: Maven 官方 · Introduction to the Lifecycle
    url: https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html
    note: 各模块构建时执行的阶段顺序。
---

上一篇解决了单个 POM 内的依赖版本。项目按职责拆分后会得到多个模块,它们的构建顺序、配置复用与版本统一需要另外一套机制,这套机制由聚合与继承构成。

## 聚合与继承是两件事

aggregation(聚合)指一个 POM 通过 modules 列出子模块,一次命令构建全部模块;inheritance(继承)指子模块通过 parent 继承父 POM 的配置。两者常由同一个根 POM 承担,概念上互相独立:可以只聚合不继承,也可以只继承不聚合。

承担聚合的父 POM 的 packaging 必须是 pom,因为它本身不产出 jar。示例:

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>shop-parent</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <modules>
        <module>shop-api</module>
        <module>shop-dao</module>
        <module>shop-service</module>
        <module>shop-web</module>
    </modules>
</project>
```

子模块通过 parent 继承这个 POM:

```xml
<parent>
    <groupId>com.example</groupId>
    <artifactId>shop-parent</artifactId>
    <version>1.0.0</version>
    <relativePath>../pom.xml</relativePath>
</parent>

<artifactId>shop-service</artifactId>
```

子模块继承 groupId 与 version,只需声明自己的 artifactId。relativePath 默认值就是 ../pom.xml,省略通常也能找到父 POM;父 POM 已发布到仓库时,则按 GAV 从仓库解析。

## reactor 构建顺序

reactor(反应堆)是一次构建中参与的全部模块集合。Maven 读取 modules,分析模块之间的依赖关系,按拓扑排序决定构建顺序,与 modules 列表的书写顺序无关。被依赖的模块先构建,依赖方后构建。

模块之间不能存在循环依赖:A 依赖 B、B 又依赖 A 时,reactor 无法排序,构建直接失败。出现循环通常说明分层有误,应把共用部分下沉到独立模块。

排序完成后,Maven 对每个模块依次执行 build-lifecycle 的各阶段。执行 mvn package 会对所有模块完成编译、测试与打包,而不是只处理第一个模块。

## 定向构建:-pl、-am、-amd

```bash
mvn -pl shop-service -am clean package  # 构建 service 及其依赖的模块
mvn -pl shop-dao -amd package           # 构建 dao 及依赖它的模块
mvn -pl shop-service package            # 只构建 service
mvn -rf :shop-service package           # 从上次失败的模块继续
```

-pl 指定参与构建的模块列表;-am(also make)把被选模块所依赖的模块一起构建;-amd(also make dependents)把依赖被选模块的模块一起构建。只构建一个模块而它依赖的模块尚未 install 到本地仓库时,解析会失败,-am 用于这种情况。

-rf 在构建失败后从指定模块继续,前面已成功的模块不再重复构建。模块多、构建慢时,这组参数能显著缩短验证时间。

## 常见分层

一个典型的业务项目按下列模块拆分:

- shop-parent:父 POM,packaging 为 pom,统一依赖版本与插件配置;
- shop-api:DTO、接口与常量,不依赖其他业务模块;
- shop-dao:持久化实现,依赖 shop-api;
- shop-service:业务逻辑,依赖 shop-dao 与 shop-api;
- shop-web:Controller 与启动类,依赖 shop-service。

依赖方向保持单向:web → service → dao → api。反向依赖或跨层调用会破坏分层,也容易演变成循环依赖。模块数量不必教条,小项目可以合并 api 与 dao,拆分依据是变更边界与复用需求。

## 版本统一与依赖管理

在 parent 的 dependencyManagement 中集中声明版本,子模块声明依赖时省略 version,升级只需改父 POM 一处。这是多模块项目最常用的版本治理方式。

继承对直接子模块生效,孙模块沿父链继续继承。子模块需要覆盖某个版本时,在自己的 dependencyManagement 中重新声明即可,就近的声明优先。外部套件用 BOM 加 scope=import 导入,避免逐个维护版本号。

模块之间相互依赖的版本用 ${project.version} 引用,保证与父 POM 版本一致;升级父版本时,子模块之间的依赖版本自动跟随,不会出现部分模块仍指向旧版本的情况。

## 小结

- 聚合通过 modules 一次构建全部模块,继承通过 parent 复用配置,两者独立;
- 承担聚合的父 POM,packaging 必须是 pom;
- reactor 按模块依赖拓扑排序,与 modules 书写顺序无关,循环依赖直接失败;
- -pl 选择模块,-am 连带依赖,-amd 连带使用方,-rf 从失败处继续;
- 版本统一放在 parent 的 dependencyManagement,模块依赖保持单向。
