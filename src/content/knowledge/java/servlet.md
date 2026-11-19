---
title: Servlet 与请求生命周期:Boot 底下那层
summary: 'Servlet、Filter、Listener 是 Servlet 规范的三个角色,Tomcat 作为容器负责连接、HTTP 解析与线程调度;一次请求经 Filter 链进入 DispatcherServlet,再由 HandlerMapping 找到 @Controller 方法;Filter 属于容器层,HandlerInterceptor 属于 MVC 层。'
category: java
node: java-spring-servlet
order: 74
level: 深入
tags: [Servlet, Filter, DispatcherServlet, Tomcat]
updated: 2026-11-19
mindmap: servlet.mindmap.json
terms: ["protocol", "embedded-server"]
sources:
  - title: Jakarta Servlet Specification
    url: https://jakarta.ee/specifications/servlet/
    note: Servlet、Filter、Listener 与 ServletContext 的规范定义。
  - title: Spring Framework Reference · Web MVC
    url: https://docs.spring.io/spring-framework/reference/index.html
    note: DispatcherServlet 的分派流程与 HandlerInterceptor 的调用时机。
  - title: Spring Boot Reference · Web
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: 内嵌容器与 Servlet、Filter 注册方式。
---

上一篇把配置调到了目标环境,应用已经在目标端口监听。接口方法能被执行,前提是请求先被容器接收;从 TCP 连接到 Controller 方法之间,还有一层 Servlet 规范在工作。

## 三个角色:Servlet、Filter、Listener

Servlet 是运行在 Servlet 容器中的 Java 组件,接收 HTTP 请求并生成响应。业务代码通常不直接实现 Servlet 接口,而由 Spring MVC 的 DispatcherServlet 统一接管。

Filter 是请求链上的拦截组件,在请求到达 Servlet 之前、响应返回客户端之前执行,可以修改请求与响应、决定请求是否继续经过后续环节。Listener 监听容器事件,例如应用启动与销毁(ServletContextListener)、会话创建与失效(HttpSessionListener)。

容器(Tomcat、Jetty、Undertow)实现 Servlet 规范:监听端口、解析 HTTP 报文、维护线程池、管理 Servlet 生命周期。HTTP 是文本协议(protocol),请求行、请求头、空行与报文体都由容器解析,Spring 拿到的是已经封装好的 HttpServletRequest。

ServletContext 代表一个 Web 应用,全局唯一。它保存初始化参数与应用级属性,也是动态注册 Servlet、Filter 的入口,Spring Boot 的 RegistrationBean 最终就是向它注册。

## 一次请求的完整路径

```text
TCP 连接(或复用)
  → 容器解析请求行 / 头 / 体,匹配 Context 与 Servlet
  → Filter 链前置处理
  → DispatcherServlet
  → HandlerMapping 找到 Controller 方法
  → 参数绑定、方法执行、返回值处理(视图渲染或消息转换器写 JSON)
  → Filter 链后置处理
  → 写响应,连接归还连接池或关闭
```

顺序固定:Filter 在 DispatcherServlet 之前,拦截器在 DispatcherServlet 之后。判断一段逻辑该放在哪一层,先看它需不需要访问处理器信息。

## DispatcherServlet 与 @Controller

DispatcherServlet 是 Spring MVC 注册在 `/` 上的前端控制器,也是框架中唯一的 Servlet。它不处理具体业务,只做分派:

- HandlerMapping 根据 URL、请求方法、请求头找到处理器;
- HandlerAdapter 调用 @Controller 或 @RestController 的方法,完成参数绑定;
- 返回值由 ViewResolver 渲染视图,或由 HttpMessageConverter 序列化为 JSON。

@Controller 并未实现 Servlet 接口,它只是被扫描进容器的普通 bean,方法签名自由,返回值也不必是 Servlet 类型。这层间接让 Spring MVC 能提供注解路由、参数解析器与统一异常处理。

## Filter 与 HandlerInterceptor

两者都能在 Controller 前后插入逻辑,所处的层不同:

- Filter 属于 Servlet 规范,由容器调用,拿不到 HandlerMethod,能替换 request/response 对象,可作用于静态资源与其他 Servlet;
- HandlerInterceptor 属于 Spring MVC,由 DispatcherServlet 调用,能读取处理器方法、模型与异常,preHandle 返回 false 即终止后续调用。

执行顺序如下:

```text
Filter#doFilter(前置)
  → Interceptor#preHandle
    → Controller 方法
  → Interceptor#postHandle
  → Interceptor#afterCompletion
Filter#doFilter(后置)
```

多个 Filter 的顺序由 @Order 或注册顺序决定;多个 Interceptor 按注册顺序执行,postHandle 与 afterCompletion 逆序执行。

## 内嵌容器与注册方式

Spring Boot 把 Tomcat 作为依赖打进可执行 jar,启动时创建并启动容器,这类模式称为内嵌服务器(embedded-server)。部署只需要一个 jar,容器版本随应用管理;代价是不能像外置 Tomcat 那样让多个应用共享一个容器。

实现 Filter 接口并标注 @Component,Spring Boot 会把它注册到所有 URL:

```java
@Component
@Order(1)
public class TraceFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws IOException, ServletException {
        long start = System.currentTimeMillis();
        chain.doFilter(request, response);
        System.out.println(request.getMethod() + " " + request.getRequestURI()
                + " " + (System.currentTimeMillis() - start) + "ms");
    }
}
```

需要限制路径、指定 DispatcherType 或控制顺序时,用 FilterRegistrationBean 显式注册;Servlet 用 ServletRegistrationBean。显式注册的 Filter 不要再加 @Component,否则会被注册两次:

```java
@Bean
public FilterRegistrationBean<AuthFilter> authFilter() {
    FilterRegistrationBean<AuthFilter> registration =
            new FilterRegistrationBean<>(new AuthFilter());
    registration.addUrlPatterns("/api/*");
    registration.setOrder(2);
    return registration;
}
```

## 常见问题为什么出在这一层

- 过滤器不生效:路径不匹配最常见,`/api` 是精确匹配,只有 `/api/*` 才覆盖其下所有子路径;异步请求需要在注册时开启 asyncSupported 并使用 DispatcherType.ASYNC;请求经 forward 转发时默认不再经过 REQUEST 类型的 Filter。
- 拦截器顺序不对:顺序取决于注册顺序,不来自注解;多个 WebMvcConfigurer 各自注册时,实际顺序由配置类自身的排序决定,分散注册难以核对,统一在一处注册更可靠。
- 在 Filter 里读不到 Controller 的返回值:Filter 位于 DispatcherServlet 之外,响应体可能已经写出,也可能尚未生成;需要读取响应内容时用 ContentCachingResponseWrapper 包装。
- @ControllerAdvice 处理不到的异常:Filter 抛出的异常不经过 Spring MVC 的异常解析器,需要在 Filter 内部捕获并写响应。

## 小结

- Servlet 接收请求并生成响应,Filter 在其前后拦截,Listener 监听容器事件;
- 容器负责监听端口、解析 HTTP 协议、调度线程与管理生命周期;
- 一次请求依次经过 Filter 链、DispatcherServlet、HandlerMapping、Controller、消息转换器;
- Filter 属于容器层,Interceptor 属于 MVC 层,Filter 先执行,Interceptor 能访问处理器信息;
- Spring Boot 以内嵌服务器运行 Tomcat,FilterRegistrationBean 与 ServletRegistrationBean 控制注册细节。
