---
title: IoC 与依赖注入
summary: 'IoC 容器负责创建、装配与管理 Bean,依赖注入是它完成装配的方式:构造器注入声明必需依赖,@Autowired 按类型匹配、@Qualifier 按名字消歧;单例 Bean 有完整生命周期,构造器循环依赖会直接报错。'
category: java
node: java-spring-ioc
order: 70
level: 进阶
tags: [IoC, 依赖注入, Bean, 生命周期]
updated: 2026-11-19
mindmap: spring-ioc.mindmap.json
terms: ["ioc", "dependency-injection", "bean"]
sources:
  - title: Spring Framework Reference · The IoC Container
    url: https://docs.spring.io/spring-framework/reference/core/beans.html
    note: Bean 定义、依赖注入、作用域与生命周期的官方说明。
  - title: Spring Boot Reference Documentation
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 组件扫描与自动配置如何在 Boot 中启用容器。
---

上一篇的启动流程里,refresh 阶段的核心动作是创建容器中的对象并完成装配。这个容器就是 IoC 容器,装配方式叫依赖注入。这篇说明这两件事。

## IoC 与 Bean

IoC(Inversion of Control,控制反转)指对象的创建与依赖关系的维护从业务代码转移到容器。程序改为声明自己需要什么,由容器在启动时创建并传入,不再直接 new 出协作对象。

Bean 是由 IoC 容器创建、装配、管理的对象。它与普通 Java 对象的区别只在管理方式:生命周期由容器控制,依赖由容器注入,默认以单例形式存在。容器本身由 ApplicationContext 接口表示,Spring Boot 在 refresh 阶段完成全部单例 Bean 的实例化。

## 声明 Bean:@Component 家族

类路径扫描是最常用的声明方式:

```java
@Service
public class OrderService {
    private final OrderRepository repository;

    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}
```

@Component 是通用注解,@Service、@Repository、@Controller 是它的语义化特化,分别标识业务层、持久层与 Web 层。四者在装配上等价,区别在可读性与部分附加行为,例如 @Repository 会把持久层异常转换为 Spring 的数据访问异常。

扫描范围默认是启动类所在包及子包,所以这些类必须位于根包之下。

## @Configuration 与 @Bean

第三方类无法加 @Component 时,用配置类的方法声明:

```java
@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
```

@Configuration 标记配置类,@Bean 标记方法,方法返回值注册为 Bean,方法名默认是 Bean 名称。容器调用该方法一次并把结果缓存,单例语义由容器维护。配置类本身也是 Bean。

## 注入:构造器优先

依赖注入(dependency-injection)有三种写法:构造器注入、setter 注入与字段注入。构造器注入是首选:

```java
@Service
public class OrderService {
    private final OrderRepository repository;
    private final PaymentClient paymentClient;

    public OrderService(OrderRepository repository, PaymentClient paymentClient) {
        this.repository = repository;
        this.paymentClient = paymentClient;
    }
}
```

单构造器不需要 @Autowired,Spring 会自动使用它。字段可以声明为 final,对象创建完成即处于可用状态,测试时直接传入 mock,不依赖容器。

@Autowired 默认按类型匹配;同一类型有多个 Bean 时,用 @Qualifier 指定名称:

```java
@Service
public class NotifyService {
    private final MessageSender smsSender;

    public NotifyService(@Qualifier("smsSender") MessageSender smsSender) {
        this.smsSender = smsSender;
    }
}
```

字段注入 `@Autowired private OrderRepository repository;` 的问题在于:依赖关系藏在字段上,创建对象时无法看出必需项;脱离容器直接 new 会得到 null,只能在运行期暴露;循环依赖也可能被暂时掩盖。构造器注入把依赖写入签名,缺失时编译或启动阶段就会失败。

## 作用域

默认作用域是 singleton:容器内每个 Bean 定义只创建一个实例,所有注入点共享同一对象。prototype 作用域每次获取都创建新实例,容器不负责销毁,调用方自行管理。

Web 环境还有 request、session 等作用域,使用较少。绝大多数 Bean 应保持无状态并使用单例,有状态数据放在方法局部变量或请求对象中。

## Bean 生命周期

单例 Bean 从创建到销毁经过几个阶段:

1. 实例化:调用构造器创建对象;
2. 依赖注入:填充构造器参数与 setter;
3. 初始化:调用 @PostConstruct 方法、InitializingBean.afterPropertiesSet、自定义 init-method;
4. 使用:Bean 可供其他组件调用;
5. 销毁:容器关闭时调用 @PreDestroy、DisposableBean.destroy、自定义 destroy-method。

```java
@Component
public class ConnectionPool {
    @PostConstruct
    void init() {
        System.out.println("init");     // init,容器启动时输出
    }

    @PreDestroy
    void close() {
        System.out.println("close");    // close,容器关闭时输出
    }
}
```

@PostConstruct 与 @PreDestroy 来自 jakarta.annotation 包,Spring Boot 3 已不再使用 javax.annotation 版本。

## 循环依赖

A 的构造器依赖 B,B 的构造器又依赖 A,容器无法先完整创建任何一个,启动时抛出 BeanCurrentlyInCreationException。这是构造器注入的正常结果:循环依赖本身就是设计问题。

字段注入能让这种结构启动,因为容器可以先创建空对象再填入引用,但问题被延迟到运行期,且对象可能处于半初始化状态。正确做法是拆分职责,把共用逻辑下沉到第三个 Bean,或者用事件、回调解除直接依赖。

下一篇看自动配置:容器里的 DataSource、ObjectMapper 等 Bean 为什么不需要逐个声明。

## 小结

- IoC 容器创建、装配、管理 Bean,依赖注入是完成装配的方式;
- @Component 及其特化用于扫描声明,@Configuration + @Bean 用于第三方类型;
- 构造器注入声明必需依赖,字段加 final,便于测试且能尽早暴露缺失;
- @Autowired 按类型,@Qualifier 按名称消歧;
- 单例 Bean 经历实例化、注入、初始化、使用、销毁,@PostConstruct/@PreDestroy 挂在首尾;
- 构造器循环依赖直接报错,应拆分职责,不用字段注入掩盖。
