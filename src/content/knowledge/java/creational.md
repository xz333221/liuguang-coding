---
title: 创建型:工厂 / 单例 / 建造者
summary: '创建型模式把「用哪个类、创建几次、参数怎么装配」从调用方移出:工厂封装实现类的选择,单例保证全局唯一实例,建造者用链式调用装配多参数对象;判断依据是创建逻辑是否复杂、实例是否唯一、参数是否过多。'
category: java
node: java-patterns-creational
order: 82
level: 进阶
tags: [设计模式, 工厂方法, 抽象工厂, 单例, 建造者]
updated: 2026-11-19
mindmap: creational.mindmap.json
terms: ["object", "enum", "runtime"]
sources:
  - title: Refactoring Guru · 工厂方法
    url: https://refactoringguru.cn/design-patterns/factory-method
    note: 简单工厂、工厂方法与抽象工厂的层次对比。
  - title: Refactoring Guru · 单例
    url: https://refactoringguru.cn/design-patterns/singleton
    note: 单例的意图与多线程实现要点。
  - title: Refactoring Guru · 建造者
    url: https://refactoringguru.cn/design-patterns/builder
    note: 链式装配与 build 校验的分工。
---

上一篇的 JPA 通过 EntityManager 把对象与数据库表对应起来,实体的创建与持久化都由它接管。业务代码里同样有大量创建问题:该实例化哪个实现类、某个组件是否只允许一个实例、参数一多构造函数怎么读。这一篇讲创建型里最常用的三个模式:工厂、单例、建造者。

## 工厂:把选择实现类的地方收拢

工厂模式把对象的创建过程移到工厂类,调用方只依赖接口,不关心具体实现类。最简单的形式叫简单工厂:一个静态方法根据参数返回不同实现。

```java
interface Notifier { void send(String message); }
class SmsNotifier implements Notifier {
    public void send(String m) { System.out.println("短信: " + m); }
}
class MailNotifier implements Notifier {
    public void send(String m) { System.out.println("邮件: " + m); }
}
class NotifierFactory {
    static Notifier create(String channel) {
        return switch (channel) {
            case "sms" -> new SmsNotifier();
            case "mail" -> new MailNotifier();
            default -> throw new IllegalArgumentException("未知渠道: " + channel);
        };
    }
}
public class Main {
    public static void main(String[] args) {
        NotifierFactory.create("sms").send("订单已发货");   // 短信: 订单已发货
    }
}
```

简单工厂不是 GoF 的 23 个模式之一,只是一种集中创建的编码习惯。它的缺点在扩展:新增渠道要修改 switch,工厂与所有实现类绑在一起。工厂方法把创建延迟到子类,父类定义抽象的创建方法,每个子类决定实例化哪个产品,新增实现时只加一个工厂子类。抽象工厂再上一层,一个工厂负责创建一族配套产品,例如短信通知器与短信模板,切换供应商时整族替换。

| 形式 | 谁决定实例 | 新增实现的代价 | 适用场景 |
| --- | --- | --- | --- |
| 简单工厂 | 一个静态方法 | 修改工厂方法 | 实现少、分支稳定 |
| 工厂方法 | 每个工厂子类 | 新增工厂类,不改旧代码 | 一种产品、多种实现 |
| 抽象工厂 | 工厂实现类 | 新增整族实现 | 多个产品需要配套 |

业务里通常按支付渠道或通知渠道选择实现。只有一个实现、短期内也没有替换计划时,直接 new 更清楚,工厂只会增加一层间接调用。

## 单例:五种写法与差异

单例保证一个类在同一个类加载器内只有一个实例,并提供一个全局访问点。写法之间的差别集中在两点:何时创建,以及如何保证并发下仍然只有一个。饿汉式在类加载时创建实例:

```java
public class AppConfig {
    private static final AppConfig INSTANCE = new AppConfig();
    private final Map<String, String> values = new ConcurrentHashMap<>();
    private AppConfig() {}
    public static AppConfig getInstance() { return INSTANCE; }
    public void put(String key, String value) { values.put(key, value); }
    public String get(String key) { return values.get(key); }
}
```

JVM 保证类初始化只执行一次,饿汉式天然线程安全,代价是无法延迟创建。如果初始化依赖外部资源并抛出异常,类加载会失败,后续访问得到 ExceptionInInitializerError。

