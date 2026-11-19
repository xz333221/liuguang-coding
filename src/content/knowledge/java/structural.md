---
title: 结构型:代理 / 装饰器 / 适配器
summary: '代理、装饰器与适配器都通过组合把一个对象包在另一个对象外面,接口关系相似而意图不同:代理控制对目标的访问,装饰器在不改接口的前提下叠加职责,适配器把不兼容的接口转换成调用方期望的形式。'
category: java
node: java-patterns-structural
order: 83
level: 进阶
tags: [设计模式, 代理, 装饰器, 适配器, 动态代理]
updated: 2026-11-19
mindmap: structural.mindmap.json
terms: ["object", "reference", "runtime"]
sources:
  - title: Refactoring Guru · 代理
    url: https://refactoringguru.cn/design-patterns/proxy
    note: 代理与目标同接口、控制访问的定位。
  - title: Refactoring Guru · 装饰器
    url: https://refactoringguru.cn/design-patterns/decorator
    note: 包装同类型组件并叠加职责的结构。
  - title: Refactoring Guru · 适配器
    url: https://refactoringguru.cn/design-patterns/adapter
    note: 类适配器与对象适配器的差异。
---

上一篇的工厂负责创建对象。对象创建之后,调用方与目标之间仍然可以插入一层:转发调用并加上控制逻辑,叠加额外职责,或者把一个不兼容的接口转换成期望的形式。这三种结构分别对应代理、装饰器与适配器。

## 代理:控制对目标对象的访问

代理模式为目标对象提供一个同接口的替身,调用方访问替身,替身决定何时、是否以及如何把调用转发给目标。静态代理需要为每个目标类手写一个代理类:

```java
interface UserService { String findName(long id); }
class UserServiceImpl implements UserService {
    public String findName(long id) { return "user-" + id; }
}
class UserServiceProxy implements UserService {
    private final UserService target;
    UserServiceProxy(UserService target) { this.target = target; }
    public String findName(long id) {
        long start = System.currentTimeMillis();
        String name = target.findName(id);
        System.out.println("耗时 " + (System.currentTimeMillis() - start) + " ms");
        return name;
    }
}
```

接口方法一多,代理类就要重复转发与增强逻辑。JDK 动态代理把转发集中到一个 InvocationHandler,在运行时生成实现指定接口的代理类:

```java
UserService target = new UserServiceImpl();
UserService proxy = (UserService) Proxy.newProxyInstance(
        UserService.class.getClassLoader(),
        new Class<?>[]{UserService.class},
        (p, method, args) -> {
            System.out.println("调用 " + method.getName());
            return method.invoke(target, args);
        });
System.out.println(proxy.findName(7));
// 调用 findName
// user-7
```

动态代理的完整机制在第 8 章讲过:必须有接口,代理类实现接口而不继承目标。Spring AOP 的事务、日志、权限检查都建立在这层结构上,容器返回的 Bean 往往是代理对象。

代理的应用场景是访问控制:权限校验、延迟加载、缓存命中、远程调用、调用耗时统计。业务语义仍由目标实现,代理只决定调用怎么到达目标。

## 装饰器:叠加职责而不改接口

装饰器模式让包装类实现与被包装对象相同的接口,持有一个同类型引用,在转发前后追加行为。多个装饰器可以嵌套,每种能力只由一个类负责。

```java
interface Coffee {
    String description();
    BigDecimal price();
}
class Espresso implements Coffee {
    public String description() { return "浓缩咖啡"; }
    public BigDecimal price() { return new BigDecimal("20.00"); }
}
abstract class CoffeeDecorator implements Coffee {
    protected final Coffee inner;
    protected CoffeeDecorator(Coffee inner) { this.inner = inner; }
}
class Milk extends CoffeeDecorator {
    Milk(Coffee inner) { super(inner); }
    public String description() { return inner.description() + " + 牛奶"; }
    public BigDecimal price() { return inner.price().add(new BigDecimal("3.00")); }
}
class Sugar extends CoffeeDecorator {
    Sugar(Coffee inner) { super(inner); }
    public String description() { return inner.description() + " + 糖"; }
    public BigDecimal price() { return inner.price().add(new BigDecimal("1.00")); }
}
Coffee coffee = new Sugar(new Milk(new Espresso()));
System.out.println(coffee.description());   // 浓缩咖啡 + 牛奶 + 糖
System.out.println(coffee.price());         // 24.00
```

