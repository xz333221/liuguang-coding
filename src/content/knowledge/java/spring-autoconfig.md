---
title: 自动配置与 starter
summary: '自动配置把常见组件的 Bean 定义收进条件化配置类,由 @EnableAutoConfiguration 通过 AutoConfiguration.imports 加载;@ConditionalOnClass、@ConditionalOnMissingBean、@ConditionalOnProperty 决定是否生效,自定义 Bean 或配置属性可以覆盖默认值。'
category: java
node: java-spring-autoconfig
order: 71
level: 进阶
tags: [自动配置, starter, 条件注解, AutoConfiguration.imports]
updated: 2026-11-19
mindmap: spring-autoconfig.mindmap.json
terms: ["auto-configuration", "starter", "bean"]
sources:
  - title: Spring Boot Reference Documentation
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 自动配置、条件注解与 starter 的官方说明。
  - title: Spring Boot 项目主页
    url: https://spring.io/projects/spring-boot
    note: 版本与项目资料入口。
---

上一篇的 Bean 都由 @Component 或 @Bean 显式声明。实际项目只引入 spring-boot-starter-web 就得到 Jackson、内嵌 Tomcat 等组件,这些 Bean 来自自动配置(auto-configuration)。这篇说明它如何注册、何时生效,以及 starter 如何组织。

## 自动配置解决什么

自动配置是一组条件化的 @Configuration 类:类路径上出现某个库、缺少某个 Bean、配置了某个属性时,才注册对应的 Bean。@EnableAutoConfiguration 负责收集候选配置类并交给容器处理。

它读取一份固定的注册清单,逐个判断条件,不会扫描第三方 jar 里的所有类。条件不满足的配置类被跳过,满足的才导入。

## 注册清单的位置

Spring Boot 2.7 之前,清单写在 META-INF/spring.factories:

```text
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.StorageAutoConfiguration
```

2.7 起改用专用文件,3.x 只读新位置:

```text
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

文件内容是配置类全限定名,一行一个:

```text
com.example.autoconfigure.StorageAutoConfiguration
com.example.autoconfigure.MetricsAutoConfiguration
```

2.7 同时支持两种位置,3.x 移除了对 spring.factories 中自动配置条目的读取。自动配置应统一写在 imports 文件。

## 条件注解

自动配置类上的条件注解决定是否生效,常用三个:

- @ConditionalOnClass:类路径存在指定类时生效;
- @ConditionalOnMissingBean:容器中没有指定类型的 Bean 时生效,为用户自定义留出覆盖空间;
- @ConditionalOnProperty:配置属性满足指定值时生效。

```java
@AutoConfiguration
@ConditionalOnClass(StorageClient.class)
@ConditionalOnProperty(prefix = "storage", name = "enabled", havingValue = "true")
public class StorageAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public StorageClient storageClient(StorageProperties properties) {
        return new StorageClient(properties.getEndpoint());
    }
}
```

@AutoConfiguration 是 @Configuration 的专用形式,标记这是一个自动配置类。@ConditionalOnMissingBean 让用户在项目里声明同类型 Bean 时,默认实现自动退让。

## 配置顺序

多个自动配置之间存在先后依赖,用 @AutoConfigureBefore、@AutoConfigureAfter、@AutoConfigureOrder 声明。例如数据源要先于 JPA 配置,缓存管理器要先于使用它的组件。顺序只影响自动配置类之间的处理次序,不影响普通 @Component 的扫描。

## 自定义 starter 的最小结构

starter 由两个模块组成:

```text
storage-spring-boot-autoconfigure/   配置类、属性类、imports 文件
storage-spring-boot-starter/         只含依赖声明,依赖上面的模块
```

autoconfigure 模块放 StorageAutoConfiguration、StorageProperties 与注册文件;starter 模块的 pom 依赖 autoconfigure,并引入第三方库:

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>storage-spring-boot-autoconfigure</artifactId>
    <version>1.0.0</version>
</dependency>
```

使用方只引入 starter,就同时获得库与自动配置。小项目可以把两者合并成一个模块,拆开是为了让 autoconfigure 能被其他 starter 复用。

## 查看与覆盖

启动时加 --debug 会在控制台输出条件评估报告(ConditionEvaluationReport),列出哪些自动配置生效、哪些被跳过以及原因。测试中可以通过 ConditionEvaluationReport.get(ConfigurableListableBeanFactory) 读取 PositiveMatches 与 NegativeMatches。

覆盖自动配置有两条路径:

1. 自定义 Bean:在项目里声明同类型 Bean,@ConditionalOnMissingBean 使默认配置退让;
2. 配置属性:在 application.yml 中修改前缀属性,例如 storage.enabled 与 storage.endpoint,无需替换 Bean。

配置属性的加载与多环境在「配置管理与多环境」一篇展开,这里先掌握这两个覆盖入口。

## 小结

- 自动配置是按条件生效的 @Configuration 类,由 @EnableAutoConfiguration 收集;
- Spring Boot 2.7 起注册清单位于 AutoConfiguration.imports,一行一个配置类;
- @ConditionalOnClass、@ConditionalOnMissingBean、@ConditionalOnProperty 控制生效条件;
- @AutoConfigureBefore/@AutoConfigureAfter 调整自动配置之间的顺序;
- starter 通常拆为 autoconfigure 与 starter 两个模块;
- --debug 查看条件评估报告,自定义 Bean 或配置属性可覆盖默认值。
