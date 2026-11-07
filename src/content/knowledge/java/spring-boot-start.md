---
title: Spring Boot:一个项目从哪几个文件夹开始
summary: 'Spring Boot 只规定两件事:代码放 src/main/java、配置放 src/main/resources。剩下的分包是按职责切的 —— 接口、业务、存取、数据形状各一层,谁也不越界。'
category: java
order: 2
level: 入门
tags: [Spring Boot, 工程结构, 分层, 自动配置, 面试高频]
updated: 2026-11-07
mindmap: java-springboot.mindmap.json
demo: java-springboot
terms: ["spring-boot", "ioc", "dependency-injection", "bean", "starter", "auto-configuration", "embedded-server"]
sources:
  - title: Spring Boot 参考文档 · Developing with Spring Boot
    url: https://docs.spring.io/spring-boot/reference/using/index.html
    note: 目录结构、构建产物、运行方式的官方说明,本文结构部分以它为准。
  - title: Spring Boot 参考文档 · Auto-configuration
    url: https://docs.spring.io/spring-boot/reference/using/auto-configuration.html
    note: 自动配置怎么按条件装配、排除与覆盖的顺序。
  - title: Spring Framework 文档 · The IoC Container
    url: https://docs.spring.io/spring-framework/reference/core/beans.html
    note: 容器、Bean 定义、构造器注入与作用域的准确定义。
  - title: Maven · Introduction to the Standard Directory Layout
    url: https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html
    note: src/main/java、src/main/resources、src/test/java 这套目录是 Maven 定的,不是 Spring Boot 自己发明的。
  - title: Spring Initializr
    url: https://start.spring.io/
    note: 官方脚手架,选依赖就能生成同结构的项目。
---

先把结论说清楚:**Spring Boot 没有规定"必须这样分包",它只规定了两件事 —— Java 代码放 `src/main/java`、配置文件放 `src/main/resources`,测试放 `src/test/java`。这三个位置来自 Maven 的标准目录约定。** 剩下的 `controller` / `service` / `repository` 是大家按"谁的活谁干"切出来的,因为这么切最省事。

`pom.xml` 里的 starter 是同一个思路的另一半:一个条目把 web 需要的七八个依赖打包带进来,不用自己一个个凑版本。

一个能跑的最小项目长这样:

```text
springboot-demo/
├─ pom.xml                          工程描述:依赖、Java 版本、打包方式
├─ src/
│  ├─ main/
│  │  ├─ java/com/liuguang/demo/
│  │  │  ├─ DemoApplication.java    启动类
│  │  │  ├─ controller/             接口层
│  │  │  ├─ service/                业务层
│  │  │  ├─ repository/             存取层
│  │  │  ├─ model/                  数据形状(实体)
│  │  │  ├─ dto/                    入参出参
│  │  │  ├─ config/                 配置类
│  │  │  └─ exception/              异常与全局处理
│  │  └─ resources/
│  │     ├─ application.yml         端口、数据源、日志
│  │     ├─ schema.sql              建表
│  │     └─ data.sql                示例数据
│  └─ test/java/com/liuguang/demo/  测试
└─ target/                          构建产物,由 mvn 生成,不该进仓库
```

启动类只有一行真正的逻辑:

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

`@SpringBootApplication` 是个组合注解,拆开是三个:`@SpringBootConfiguration` 声明它是配置类、`@EnableAutoConfiguration` 按 classpath 上有什么依赖来决定装配什么(这就是自动配置)、`@ComponentScan` 从当前包往下扫组件。扫到的类都会注册成 Bean,由 IoC 容器统一管理;谁需要别的 Bean,就在自己构造器上声明 —— 依赖注入就是这么发生的。所以启动类的位置不是随便放的,见下面「为什么必须放在最外层」。

## 每个文件夹到底管什么

判断一个类该放哪,只问一句:**它坏了的时候,是谁的锅?**

| 目录 | 放什么 | 不该放什么 |
| --- | --- | --- |
| `controller/` | 路由、参数绑定、状态码。`@RestController` | SQL、业务规则、事务 |
| `service/` | 业务规则、多个仓储的编排、事务边界 | HTTP 对象(`HttpServletRequest`、状态码) |
| `repository/` | 只做存取。继承 `JpaRepository` 就够了 | 判断"这本书能不能标记读过"这类规则 |
| `model/` | 实体:和表一一对应的字段 | 组装 JSON、校验入参 |
| `dto/` | 请求与响应的形状,只带该给外面的字段 | 实体里的主键自增、内部状态 |
| `config/` | `@Bean` 声明:时钟、线程池、序列化器 | 业务逻辑 |
| `exception/` | 自定义异常 + `@RestControllerAdvice` | 到处 try-catch |
| `resources/` | `application.yml`、SQL、模板、静态文件 | Java 代码 |
| `test/` | 测试代码,`mvn package` 不会打进 jar | 生产代码 |

