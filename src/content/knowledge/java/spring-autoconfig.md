---
title: 自动配置与 starter
summary: '自动配置类按 @Conditional 条件(classpath/Bean/配置)注册默认 Bean;@EnableAutoConfiguration 导入 AutoConfiguration.imports;starter 是依赖聚合+自动配置的打包;用户自定义 Bean 优先于自动配置。'
category: java
node: java-spring-autoconfig
order: 71
level: 进阶
tags: [自动配置, Conditional, starter, BOM, 条件装配]
updated: 2026-11-18
mindmap: java-spring-autoconfig.mindmap.json
terms: ["auto-configuration", "starter", "bean", "spring-boot"]
sources:
  - title: Spring Boot Reference · Auto-configuration
    url: https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html
    note: 自动配置类、条件注解与加载机制的官方依据。
  - title: Spring Boot Reference · Starters
    url: https://docs.spring.io/spring-boot/reference/using/build-systems.html#using.build-systems.starters
    note: starter 命名与依赖聚合的参照。
---

引入 spring-boot-starter-web 就能跑 Web,不用写一行 MVC 配置——背后是自动配置。这一篇讲它怎么"按条件装配",以及 starter 到底是什么。

## 自动配置的本质

自动配置是一批带 @Configuration 的类(如 DispatcherServletAutoConfiguration、JacksonAutoConfiguration),每个用 **@Conditional 派生注解**声明生效条件:

- @ConditionalOnClass:classpath 有某类才生效(有 DispatcherServlet 才配 MVC);
- @ConditionalOnMissingBean:容器没有用户自定义的同类型 Bean 才注册默认(用户优先);
- @ConditionalOnProperty:配置项满足才生效;
- @ConditionalOnWebApplication:Web 环境才生效。

故"引入依赖→classpath 有类→条件满足→注册默认 Bean";用户自己定义了同类型 Bean,@ConditionalOnMissingBean 让自动配置退让。**约定默认,自定义覆盖**。

## 加载机制

@EnableAutoConfiguration 通过 @Import(AutoConfigurationImportSelector)读取各 jar 的 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`(Boot 2.7+ 取代 spring.factories),列出自动配置类全名,按条件过滤后注册。

排除某自动配置:@SpringBootApplication(exclude = DataSourceAutoConfiguration.class) 或 spring.autoconfigure.exclude 配置。

## starter 是什么

starter 是一个**依赖描述符**(pom),聚合某功能所需的全部依赖 + 对应自动配置模块。如 spring-boot-starter-data-jpa 拉入 Hibernate、Spring Data JPA、HikariCP、事务等,版本由 spring-boot-dependencies BOM 锁定。

命名约定:官方 spring-boot-starter-{name};第三方 {name}-spring-boot-starter。自定义 starter = 自动配置类 + imports 文件 + 依赖聚合 pom,供他人引入即用。

## 观察自动配置

启动加 --debug 或 logging.level.org.springframework.boot.autoconfigure=DEBUG,打印 **CONDITIONS EVALUATION REPORT**:Positive matches(生效及原因)、Negative matches(未生效及缺什么条件)、Exclusions。排查"为什么某 Bean 没注册/注册了意外默认"首选此报告。

## 配置属性绑定

自动配置类常配合 @ConfigurationProperties(prefix="spring.datasource") 把 application.yml 绑定到属性对象,用户改配置即改默认 Bean 行为,无需改代码。

## 小结

- 自动配置 = @Configuration + @Conditional(OnClass/OnMissingBean/OnProperty);
- 用户 Bean 优先,自动配置退让;约定默认可覆盖;
- @EnableAutoConfiguration 读 AutoConfiguration.imports 加载;
- starter = 依赖聚合 + 自动配置,BOM 锁版本;
- --debug 看条件报告定位装配;@ConfigurationProperties 绑定配置。

下一篇讲 Web 层:Controller、参数绑定、统一返回与异常处理。