Java IO 是这套结构最典型的应用。FileInputStream 负责读取字节,BufferedInputStream 在它外面叠加缓冲,DataInputStream 再叠加基本类型读取:

```java
new DataInputStream(new BufferedInputStream(new FileInputStream("a.bin")));
```

这与第 9 章的包装方式一致:每层只加一种能力,按需组合,关闭最外层即可释放全部资源。装饰器与代理的结构几乎相同,区别在于装饰器由调用方传入被包装对象,职责是增强;代理通常自己管理目标,职责是控制访问。

## 适配器:转换接口

适配器模式把一个类的接口转换成调用方期望的另一个接口,常用于兼容遗留代码、第三方 SDK 或单位与签名不同的外部服务。类适配器通过继承被适配者并实现目标接口完成转换:

```java
interface PayGateway { void pay(String orderId, BigDecimal amount); }
class LegacyPayApi {
    void doPay(String orderNo, long cents) {
        System.out.println("legacy pay " + orderNo + " " + cents + " 分");
    }
}
class LegacyPayClassAdapter extends LegacyPayApi implements PayGateway {
    public void pay(String orderId, BigDecimal amount) {
        doPay(orderId, amount.movePointRight(2).longValueExact());
    }
}
```

Java 只支持单继承,类适配器会占用唯一的继承位置,并且与被适配类耦合。对象适配器改为持有被适配者的引用:

```java
class LegacyPayAdapter implements PayGateway {
    private final LegacyPayApi api = new LegacyPayApi();
    public void pay(String orderId, BigDecimal amount) {
        long cents = amount.movePointRight(2).longValueExact();
        api.doPay(orderId, cents);
    }
}
// 使用
new LegacyPayAdapter().pay("A1001", new BigDecimal("99.50"));
// legacy pay A1001 9950 分
```

对象适配器可以传入被适配类的任意子类,也便于在测试中替换实例,实际项目里更常见。适配器只负责协议、单位、参数顺序的转换,业务规则仍留在调用方或目标实现里。把折扣计算、风控判断写进适配器,会让这层转换难以复用。

## 三者对照

三种模式都依赖接口加组合,类图接近,区别在意图:

| 模式 | 与目标的关系 | 意图 | 典型例子 |
| --- | --- | --- | --- |
| 代理 | 实现同一接口,通常自己持有或创建目标 | 控制访问 | 权限、缓存、远程调用、AOP |
| 装饰器 | 实现同一接口,被包装对象由外部传入 | 叠加职责 | BufferedInputStream、加料计价 |
| 适配器 | 实现目标接口,持有或继承被适配者 | 转换接口 | 遗留 SDK、支付网关、日志门面 |

判断方法很直接:调用方拿到对象后,行为是否应当与原对象一致?代理与装饰器都是,前者改变调用的到达方式,后者增加调用前后的行为;适配器不是,它让一个原本不能用的接口变得可用。

## 选择与边界

- 只是加日志、权限、缓存:用代理,一个拦截点覆盖全部方法;
- 需要任意组合、可叠加的能力:用装饰器,每种能力独立成类;
- 接口不兼容、来源不受控:用适配器,把差异限制在一层转换里;
- 接口本来可以修改:直接改接口,不要增加适配层;
- 装饰器层数过多会让调用栈变长,排查问题时先确认包装顺序。

## 小结

- 代理提供同接口替身,控制调用的到达方式,静态代理手写转发,动态代理集中拦截;
- JDK 动态代理基于接口,Proxy.newProxyInstance 配合 InvocationHandler 使用;
- 装饰器实现同一接口并持有同类型引用,按需嵌套,每层只加一种能力;
- Java IO 的包装流就是装饰器,与第 9 章的用法一致;
- 适配器转换接口与单位,对象适配器比类适配器灵活,只做转换不写业务规则;
- 三者结构相似,意图分别是控制访问、叠加职责、转换接口。