懒汉式把创建推迟到第一次调用,直接给 getInstance 加 synchronized 可以保证唯一,代价是每次读取都要竞争锁。静态内部类把实例放进 Holder,首次调用时 Holder 才加载,类初始化由 JVM 保证只执行一次,兼顾延迟与线程安全,也不需要额外的同步代码。

双重检查把锁缩小到第一次创建,实例字段必须声明为 volatile:

```java
public class LazyConfig {
    private static volatile LazyConfig instance;   // 必须 volatile
    private LazyConfig() {}
    public static LazyConfig getInstance() {
        if (instance == null) {
            synchronized (LazyConfig.class) {
                if (instance == null) {
                    instance = new LazyConfig();
                }
            }
        }
        return instance;
    }
}
```

`new LazyConfig()` 分成三步:分配内存、调用构造函数初始化对象、把引用赋给 instance。步骤 2 与 3 之间可能重排,另一条线程在第一次检查时看到 instance 非 null,拿到的却是初始化尚未完成的对象。volatile 禁止这一重排,并保证构造函数写入的字段对读线程可见,详见第 10 章。

枚举单例最稳:

```java
public enum Registry {
    INSTANCE;
    private final Map<String, String> values = new ConcurrentHashMap<>();
    public void put(String key, String value) { values.put(key, value); }
    public String get(String key) { return values.get(key); }
}
// 使用
Registry.INSTANCE.put("region", "cn-north");
System.out.println(Registry.INSTANCE.get("region"));   // cn-north
```

枚举常量的唯一性由 JVM 在类加载时保证。反射调用 Constructor.newInstance 创建枚举会抛 IllegalArgumentException;反序列化返回同一个常量;不需要手写同步。Effective Java 推荐这种写法,原因就是这三条都由语言与 JVM 兜底。

Spring 容器里的单例 Bean 与手写单例不同:作用域是每个容器一个实例,生命周期由容器管理,测试时可以替换实现。业务组件优先交给依赖注入,手写单例适合不依赖容器的工具与基础设施。

## 建造者:参数多时的装配

建造者把对象的装配拆成多个步骤,每一步返回建造者本身,最后由 build 产出一个不可变对象。它解决的是构造函数参数过长、顺序难记、可选参数混杂的问题。

```java
public final class HttpRequest {
    private final String url;
    private final String method;
    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
    }
    public String method() { return method; }
    public static class Builder {
        private final String url;
        private String method = "GET";
        public Builder(String url) { this.url = url; }
        public Builder method(String method) { this.method = method; return this; }
        public HttpRequest build() {
            if (url == null || url.isBlank()) {
                throw new IllegalArgumentException("url 不能为空");
            }
            return new HttpRequest(this);
        }
    }
}
```

调用方式是 `new HttpRequest.Builder(url).method("POST").build()`:每个 setter 返回 this,类型仍是 Builder,调用可以一直连下去。校验放在 build 阶段,保证产出的对象一定合法;字段设为 final,对象创建后不再变化。

Lombok 的 @Builder 在编译期生成同样的结构:静态 builder 方法、链式赋值、build 方法,运行时没有反射开销。默认值需要 @Builder.Default 标注,校验逻辑仍要自己写,@Builder 不负责。

```java
@Builder
public class OrderDTO {
    private final String orderId;
    @Builder.Default
    private final int retry = 3;
}
// OrderDTO dto = OrderDTO.builder().orderId("A1001").build();
```

参数只有两三个时,普通构造函数或静态工厂方法足够。建造者的价值在参数多、可选参数多、需要保证不可变的场景。

## 什么时候不该用

- 只有一个实现,也没有替换预期:直接 new,工厂只增加间接层;
- 参数少且都必填:构造函数更直接,建造者让调用链变长;
- 单例持有可变状态:所有调用方共享同一份数据,并发写仍要同步,优先交给容器管理;
- 模式本身不产生价值:它隔离的是变化,没有变化就没有收益,可读性优先。

## 小结

- 简单工厂集中创建,工厂方法把选择交给子类,抽象工厂创建配套的产品族;
- 饿汉式靠类加载保证唯一,懒汉式延迟创建但读取要加锁;
- 双重检查的实例字段必须 volatile,防止引用赋值与对象初始化重排;
- 静态内部类靠类加载实现延迟与线程安全,枚举单例还能防反射与反序列化破坏;
- 建造者用链式步骤装配多参数对象,build 时校验,Lombok @Builder 生成同构代码。
