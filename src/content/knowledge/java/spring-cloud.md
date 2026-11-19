---
title: 微服务一览:Spring Cloud 与注册 / 配置 / 网关
summary: '微服务把单体拆成多个进程,随之需要注册中心维护实例清单、配置中心集中下发配置、API 网关统一入口、客户端负载均衡与 OpenFeign 完成调用;Spring Cloud 是这些项目的集合,通过 BOM 统一版本并与 Spring Boot 对齐。'
category: java
node: java-spring-cloud
order: 75
level: 深入
tags: [Spring Cloud, 微服务, 网关, Nacos]
updated: 2026-11-19
mindmap: spring-cloud.mindmap.json
terms: ["spring-boot", "dependency-management", "bean"]
sources:
  - title: Spring Cloud 项目主页
    url: https://spring.io/projects/spring-cloud
    note: Release Train 概念、组件清单与版本兼容说明。
  - title: Spring Cloud Gateway 项目主页
    url: https://spring.io/projects/spring-cloud-gateway
    note: 路由、断言与过滤器的定位。
  - title: Spring Boot Reference
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 内嵌容器、外部化配置与应用启动模型。
---

上一篇停在单个进程内部:请求如何被容器接收,又如何走到 Controller。系统拆成多个服务后,请求要跨越进程,实例地址会变化,配置也不再集中在一份文件里,Spring Cloud 处理的就是这组问题。

## 微服务带来的问题

单体应用把功能放在一个进程中,模块之间是方法调用;拆成微服务后,同样的调用变成网络请求。收益是独立部署、按需扩容与故障隔离,代价是四类新问题:

- 服务地址不固定,实例随时上下线,调用方需要一个目录;
- 配置分散在多个进程,修改一项要动多个部署单元;
- 外部流量需要统一入口,鉴权、限流、日志不适合每个服务各做一遍;
- 一次请求跨越多个服务,失败与延迟需要可观测。

Spring Cloud 针对这些问题提供一组组件,每类问题对应一个项目,按需引入。

## 注册中心:服务如何找到彼此

注册中心保存「服务名 → 实例地址列表」的映射。服务启动时注册自己的地址并定期发送心跳,注册中心剔除心跳超时的实例,调用方按服务名查询可用实例,再选择一个发起请求。

常见实现:

- Eureka:Netflix 开源,AP 模型,网络分区时保留旧实例列表,靠自我保护机制避免误删;
- Nacos:阿里巴巴开源,同时提供注册中心与配置中心,支持 AP 与 CP 切换;
- Consul:Hashicorp 出品,支持多数据中心、健康检查与 KV 存储。

```yaml
spring:
  application:
    name: order-service
  cloud:
    nacos:
      discovery:
        server-addr: 127.0.0.1:8848
```

spring.application.name 就是服务名,Feign 与网关都通过它定位实例。名字写错时,报错通常出现在调用方,启动阶段不会提示。

## 配置中心

配置中心把配置文件集中存放,服务启动时按「应用名 + profile」拉取,修改后在控制台发布,客户端监听变更并刷新。Spring Cloud Config 以 Git 仓库为后端,由独立的 Config Server 提供 HTTP 接口;Nacos Config 把配置存在服务端,支持灰度发布与历史版本。刷新范围受 @RefreshScope 控制,没有标注的 bean 仍持有旧值。

## API 网关:统一入口

网关是外部流量的唯一入口,按路径、主机、请求头等条件把请求转发到后端服务,并在转发前后执行过滤器。鉴权、限流、跨域、访问日志集中在这一层,后端服务只处理业务。

Spring Cloud Gateway 的路由由三部分组成:id、目标 uri、断言(predicate)与过滤器(filter)。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - AddRequestHeader=X-Gateway, order
```

`lb://order-service` 表示不使用固定地址,交给负载均衡器从注册中心选一个实例。断言全部匹配才转发;过滤器可以在转发前修改请求,也可以在响应返回时修改响应。Gateway 基于 WebFlux 与 Netty,属于响应式栈,classpath 中同时存在 spring-boot-starter-web 时需要显式设置 `spring.main.web-application-type=reactive`,否则应用按 servlet 容器启动,网关路由不会生效。

## 负载均衡与声明式调用

Spring Cloud LoadBalancer 是客户端负载均衡:调用方从注册中心取得实例列表,按轮询或随机策略选一个,请求直接发往该实例,不经过额外代理。网关的 lb:// 与 Feign 都复用它。

OpenFeign 把 HTTP 调用写成接口。启动时为接口生成代理并注册为 bean,方法上的注解描述请求,调用方式与本地方法一致:

```java
@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/users/{id}")
    User findById(@PathVariable("id") long id);
}
```

服务名由 name 指定,LoadBalancer 负责选实例,返回值由消息转换器按 Content-Type 反序列化。Feign 适合服务之间的内部调用,对外接口仍由 Controller 暴露。

## 熔断、限流与链路追踪

Resilience4j 提供熔断、重试、舱壁与限流,Sentinel 提供控制台与规则动态下发,两者都可以通过 Spring Cloud CircuitBreaker 抽象接入。链路追踪由 Micrometer Tracing 采集 traceId 与 spanId,配合 OpenTelemetry 或 Zipkin 还原一次请求跨越的服务与耗时。

## 结构与版本

一个典型的调用链:

```text
客户端
  │ HTTPS
  ▼
API 网关 (Spring Cloud Gateway)
  │ lb://order-service
  ▼
order-service ──Feign──> user-service
  │                         │
  └── 注册中心 / 配置中心 ────┘
```

Spring Cloud 由一组项目组成,没有单一框架入口。各项目按 Release Train 统一发布,如 2023.0.x、2024.0.x,版本通过 spring-cloud-dependencies 的 BOM 导入,不在子模块里逐个指定:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-dependencies</artifactId>
      <version>2023.0.3</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

依赖管理(dependency-management)决定各组件的版本,Release Train 与 Spring Boot 版本有官方兼容表,升级时两边同步调整。只改一侧,常见结果是启动阶段报类缺失或方法签名不匹配。

服务之间能互相调用之后,数据最终仍要落到数据库。第 14 章从 JDBC 开始,依次讲连接池、MyBatis 与 JPA,把持久层补齐。

## 小结

- 微服务把方法调用变成网络调用,需要注册、配置、入口与可观测四类基础设施;
- 注册中心维护服务名与实例列表,Eureka、Nacos、Consul 是常见实现;
- 配置中心集中管理配置并按 profile 下发,刷新依赖 @RefreshScope;
- 网关按断言路由并执行过滤器,lb:// 交给 Spring Cloud LoadBalancer 选择实例;
- OpenFeign 用接口声明 HTTP 调用,Resilience4j 与 Sentinel 负责熔断限流;
- Spring Cloud 是项目集合,通过 BOM 统一版本,并与 Spring Boot 版本对齐。
