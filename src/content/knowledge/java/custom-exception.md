---
title: 自定义异常与抛出时机
summary: '业务语义用自定义异常表达:继承 RuntimeException 表示编程/业务规则错误,继承 Exception 表示调用方必须面对的外部失败;抛出时机在边界校验与规则违反处,并用 cause 保留底层原因。'
category: java
node: java-exception-custom
order: 36
level: 进阶
tags: [自定义异常, 业务异常, 异常链, throws]
updated: 2026-11-18
mindmap: java-exception-custom.mindmap.json
terms: ["runtime", "reference-type"]
sources:
  - title: Oracle Java 教程 · Creating Exception Classes
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/creating.html
    note: 自定义异常继承选择与构造器设计的依据。
  - title: 菜鸟教程 · Java 异常处理
    url: https://www.runoob.com/java/java-exceptions.html
    note: 自定义异常示例与抛出时机的对照。
---

JDK 自带的异常描述的是通用失败(文件不存在、下标越界)。业务里的失败往往有自己的语义:"余额不足""订单已关闭""用户名已存在"。用 IllegalArgumentException 一律概括会丢失这些信息,这一篇讲如何定义自己的异常类型,以及在哪里抛。

## 继承谁:RuntimeException 还是 Exception

自定义异常的第一步是选父类,这决定了它是否 checked:

- 继承 `RuntimeException`(unchecked):表示**业务规则违反或编程错误**,调用方通常无法在编译期预知,也不应被强制逐层 catch。绝大多数业务异常选这条;
- 继承 `Exception`(checked):表示**调用方必须面对的外部失败**,希望编译器强制调用方处理。只有当你确实想强制契约时才选。

```java
public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String message) {
        super(message);
    }
}
```

## 带上业务字段与错误码

业务异常常需携带错误码与上下文,便于上层统一返回与前端展示:

```java
public class BusinessException extends RuntimeException {
    private final String code;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    public BusinessException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
```

错误码用常量或枚举集中管理,不要散落字符串字面量。

## 抛出时机:边界与规则违反处

异常应当在**发现问题的那一层**抛出,而不是传递到很远的地方才报错:

- 参数校验:方法入口检查入参,不合法立即抛 IllegalArgumentException 或业务异常;
- 业务规则:领域方法内判断规则,违反即抛,如扣款前余额不足;
- 外部失败:IO / 网络 / 数据库失败时,捕获底层异常并包装成本层语义的业务异常再抛。

```java
public void withdraw(long amount) {
    if (amount <= 0) {
        throw new IllegalArgumentException("金额必须为正:" + amount);
    }
    if (amount > balance) {
        throw new InsufficientBalanceException("余额不足,当前 " + balance);
    }
    balance -= amount;
}
```

把校验放在状态修改**之前**,保证对象不会处于半修改的中间状态。

## 异常链:用 cause 保留底层原因

包装底层异常时,务必把原异常作为 cause 传入,否则堆栈里只剩包装层,丢失根因:

```java
try {
    connection.commit();
} catch (SQLException e) {
    // 保留 cause:堆栈可追溯到 SQLException
    throw new BusinessException("TX_COMMIT_FAIL", "事务提交失败", e);
}
```

打印堆栈时会显示 `Caused by: java.sql.SQLException ...`,排查时能一路追到根因。只写 `throw new BusinessException(msg)` 而丢弃 e,是常见的信息丢失错误。

## 分层中的转换

底层技术异常(SQLException、IOException)不应直接泄漏到接口层。在边界处转换为本层语义:持久层抛 DataAccessException 之类,应用层转成 BusinessException,接口层统一捕获并映射为 HTTP 状态码与错误码。每层只暴露本层语义的异常。

## 小结

- 业务异常多继承 RuntimeException(unchecked);确需强制契约才继承 Exception;
- 携带错误码与上下文,错误码集中管理;
- 在边界校验与规则违反处抛出,且先校验后修改状态;
- 包装底层异常必须传 cause,保留根因堆栈;
- 分层边界转换异常语义,不让技术异常泄漏到接口层。

下一章进入泛型:让集合与工具方法在编译期就带上类型约束。