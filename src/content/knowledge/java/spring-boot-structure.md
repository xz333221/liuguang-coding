---
title: Spring Boot 项目结构与启动流程
summary: 'Spring Boot 用约定目录、@SpringBootApplication 组合注解与 SpringApplication.run 统一启动:main 方法创建 ApplicationContext、刷新容器并启动内嵌服务器,starter 把一组依赖打包引入,可执行 jar 自带启动器与 lib 目录。'
category: java
node: java-spring-boot
order: 69
level: 进阶
tags: [Spring Boot, 目录结构, 启动流程, starter, 可执行 jar]
updated: 2026-11-19
mindmap: spring-boot-structure.mindmap.json
terms: ["spring-boot", "starter", "bean", "embedded-server"]
sources:
  - title: Spring Boot Reference Documentation
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 目录约定、自动配置、构建插件与可执行 jar 的官方说明。
  - title: Spring Boot 项目主页
    url: https://spring.io/projects/spring-boot
    note: 版本、starter 与项目定位的入口。
---

上一篇用 JUnit 与 Mockito 为 Maven 模块中的类编写测试,被测对象由测试代码直接创建。Spring Boot 应用的运行方式不同:对象交给容器创建,入口固定为 main 方法,目录与依赖也有一套约定。先看这套约定。

## 标准目录

Maven 项目在 Spring Boot 中的典型布局:

```text
src/
├── main/
│   ├── java/com/example/shop/
│   │   ├── ShopApplication.java      启动类
│   │   ├── controller/
│   │   ├── service/
│   │   └── repository/
│   └── resources/
│       ├── application.yml           主配置
│       ├── static/                   静态资源
│       └── templates/                模板文件
└── test/java/
```

src/main/java 放源码,包结构按业务分层。src/main/resources 放配置与静态资源:application.yml(或 .properties)是主配置文件,static 下的文件由 Web 服务器直接提供,templates 存放 Thymeleaf 等模板。src/test/java 与主源码包路径对应,测试类能被同一套构建流程发现。

启动类应放在根包,例如 com.example.shop。@ComponentScan 默认扫描启动类所在包及其子包,放在根包才能覆盖 controller、service 等子包。

## 一个组合注解

启动类只有几行:

```java
package com.example.shop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ShopApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShopApplication.class, args);
    }
}
```

@SpringBootApplication 是三个注解的组合:

- @SpringBootConfiguration:声明这是一个配置类,本质是 @Configuration 的特化;
- @EnableAutoConfiguration:启用自动配置,下一篇展开;
- @ComponentScan:扫描当前包及子包中的 @Component、@Service、@Repository、@Controller。

三者合在一起,启动类同时承担配置入口与组件扫描入口。自定义扫描范围时可以用 scanBasePackages,但优先调整包结构,避免直接扩大扫描路径。

## SpringApplication.run 做了什么

main 方法只调用一次静态方法,内部按以下顺序执行:

1. 创建 SpringApplication 实例,推断应用类型(Servlet、Reactive 或普通);
2. 准备 Environment,加载 application.yml、环境变量与命令行参数;
3. 创建 ApplicationContext,例如 Servlet 应用对应 AnnotationConfigServletWebServerApplicationContext;
4. 刷新容器(refresh):实例化单例 Bean、执行依赖注入与初始化回调;
5. 启动内嵌服务器(embedded-server),默认是 Tomcat,监听 8080 端口;
6. 发布启动完成事件,执行 ApplicationRunner 与 CommandLineRunner。

控制台会输出启动日志:

```text
Tomcat started on port 8080 (http)
Started ShopApplication in 1.842 seconds
```

内嵌服务器意味着应用以普通 Java 进程运行,不需要单独安装 Tomcat。这也是 java -jar 能直接启动一个 Web 服务的原因。

## starter 是依赖集合

starter 是预定义依赖集合的 Maven 构件,引入一个 starter 就获得一组经过版本校验的依赖。例如:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

spring-boot-starter-web 间接引入 spring-webmvc、Jackson、内嵌 Tomcat 等基础依赖,版本由 spring-boot-dependencies 统一管理,项目里不需要逐个写版本号。官方 starter 命名以 spring-boot-starter- 开头,第三方 starter 通常以 -spring-boot-starter 结尾,例如 mybatis-spring-boot-starter。

## 可执行 jar 的结构

mvn package 生成的 jar 可以直接用 java -jar 运行:

```text
shop-1.0.0.jar
├── BOOT-INF/classes/          应用类与配置文件
├── BOOT-INF/lib/              依赖 jar
├── META-INF/MANIFEST.MF       主类与版本信息
└── org/springframework/boot/loader/   启动器
```

普通 jar 的类位于根目录,这个 jar 把应用类放进 BOOT-INF/classes、依赖放进 BOOT-INF/lib,由 jar 内的启动器创建自定义类加载器后再调用主类。MANIFEST.MF 中的 Main-Class 指向启动器,Start-Class 指向应用启动类。

## 配置的入口

application.yml 是默认配置,application-{profile}.yml 用于不同环境。profile 的激活方式与加载优先级在「配置管理与多环境」一篇展开,这里只需知道配置文件位于 src/main/resources,并且可以被环境变量与命令行参数覆盖。

下一篇进入容器内部:refresh 阶段创建的 Bean 是什么,依赖如何注入。

## 小结

- 启动类放在根包,src/main/java 分层,src/main/resources 放配置与静态资源;
- @SpringBootApplication 由 @SpringBootConfiguration、@EnableAutoConfiguration、@ComponentScan 组合而成;
- SpringApplication.run 依次准备环境、创建 ApplicationContext、刷新容器、启动内嵌服务器;
- starter 是依赖集合,引入即获得一组版本统一的依赖;
- 可执行 jar 把应用类与依赖分别放在 BOOT-INF/classes 与 BOOT-INF/lib,由启动器加载。
