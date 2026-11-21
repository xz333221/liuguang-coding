---
title: Optional 与空值处理
summary: 'Optional 是"返回值可能为空"的容器：of/ofNullable/empty 创建，map/flatMap/filter 转换，orElse/orElseGet/orElseThrow 取值；不要用作字段/参数/集合元素，避免 isPresent+get 反模式。'
category: java
node: java-functional-optional
order: 48
level: 进阶
tags: [Optional, 空值, orElse, orElseGet]
updated: 2026-11-18
mindmap: java-functional-optional.mindmap.json
terms: ["null", "reference-type", "runtime"]
sources:
  - title: java.util.Optional javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html
    note: Optional 定位、API 与使用建议的依据。
  - title: Oracle Java 教程 · Aggregate Operations(Optional 用例)
    url: https://docs.oracle.com/javase/tutorial/collections/streams/index.html
    note: findFirst 返回 Optional 的上下文参照。
---

null 是 Java 里最常见的运行时异常来源之一。Optional 不消灭 null，而是把"这个返回值可能没有"写进**类型**，让调用方无法忽略空的可能。这一篇讲它的正确用法与边界。

## 定位：返回值的容器

Optional<T> 是一个最多装一个非 null 值的容器。设计意图是**方法返回类型**，表达"可能查不到":

```java
public Optional<User> findById(long id) {
    User u = dao.get(id);
    return Optional.ofNullable(u);   // u 为 null 时返回 empty
}
```

调用方拿到 Optional 就必须面对"空"的分支，而不是无意中 dereference null。

## 创建

- `Optional.of(v)`:v 必须非 null，否则抛 NPE;
- `Optional.ofNullable(v)`:v 可 null,null 则 empty;
- `Optional.empty()`:显式空。

## 转换：map / flatMap / filter

```java
Optional<String> name = findById(1)
        .map(User::getName)          // 有值则转换,空则保持 empty
        .filter(s -> !s.isBlank());  // 不满足则变 empty
```

map 的函数若本身返回 Optional，用 flatMap 避免嵌套 Optional<Optional<T>>。

## 取值：orElse / orElseGet / orElseThrow / ifPresent

```java
String n1 = opt.orElse("default");          // 空则给默认值
String n2 = opt.orElseGet(() -> load());    // 空才调用 supplier(惰性)
String n3 = opt.orElseThrow();              // 空则抛 NoSuchElementException
String n4 = opt.orElseThrow(() -> new BizException("NOT_FOUND"));
opt.ifPresent(v -> System.out.println(v));  // 有值才消费
opt.ifPresentOrElse(v -> use(v), () -> log());  // JDK9,两分支
```

**orElse 与 orElseGet 的关键区别**:orElse 的参数**无论是否为空都会求值**;orElseGet 的 supplier 只在空时调用。默认值构造昂贵(查库、新建对象)时用 orElseGet，避免白白执行：

```java
// 错误:即使 opt 有值, expensive() 也会执行
opt.orElse(expensive());
// 正确:仅空时执行
opt.orElseGet(() -> expensive());
```

## 反模式：不要这样用

- **isPresent + get**:等价于 null 检查还更啰嗦，失去 Optional 意义；用 map/orElse/ifPresent 替代；
- **用作字段**:Optional 不可序列化，作字段增加负担；字段用可空类型 + 文档说明；
- **用作方法参数**:调用方被迫包装，重载爆炸；参数用可空类型或重载；
- **用作集合元素/Map 值**:Optional 不是为容器元素设计，嵌套难读；
- **get() 不检查**:空时抛异常，与 null dereference 无异。

Optional 是**返回值**的语义工具，不是通用的"null 替代品"。

## 与 null 检查的取舍

内部私有方法、局部变量，直接 null 检查更简洁；对外 API 的"可能查不到"返回值用 Optional 表达契约。基本类型用 OptionalInt/OptionalLong/OptionalDouble 避免装箱。

## 小结

- Optional 表达"返回值可能为空"，迫使调用方处理空分支；
- of(非 null)/ofNullable(可 null)/empty 创建；
- map/flatMap/filter 转换，orElse/orElseGet/orElseThrow/ifPresent 取值；
- orElse 立即求值、orElseGet 惰性，昂贵默认值用后者；
- 不用作字段/参数/集合元素；避免 isPresent+get;
- 对外返回用 Optional，内部局部用 null 检查即可。

下一章进入反射与注解：框架如何在运行时读取你的类。