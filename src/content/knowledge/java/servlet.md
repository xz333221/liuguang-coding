---
title: Servlet 与请求生命周期:Boot 底下那层
summary: 'Servlet 规范有三个角色:Servlet 处理请求生成响应、Filter 在请求链上拦截、Listener 监听容器事件;Tomcat 是实现规范的容器,负责连接、HTTP 解析与线程调度,一个应用一个 ServletContext;一次请求经 Filter 链进入 DispatcherServlet,由 HandlerMapping 找到 Controller 方法;Filter 在容器层,HandlerInterceptor 在 MVC 层。'
category: java
node: java-spring-servlet
order: 74
level: 深入
tags: [Servlet, Filter, DispatcherServlet, Tomcat]
updated: 2026-11-20
mindmap: servlet.mindmap.json
terms: ["protocol", "embedded-server", "spring-boot"]
sources:
  - title: Jakarta Servlet Specification
    url: https://jakarta.ee/specifications/servlet/
    note: Servlet、Filter、Listener 与 ServletContext 的规范定义。
  - title: Spring Framework Reference · DispatcherServlet
    url: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html
    note: 分派流程、HandlerMapping 与拦截器的调用时机。
  - title: Spring Boot Reference · Servlet Web Applications
    url: https://docs.spring.io/spring-boot/reference/web/servlet.html
    note: 内嵌容器与 Servlet、Filter 的注册方式。
---

前面几篇里,`@RestController` 一挂就能收请求,可从头到尾没提过 HTTP 连接是谁接受的、报文是谁解析的。这层东西叫 Servlet 容器,Spring Boot 只是把它塞进了 jar 里。这一篇往下看一眼,弄清请求从 socket 到方法调用之间发生了什么。

## 规范的三个角色

Servlet 规范定义了三个可插拔的组件:

- **Servlet**:接收请求、生成响应。你写的每个 Controller,最终都由一个 Servlet(`DispatcherServlet`)接手;
- **Filter**:在请求进入 Servlet 之前、响应离开之后做拦截,能改请求头、能直接返回、能放行或拦住;
- **Listener**:监听容器事件,比如应用启动、session 创建销毁、属性变更。

三者都注册在 `ServletContext` 上。可以把它理解成一个应用的「公共抽屉」:容器启动时按配置把 Servlet、Filter、Listener 放进去,请求来了按路径取对应的 Servlet。

## 容器:Tomcat 做了什么

Tomcat、Jetty、Undertow 都是 Servlet 规范的实现。它们干的活比想象中多:

- 监听端口,接受 TCP 连接,把字节流解析成 `HttpServletRequest`;
- 管理线程池,每个请求分配一个工作线程,处理完归还;
- 按 URL 找到匹配的 Servlet 并调用 `service()`;
- 把 `HttpServletResponse` 里的状态码、头、body 序列化回字节流。

`ServletContext` 一个应用一个,和进程同生共死;`HttpSession` 一个会话一个,靠 Cookie 里的 `JSESSIONID` 认人。

Spring Boot 的「内嵌服务器」不是新东西,只是把 Tomcat 当普通依赖打进 jar,启动时在 `main` 里创建,不用再装外置 Tomcat、再丢一个 war 进去。所以 `java -jar app.jar` 就能跑,端口由 `server.port` 决定。

## 一个请求的完整路径

```
浏览器 → TCP 连接
       → Tomcat 解析 HTTP 报文
       → Filter 链(编码、鉴权、日志……)
       → DispatcherServlet
       → HandlerMapping 找到 @GetMapping 方法
       → HandlerInterceptor.preHandle
       → 参数解析 + 方法调用
       → HttpMessageConverter 把返回值写成 JSON
       → 逆序走 Filter 后置逻辑
       → 响应字节流回浏览器
```

链路上任何一环都能改写结果:Filter 里直接 `response.getWriter().write(...)` 然后 `return`,请求就不会往下走;拦截器 `preHandle` 返回 `false` 也一样能让 Controller 不被调用。

