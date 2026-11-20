---
title: Web 层：Controller / 参数绑定 / 统一返回
summary: '@RestController 组合 Controller+ResponseBody;@RequestMapping 族映射路由;@PathVariable/@RequestParam/@RequestBody 绑定参数;统一返回体与 @RestControllerAdvice 全局异常处理;校验 @Valid。'
category: java
node: java-spring-web
order: 72
level: 进阶
tags: [Controller, 参数绑定, 统一返回, 异常处理, 校验]
updated: 2026-11-18
mindmap: java-spring-web.mindmap.json
terms: ["spring-boot", "bean"]
sources:
  - title: Spring Framework Reference · Web MVC
    url: https://docs.spring.io/spring-framework/reference/web/webmvc.html
    note: DispatcherServlet、注解控制器与参数解析的官方依据。
  - title: Spring Framework Reference · Annotated Controllers
    url: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html
    note: 请求映射、方法参数与返回值的参照。
---

Web 层把 HTTP 请求转成方法调用、把结果转成响应。Spring MVC 用注解控制器完成路由、参数绑定、返回处理。这一篇讲 Controller 写法、参数绑定与统一返回/异常。

## 控制器与路由

```java
@RestController
@RequestMapping("/api/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @GetMapping("/{id}")
    public OrderVO get(@PathVariable Long id) { return service.get(id); }

    @PostMapping
    public OrderVO create(@Valid @RequestBody CreateOrderReq req) {
        return service.create(req);
    }

    @GetMapping
    public List<OrderVO> list(@RequestParam(defaultValue = "1") int page) {
        return service.list(page);
    }
}
```

- @RestController = @Controller + @ResponseBody,方法返回值直接序列化为 JSON(Jackson);
- @GetMapping/@PostMapping/@PutMapping/@DeleteMapping/@PatchMapping 映射 HTTP 方法;
- 类级 @RequestMapping 定前缀,方法级定子路径。

## 参数绑定

- @PathVariable:路径占位 /orders/{id};
- @RequestParam:查询串 ?page=1,可 defaultValue/required;
- @RequestBody:请求体 JSON 反序列化为对象;
- @RequestHeader / @CookieValue:头/Cookie;
- 无注解的简单类型默认按 @RequestParam,复杂对象默认按表单绑定(ModelAttribute)。

## 校验

@Valid/@Validated 触发 Bean Validation:DTO 字段加 @NotNull/@NotBlank/@Size/@Min/@Email 等;校验失败抛 MethodArgumentNotValidException,由全局异常处理转 400 + 字段错误。分组校验用 @Validated(Group.class)。

## 统一返回体

```java
record Result<T>(int code, String message, T data) {
    static <T> Result<T> ok(T data) { return new Result<>(0, "ok", data); }
    static Result<Void> fail(int code, String msg) { return new Result<>(code, msg, null); }
}
```

约定 code=0 成功,非 0 业务错误;HTTP 状态码与业务 code 分工:HTTP 表传输/资源状态(200/400/404/500),业务 code 表领域错误(库存不足/余额不够)。不要所有错误都 200+code,也不要滥用 500 表业务错误。

## 全局异常处理

```java
@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Result<Void> onValid(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return Result.fail(400, msg);
    }

    @ExceptionHandler(BizException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    Result<Void> onBiz(BizException e) { return Result.fail(e.getCode(), e.getMessage()); }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    Result<Void> onOther(Exception e) {
        log.error("unexpected", e);
        return Result.fail(500, "服务器内部错误");   // 不暴露堆栈给客户端
    }
}
```

@RestControllerAdvice = @ControllerAdvice + @ResponseBody,集中处理所有控制器异常,避免每方法 try-catch。未知异常记日志、对外只给通用提示,不泄漏内部细节。

## 小结

- @RestController 返回 JSON;@*Mapping 映射路由;
- 参数:PathVariable/RequestParam/RequestBody/Header;
- @Valid + Bean Validation 校验 DTO;
- 统一 Result(code/message/data),HTTP 状态与业务 code 分工;
- @RestControllerAdvice 集中异常,未知错误记日志不暴露堆栈。

下一篇讲配置管理与多环境:外部化配置优先级与 profile。