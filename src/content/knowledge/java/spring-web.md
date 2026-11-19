---
title: 'Web 层:Controller / 参数绑定 / 统一返回'
summary: 'Spring MVC 用 @RestController 把返回值序列化为 JSON,@GetMapping/@PostMapping 映射请求,@PathVariable/@RequestParam/@RequestBody 完成参数绑定,@Valid 触发校验,@RestControllerAdvice 统一异常与返回结构。'
category: java
node: java-spring-web
order: 72
level: 进阶
tags: [Spring MVC, Controller, 参数绑定, 统一返回, 参数校验]
updated: 2026-11-19
mindmap: spring-web.mindmap.json
terms: ["spring-boot", "bean", "binding"]
sources:
  - title: Spring Framework Reference · Web MVC
    url: https://docs.spring.io/spring-framework/reference/web/webmvc.html
    note: 控制器、映射、参数解析与异常处理的官方说明。
  - title: Spring Boot Reference Documentation
    url: https://docs.spring.io/spring-boot/reference/index.html
    note: Boot 对 Spring MVC 的自动配置与 Jackson 集成。
---

上一篇的自动配置把 Spring Boot Web 所需的 DispatcherServlet、消息转换器等组件以 Bean 的形式注册进容器。这一篇看一个 HTTP 请求如何进入 Controller,参数如何绑定,返回值如何统一。

## @Controller 与 @RestController

@Controller 声明的类返回视图名,由视图解析器渲染页面;方法上加 @ResponseBody 才把返回值写入响应体。@RestController 是 @Controller 与 @ResponseBody 的组合,类中所有方法都直接返回数据。

前后端分离的项目统一使用 @RestController,返回值由 Jackson 序列化为 JSON。

## 映射注解

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable long id) {
        return userService.get(id);
    }

    @PostMapping
    public UserResponse create(@RequestBody CreateUserRequest request) {
        return userService.create(request);
    }
}
```

@GetMapping、@PostMapping、@PutMapping、@DeleteMapping 是 @RequestMapping 指定 method 的简写。类上的 @RequestMapping 提供公共前缀。

## 参数绑定

参数绑定(binding)指把 HTTP 请求中的数据填入方法参数,常用注解:

| 注解 | 来源 | 示例 |
| --- | --- | --- |
| @PathVariable | URL 路径段 | /users/{id} |
| @RequestParam | 查询字符串或表单 | ?page=1 |
| @RequestBody | 请求体 | JSON 对象 |
| @RequestHeader | 请求头 | Authorization |

@RequestParam 的 required 默认为 true,缺少参数返回 400;要允许省略时设置 required = false 并给出 defaultValue。@RequestBody 依赖 Content-Type: application/json 与消息转换器,请求体为空时抛出 HttpMessageNotReadableException。

## 参数校验

在 DTO 字段上加 jakarta.validation 约束,方法参数上加 @Valid 触发校验:

```java
public record CreateUserRequest(
        @NotBlank String name,
        @Email String email,
        @Min(18) int age) {
}

@PostMapping
public UserResponse create(@Valid @RequestBody CreateUserRequest request) {
    return userService.create(request);
}
```

校验失败抛出 MethodArgumentNotValidException,默认返回 400。异常信息由 @RestControllerAdvice 统一处理。

## 统一返回体

接口返回固定结构,便于前端处理:

```java
public record ApiResponse<T>(int code, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(0, "ok", data);
    }
}

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiResponse<Void> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .findFirst()
                .orElse("invalid request");
        return new ApiResponse<>(400, message, null);
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiResponse<Void> handleNotFound(NotFoundException ex) {
        return new ApiResponse<>(404, ex.getMessage(), null);
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiResponse<Void> handleConflict(ConflictException ex) {
        return new ApiResponse<>(409, ex.getMessage(), null);
    }
}
```

@RestControllerAdvice 是 @ControllerAdvice 与 @ResponseBody 的组合,作用于所有 Controller。@ExceptionHandler 按异常类型匹配,越具体的类型优先。HTTP 状态码通过 @ResponseStatus 或 ResponseEntity 指定;业务码放在响应体,两者可以并存。

## Jackson 与状态码

返回值由 Jackson 序列化。public getter 或 record 组件构成 JSON 字段,字段名为属性名;@JsonIgnore 排除字段,@JsonProperty 改名。日期默认序列化为 ISO-8601 字符串,可用 spring.jackson.date-format 与 time-zone 调整。

状态码的选择:

- 200 查询与更新成功,201 创建成功并配合 Location 头,204 删除成功且无返回体;
- 400 参数错误或校验失败,404 资源不存在,409 状态冲突。

状态码表达 HTTP 层的结果,响应体中的 code 表达业务结果,前端先看状态码再看业务码。

## 完整流程:Controller → Service

Controller 只负责接收参数、调用 Service、包装返回值;业务规则放在 Service:

```java
@Service
public class UserService {
    private final UserRepository repository;

    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    public UserResponse get(long id) {
        return repository.findById(id)
                .map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("user " + id));
    }

    public UserResponse create(CreateUserRequest request) {
        if (repository.existsByEmail(request.email())) {
            throw new ConflictException("email exists");
        }
        User saved = repository.save(request.toEntity());
        return UserResponse.from(saved);
    }
}
```

Controller 方法保持简短,异常交给全局处理器,成功响应统一经过 ApiResponse 包装。事务边界、Repository 实现与数据库访问属于持久层,第 14 章展开。

下一篇讨论配置管理与多环境:application.yml 如何按 profile 拆分,配置项如何绑定到类型安全的属性类。

## 小结

- @RestController 组合 @Controller 与 @ResponseBody,返回值直接序列化为 JSON;
- @GetMapping/@PostMapping 是 @RequestMapping 的简写,类级注解提供公共前缀;
- @PathVariable、@RequestParam、@RequestBody、@RequestHeader 分别绑定路径、查询参数、请求体与请求头;
- @Valid 配合 jakarta.validation 约束校验入参,失败由全局处理器转换;
- @RestControllerAdvice + @ExceptionHandler 统一异常与响应结构,@ResponseStatus 指定状态码;
- Controller 只做参数与返回值处理,业务规则放在 Service。