## 手写一个 Servlet

用了 Boot 之后基本不写 Servlet 了,但写一个能看清这层是什么:

```java
public class HelloServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String name = req.getParameter("name");
        resp.setContentType("text/plain;charset=UTF-8");
        resp.getWriter().write("hello, " + name);
    }
}
```

注册方式两种。原生写法是 `@WebServlet("/hello")` 加 `@ServletComponentScan`;Boot 风格是用 `ServletRegistrationBean`:

```java
@Bean
ServletRegistrationBean<HelloServlet> hello() {
    return new ServletRegistrationBean<>(new HelloServlet(), "/hello");
}
```

注意:`HttpServlet` 的 `service()` 会按请求方法分发到 `doGet` / `doPost`,你重写哪个就只支持哪个,没重写的返回 405。

## Filter:容器层的拦截

Filter 比 Servlet 更常用。统一编码、请求日志、JWT 校验这些「所有请求都要过一遍」的事,放这里最合适:

```java
@Component
public class TraceFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp,
                                    FilterChain chain) throws IOException, ServletException {
        String traceId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("traceId", traceId);          // 日志带上它,一条请求的日志能串起来
        resp.setHeader("X-Trace-Id", traceId);
        try {
            chain.doFilter(req, resp);        // 放行,交给下一个 Filter 或 Servlet
        } finally {
            MDC.remove("traceId");
        }
    }
}
```

`@Component` 注册的 Filter 默认对所有路径生效。要控制路径和顺序,用 `FilterRegistrationBean`:

```java
@Bean
FilterRegistrationBean<TraceFilter> traceFilter() {
    var bean = new FilterRegistrationBean<>(new TraceFilter());
    bean.addUrlPatterns("/api/*");
    bean.setOrder(1);      // 数字越小越靠前
    return bean;
}
```

用 `OncePerRequestFilter` 而不是直接实现 `Filter`,是因为请求可能被 forward 或 include 再次经过同一条链,前者保证一次请求只执行一遍。

## Filter 与 Interceptor 的分工

两者都能拦请求,位置不同:

| | Filter | HandlerInterceptor |
| --- | --- | --- |
| 所属层 | Servlet 容器 | Spring MVC |
| 能拿到什么 | `HttpServletRequest` / `Response` | 还能拿到 handler 方法、`ModelAndView` |
| 典型用途 | 编码、CORS、traceId、JWT | 登录态校验、权限注解、记录业务日志 |
| 能否拿到 Spring Bean | 注册为 Bean 时可以 | 本来就是 Bean |
| 顺序 | 在 DispatcherServlet 之前 | 在 DispatcherServlet 之后 |

判断标准:和 HTTP 报文打交道、要包住整个 MVC 流程的用 Filter;需要知道「这次要调哪个方法」「方法上有没有某个注解」的用 Interceptor。

## 小结

- Servlet 规范三个角色:`Servlet` 处理请求、`Filter` 拦截链路、`Listener` 监听事件,都注册在 `ServletContext`;
- Tomcat 负责连接、HTTP 解析、线程调度和 URL 匹配,`ServletContext` 一应用一个,`HttpSession` 一会话一个;
- 内嵌服务器就是把 Tomcat 打成依赖,`main` 里启动,不用外置容器;
- 请求链路:连接 → 解析 → Filter 链 → DispatcherServlet → HandlerMapping → Interceptor → Controller → 消息转换器;
- Filter 在容器层(编码、CORS、traceId),Interceptor 在 MVC 层(能拿 handler 与注解);
- 注册:Servlet 用 `ServletRegistrationBean`,Filter 用 `@Component` 或 `FilterRegistrationBean` 控路径与顺序。

第 13 章到这里。下一篇把视角拉到系统之间:微服务里注册中心、配置中心、网关各自解决什么问题。
