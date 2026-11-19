---
title: 配置管理与多环境
summary: 'Spring Boot 默认从 application.properties 或 application.yml 加载配置,@Value 适合零散单值,@ConfigurationProperties 提供类型安全的分组绑定与校验;属性按命令行参数、环境变量、application-{profile}.yml、application.yml 的顺序覆盖;敏感项只留占位符,值由环境注入。'
category: java
node: java-spring-config
order: 73
level: 进阶
tags: [Spring Boot, 配置, profile, ConfigurationProperties]
updated: 2026-11-19
mindmap: spring-config.mindmap.json
terms: ["spring-boot", "binding"]
sources:
  - title: Spring Boot Reference · Externalized Configuration
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 配置文件默认位置、属性源加载顺序与优先级规则。
  - title: Spring Boot Reference · Profiles
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: profile 激活方式与 profile-specific 配置文件的覆盖关系。
  - title: Spring Framework Reference · Environment Abstraction
    url: https://docs.spring.io/spring-framework/reference/index.html
    note: Environment、PropertySource 与 profile 的抽象定义。
---

上一篇把请求交给 Controller,返回值也统一了格式。接口逻辑不变,部署到不同环境时,端口、数据库地址、功能开关却各不相同,这些值需要与代码分离。

## 配置文件的位置与格式

Spring Boot 启动时加载 classpath 下的 application.properties 或 application.yml。两者可以同时存在,properties 的优先级更高。jar 包同级的 config/ 目录与当前工作目录也在默认搜索范围内,运维可以在不修改构建产物的情况下覆盖包内配置。

properties 是平铺的 key=value,每行一条,没有缩进问题,配置项多时前缀重复;yml 用缩进表达层级,同一个前缀只写一次,更适合嵌套结构。yml 不允许用 Tab 缩进,冒号后必须留一个空格。

```yaml
server:
  port: 8080

spring:
  application:
    name: order-service

app:
  mail:
    host: smtp.example.com
    port: 465
```

扁平、需要脚本批量替换时用 properties;层级多、需要注释与多文档(`---` 分隔)时用 yml。同一项目保持一种格式即可,混用只会让覆盖关系更难排查。

## @Value 与 @ConfigurationProperties

@Value 按单个 key 注入,支持 `${}` 占位符与 SpEL 表达式,适合零散的一两个值。它的局限在类型层面:key 拼错要到启动时才发现,数值转换失败只报一条转换异常,也无法对整个前缀做校验。

@ConfigurationProperties 把某个前缀下的一组配置绑定到一个对象。绑定(binding)在启动阶段完成,支持松散命名:属性文件里的 `app.mail.host-name` 可以写成 `hostName`,环境变量则写成 `APP_MAIL_HOSTNAME`。

```java
@ConfigurationProperties(prefix = "app.mail")
@Validated
public class MailProperties {

    @NotBlank
    private String host;

    @Min(1)
    private int port = 25;

    private String from;

    // getter / setter 省略
}
```

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class OrderApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

把 `spring-boot-configuration-processor` 声明为可选依赖,构建时会生成配置元数据,IDE 能补全前缀下的 key,并标出 unknown property。校验注解来自 jakarta.validation,取值不合法时启动直接失败,比运行到一半才暴露问题更早。

## 配置优先级

同一个 key 出现在多个来源时,高优先级覆盖低优先级:

```text
1. 命令行参数        --server.port=9090
2. 环境变量          SERVER_PORT=9090
3. application-prod.yml
4. application.yml
```

覆盖以 key 为单位,不会整文件替换,因此 application.yml 中没有被覆盖的项照常生效。Java 系统属性(`-Dserver.port=9090`)位于命令行参数与环境变量之间,容器环境常用它传 JVM 参数。

环境变量名由属性名转换:字母大写,`.` 换成 `_`,如 `SPRING_DATASOURCE_URL` 对应 `spring.datasource.url`。含连字符的 key 在环境变量中不保证能正确绑定,这类配置优先用命令行参数传入。

## profile:按环境切换

profile 是一组配置的命名分组。激活方式有三种,效果相同:

- 配置文件里写 `spring.profiles.active: dev`,作为默认值;
- 环境变量 `SPRING_PROFILES_ACTIVE=prod`;
- 命令行 `--spring.profiles.active=prod`。

激活 prod 后,application-prod.yml 与 application.yml 同时加载,前者覆盖后者。没有显式激活时,`spring.profiles.default` 决定默认 profile,未设置时为 default。

@Profile 让整个配置类或单个 @Bean 只在指定 profile 下生效:

```java
@Configuration
@Profile("dev")
public class DevSeedConfig {

    @Bean
    CommandLineRunner seedData() {
        return args -> System.out.println("dev: 初始化示例数据");
    }
}
```

把 active 写死在打包的 application.yml 里只适合本地开发。部署时用环境变量或命令行覆盖,同一份产物就能分别运行在测试与生产环境。

## 敏感配置的处理

数据库密码、第三方 AppSecret、签名密钥不写进仓库,也不写进会被提交的 application.yml。配置项只保留占位符,值在部署环境注入:

```yaml
spring:
  datasource:
    url: jdbc:mysql://db.internal:3306/order
    username: order_app
    password: ${DB_PASSWORD}
```

`${DB_PASSWORD}` 从环境变量读取,缺失时启动失败,比默认空密码安全。本地开发可以用未被跟踪的 application-local.yml,并在 .gitignore 中排除;团队规模变大后,改用配置中心或专用的密钥管理服务。

## 配置刷新

进程启动后,配置值已经绑定到 bean,修改配置文件不会自动生效。需要运行时调整时,接入配置中心(Spring Cloud Config、Nacos),客户端监听变更并刷新标注 @RefreshScope 的 bean。单机部署重启进程更简单,不必引入这一层。

## 小结

- Spring Boot 默认加载 application.properties 与 application.yml,jar 外的 config/ 目录可覆盖包内配置;
- properties 适合扁平配置,yml 适合层级结构,同一项目选一种;
- @Value 用于零散单值,@ConfigurationProperties 提供类型安全的分组绑定、校验与 IDE 提示;
- 优先级为命令行参数、环境变量、application-{profile}.yml、application.yml,逐 key 覆盖;
- profile 通过配置、环境变量或命令行激活,@Profile 控制 bean 的生效环境;
- 密钥只留占位符,值由环境注入;运行期刷新交给配置中心。