接口层里就该只有这几行:

```java
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;

    public BookController(BookService service) {   // 构造器注入
        this.service = service;
    }

    @GetMapping("/{id}")
    public Book detail(@PathVariable Long id) {
        return service.findById(id);               // 返回对象,Jackson 自己转 JSON
    }
}
```

业务层接住规则,并且不碰 HTTP:

```java
@Service
public class BookService {

    private final BookRepository books;

    public BookService(BookRepository books, Clock clock) { ... }

    @Transactional(readOnly = true)
    public Book findById(Long id) {
        return books.findById(id).orElseThrow(() -> new BookNotFoundException(id));
    }
}
```

**分层的意义不是"文件整齐",而是换掉其中一层时不用动别的。** 把 H2 换成 MySQL,只改 `application.yml` 的 `datasource`;把 REST 接口换成定时任务,直接调 `BookService`;给接口加缓存,在 service 上套一层就行。

示例代码在这个仓库的 `examples/springboot-demo/` 里,目录和上面那张表逐条对应。

## 为什么启动类必须放在最外层包

`@ComponentScan` 默认从启动类**所在的包**开始,往下递归扫描 `@Component`、`@Service`、`@Repository`、`@Controller`。启动类放在 `com.liuguang.demo` 下,`com.liuguang.demo.controller` 才在扫描范围内;要是把启动类塞进 `com.liuguang.demo.web` 里,同级或更外层的 `service` 就扫不到,启动时报"找不到可注入的 Bean"。

代价是启动类永远待在 root 包,只能有一个 —— 这也正是它的作用:它是整个应用的边界标记。

## 一次请求走过四层

```text
GET /api/books/1
      │
      ▼
BookController      路由匹配、@PathVariable 绑定、返回 200
      │  调用
      ▼
BookService         查不到就抛 BookNotFoundException;@Transactional 在这里开事务
      │  调用
      ▼
BookRepository      启动时生成的代理,发一条 select
      │
      ▼
H2 / MySQL
```

异常往外抛到 `GlobalExceptionHandler`,由它翻译成 404 加一段 `ProblemDetail`,Controller 里不需要写 try-catch:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BookNotFoundException.class)
    public ProblemDetail onNotFound(BookNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("书不存在");
        problem.setDetail(ex.getMessage());
        return problem;
    }
}
```

用 `ProblemDetail`(RFC 9457)而不是自造一个 `{"code":..., "msg":...}`:客户端拿到的 `status` / `title` / `detail` 是标准字段,HTTP 状态码本身也说实话。

## 配置为什么写在 resources 里

`application.yml` 会在启动时被加载成 `Environment`,同一个配置项按 **命令行参数 > 环境变量 > `application-{profile}.yml` > `application.yml`** 的顺序覆盖。所以本地怎么写都不该写死密钥:开发用 `application-dev.yml`,线上用环境变量注入。

端口、数据源这种"部署环境才定"的东西一律进配置;而"这段代码怎么走"的逻辑留在 Java 里。判断标准很简单:**换个环境就要改的值,才属于配置。**

## 打包之后结构变成什么样

`mvn package` 产出一个可执行 jar,结构大致是:

```text
springboot-demo-1.0.0.jar
├─ META-INF/
│  └─ MANIFEST.MF          Main-Class 指向 Spring Boot 的启动器
├─ BOOT-INF/
│  ├─ classes/             src/main 下的 class 与 resources(application.yml 在这里)
│  └─ lib/                 所有依赖 jar
└─ org/springframework/boot/loader/   负责把嵌套 jar 读出来
```

因为内嵌了 Tomcat,`java -jar` 就能起服务,不需要先装一个 Tomcat 再发布 war。内嵌服务器是 Spring Boot 与传统 Spring 部署方式最直观的差别:应用自己带着服务器走。

## 四个容易踩的点

1. **`src/main/resources` 下的文件名是有含义的**。`application.yml` / `schema.sql` 会被自动识别;随手改成 `config.yml` 就得自己写加载逻辑。
2. **`src/test/java` 的包路径要和主代码一致**。同包才能访问包可见的东西,`@SpringBootTest` 也靠它找启动类。
3. **`target/` 一定进 `.gitignore`**。它是构建产物,提交上去每次编译都产生一堆二进制 diff。
4. **别把实体直接当接口出参**。实体带着 `id`、内部字段与将来的字段变更,接口一旦照着实体暴露,后面加个字段就成了公开契约。

## 一句话总结

**Maven 定三个目录:代码、资源、测试;Spring Boot 只负责把 `src/main` 里的东西装配起来跑。** 层是按"谁负责"切的:接口只管 HTTP,业务只管规则,仓储只管存取,实体只管形状。启动类放最外层包,配置进 `resources`,异常交给 `@RestControllerAdvice` —— 一个新项目照着这四句话摆,基本不会乱。
