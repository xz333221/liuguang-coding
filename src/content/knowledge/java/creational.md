---
title: 创建型:工厂 / 单例 / 建造者
summary: '创建型模式把「用哪个类、创建几次、参数怎么装配」从调用方手里拿走:工厂封装实现类的选择,单例保证全局唯一,建造者用链式调用装配多参数对象。单例有饿汉、双重检查、静态内部类、枚举四种写法,双重检查的实例字段必须 volatile;参数少时构造函数就够,别为了模式而模式。'
category: java
node: java-patterns-creational
order: 82
level: 进阶
tags: [设计模式, 工厂方法, 抽象工厂, 单例, 建造者]
updated: 2026-11-20
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

上一章在处理「数据从哪来、怎么存」,这一章换个角度:代码写成什么样,半年后还改得动。设计模式不是语法,是别人踩过坑之后总结的几种结构。这一篇只讲业务里真会反复用到的创建型三种。

## 工厂:把 new 收起来

最直接的动机是「同一个接口,不同场景用不同实现」。

```java
public interface PayChannel {
    void pay(BigDecimal amount);
}

class AlipayChannel implements PayChannel { /* ... */ }
class WechatChannel implements PayChannel { /* ... */ }
```

调用方如果自己 `new`,那么「加一种支付方式」就要改所有 new 的地方:

```java
// 简单工厂:一个方法按参数返回实现
public final class PayChannels {

    private static final Map<String, PayChannel> CHANNELS = Map.of(
            "alipay", new AlipayChannel(),
            "wechat", new WechatChannel());

    public static PayChannel of(String code) {
        PayChannel channel = CHANNELS.get(code);
        if (channel == null) {
            throw new IllegalArgumentException("不支持的支付渠道: " + code);
        }
        return channel;
    }
}
```

**简单工厂**就是一个返回实现的方法,不属于 GoF 23 种,但用得最多。加渠道只改这个 Map,调用方一行不动。

**工厂方法**把「创建哪个实现」交给子类决定:父类定义 `createChannel()` 抽象方法,子类各自返回自己的实现。它在框架里常见(比如 `BeanFactory`),业务代码里很少需要。

**抽象工厂**一次创建一族相互配套的产品,比如「界面主题要同时产出按钮、输入框、滚动条」。它的适用条件很窄:确实存在产品族,且必须成套使用。大多数项目里,它带来的复杂度超过收益。

## 单例:全局唯一

单例要解决三件事:唯一实例、延迟创建、线程安全。

```java
// 1. 饿汉:类加载时就建好,天然线程安全,不用同步
public class ConfigHolder {
    private static final ConfigHolder INSTANCE = new ConfigHolder();
    private ConfigHolder() {}
    public static ConfigHolder get() { return INSTANCE; }
}

// 2. 双重检查:延迟加载 + 少加锁,实例字段必须 volatile
public class Registry {
    private static volatile Registry instance;
    private Registry() {}
    public static Registry get() {
        if (instance == null) {
            synchronized (Registry.class) {
                if (instance == null) {
                    instance = new Registry();
                }
            }
        }
        return instance;
    }
}

// 3. 静态内部类:延迟加载由类加载机制保证,写法最干净
public class Cache {
    private Cache() {}
    private static class Holder {
        static final Cache INSTANCE = new Cache();
    }
    public static Cache get() { return Holder.INSTANCE; }
}

// 4. 枚举:防反射、防反序列化破坏,唯一推荐的「绝对单例」
public enum Clock {
    INSTANCE;
    public long now() { return System.currentTimeMillis(); }
}
```

`volatile` 那行不是装饰:`instance = new Registry()` 分三步(分配内存、初始化、赋值引用),JIT 可能重排成「先赋值引用、再初始化」,另一个线程看到非 null 就直接用了半成品对象。`volatile` 禁止这种重排。

注意:前三种写法都能被反射(`setAccessible(true)` 调私有构造)或反序列化破坏,枚举不会。写工具库时优先枚举或静态内部类。

**单例持可变状态时,它自己就成了共享变量**,该加的同步一点都不能少。很多人以为「单例 = 线程安全」,恰恰相反。

## 建造者:多参数装配

构造函数参数超过四个,调用方就开始数位置:

```java
new HttpRequest("https://api.x.com", "POST", 3000, 3, true, null, "utf-8");
```

错一个位置,编译照过,运行时行为全变。建造者把参数名写进调用里:

```java
public final class HttpRequest {

    private final String url;
    private final String method;
    private final int timeoutMs;
    private final Map<String, String> headers;

    private HttpRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.timeoutMs = b.timeoutMs;
        this.headers = Map.copyOf(b.headers);
    }

    public static Builder builder(String url) { return new Builder(url); }

    public static final class Builder {
        private final String url;
        private String method = "GET";
        private int timeoutMs = 3000;
        private final Map<String, String> headers = new HashMap<>();

        private Builder(String url) { this.url = Objects.requireNonNull(url); }

        public Builder method(String m) { this.method = m; return this; }
        public Builder timeout(int ms) { this.timeoutMs = ms; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }

        public HttpRequest build() {
            if (timeoutMs <= 0) {
                throw new IllegalArgumentException("timeout 必须为正数");
            }
            return new HttpRequest(this);
        }
    }
}
```

三个要点:每个 setter 返回 `this` 才能链式;`build()` 里做校验,把非法状态挡在对象出生之前;字段全 `final`,构造完就不可变。Lombok 的 `@Builder` 生成的是同构代码,理解手写版才知道它省掉了什么。

## 什么时候不用

模式的价值在「变化点」,没有变化点就是纯负担:

- 接口只有一个实现,近期也不会加实现 → 直接 `new`,别为了「以后可能扩展」加一层工厂;
- 参数两三个、类型还都不一样 → 构造函数够用,建造者反而多写几行;
- 单例只是为了「少传参数」→ 那是全局变量,先想想能不能用依赖注入替换;
- 需要多个实例、每个实例有自己的配置 → 单例是错的,用原型或工厂。

## 小结

- 简单工厂一个方法按参数返实现,加实现只改一处;工厂方法交给子类;抽象工厂管产品族,业务里少见;
- 单例四种写法:饿汉最简、双重检查要 `volatile`、静态内部类最均衡、枚举防反射与反序列化;
- 单例持可变状态时仍需同步,「单例」不等于「线程安全」;
- 建造者用于多参数装配:链式返回 `this`,`build()` 校验,产出不可变对象;
- 只有一个实现、参数又少时,直接 `new` 比套模式更好维护。

下一篇讲结构型:同样是把对象包起来,代理、装饰器、适配器的意图完全不同。
