---
title: 行为型:策略 / 观察者 / 模板方法
summary: '策略把可替换的算法抽成接口并由调用方选择,观察者在状态变化时通知多个监听者,模板方法在抽象类中固定流程骨架、把步骤留给子类;三者分别处理算法替换、变化通知与流程复用。'
category: java
node: java-patterns-behavioral
order: 84
level: 进阶
tags: [设计模式, 策略, 观察者, 模板方法, Spring 事件]
updated: 2026-11-19
mindmap: behavioral.mindmap.json
terms: ["dependency-injection", "bean", "spring-boot", "object"]
sources:
  - title: Refactoring Guru · 策略
    url: https://refactoringguru.cn/design-patterns/strategy
    note: 算法族抽取与上下文委托的结构。
  - title: Refactoring Guru · 观察者
    url: https://refactoringguru.cn/design-patterns/observer
    note: 发布者与订阅者之间的通知机制。
  - title: Refactoring Guru · 模板方法
    url: https://refactoringguru.cn/design-patterns/template-method
    note: 骨架方法与钩子方法的分工。
---

上一篇的结构型模式处理对象之间的组合。对象之间的调用与协作也有固定套路:把可替换的算法抽出来,把状态变化通知给多方,把固定流程的骨架与变化步骤分开。这一篇是第 15 章的最后一篇,讲策略、观察者与模板方法。

## 策略:把分支抽成对象

策略模式把一组可互换的算法各自封装成类,它们实现同一个接口,调用方持有一个策略引用,在运行时决定用哪一个。结算折扣是常见场景,用 if-else 堆叠时,新增规则要修改原方法,每加一条分支都要回归全部旧逻辑:

```java
interface DiscountStrategy { String code(); BigDecimal apply(BigDecimal price); }
class VipDiscount implements DiscountStrategy {
    public String code() { return "vip"; }
    public BigDecimal apply(BigDecimal price) { return price.multiply(new BigDecimal("0.85")); }
}
class FullReduction implements DiscountStrategy {
    public String code() { return "full200"; }
    public BigDecimal apply(BigDecimal price) {
        return price.compareTo(new BigDecimal("200")) >= 0 ? price.subtract(new BigDecimal("20")) : price;
    }
}
class DiscountRegistry {
    private final Map<String, DiscountStrategy> strategies = new HashMap<>();
    DiscountRegistry(List<DiscountStrategy> list) {
        for (DiscountStrategy s : list) { strategies.put(s.code(), s); }
    }
    BigDecimal calculate(String code, BigDecimal price) {
        DiscountStrategy strategy = strategies.get(code);
        if (strategy == null) { throw new IllegalArgumentException("未知折扣: " + code); }
        return strategy.apply(price);
    }
}
// 使用
DiscountRegistry registry = new DiscountRegistry(List.of(new VipDiscount(), new FullReduction()));
System.out.println(registry.calculate("vip", new BigDecimal("100.00")));       // 85.00
System.out.println(registry.calculate("full200", new BigDecimal("260.00")));   // 240.00
```

用 Map 按 code 注册策略,分支判断变成一次查表。新增策略只需新增实现类并注册,原来的 calculate 不改。

在 Spring 中,注册过程由容器完成:一个接口的全部实现都是 Bean,构造参数声明 `List<DiscountStrategy>` 即可收到所有实现,再转成 Map 保存:

```java
@Component
class DiscountRegistry {
    private final Map<String, DiscountStrategy> strategies;
    DiscountRegistry(List<DiscountStrategy> strategies) {   // 注入全部实现
        this.strategies = strategies.stream()
                .collect(Collectors.toMap(DiscountStrategy::code, Function.identity()));
    }
}
```

这里用到第 13 章的依赖注入:新增一个带 @Component 的策略类,容器自动把它加入列表,注册表代码无需修改。策略类自身还可以注入 Repository、远程客户端等依赖,这是纯 if-else 做不到的。

策略适合分支会持续增长、每个分支有独立逻辑或独立依赖、需要单独测试的场景。分支只有两三条且长期稳定时,if-else 更直观,拆成类反而增加文件数量与跳转成本。策略与状态模式的区别可以概括为一句话:策略由调用方选定后保持不变,状态由对象内部随事件切换。

## 观察者:变化发生时通知多方

观察者模式定义一对多依赖:目标对象维护一组监听者,自身状态变化时逐个调用监听者的回调方法。监听者只依赖回调接口,发布方不需要知道具体有哪些订阅者。

Java 早期的 java.util.Observer 与 Observable 从 JDK 9 起标记为 @Deprecated,原因是 Observable 是类而非接口,难以组合,通知顺序与并发语义也没有明确约定。现在通常直接定义一个监听器接口:

```java
interface OrderListener { void onPaid(String orderId); }
class OrderService {
    private final List<OrderListener> listeners = new CopyOnWriteArrayList<>();
    void register(OrderListener listener) { listeners.add(listener); }
    void pay(String orderId) {
        System.out.println("订单 " + orderId + " 支付成功");
        for (OrderListener listener : listeners) { listener.onPaid(orderId); }
    }
}
// 使用
OrderService service = new OrderService();
service.register(id -> System.out.println("发放积分: " + id));
service.register(id -> System.out.println("发送短信: " + id));
service.pay("A1001");
// 订单 A1001 支付成功
// 发放积分: A1001
// 发送短信: A1001
```

监听器列表用 CopyOnWriteArrayList,注册与遍历可以并发进行,遍历期间新增的监听器不会影响当前这一轮通知。

Spring 把观察者做成了事件机制。发布方注入 ApplicationEventPublisher,监听方用 @EventListener 标注方法,事件类型就是参数类型:

```java
record OrderPaidEvent(String orderId) {}
@Component
class PointsListener {
    @EventListener
    public void onPaid(OrderPaidEvent event) {
        System.out.println("发放积分: " + event.orderId());
    }
}
@Service
class OrderService {
    private final ApplicationEventPublisher publisher;
    OrderService(ApplicationEventPublisher publisher) { this.publisher = publisher; }
    void pay(String orderId) { publisher.publishEvent(new OrderPaidEvent(orderId)); }
}
```

Spring Boot 启动时,Spring 容器会扫描 @EventListener,把方法注册到事件广播器,发布方与监听方互不引用。默认通知是同步的,监听器抛出的异常会传回发布方,影响主流程;需要异步时给监听方法加 @Async 并配置线程池;需要在事务提交后才执行,用 @TransactionalEventListener。监听器数量多、跨模块时用事件解耦,同一模块内两三处回调,显式接口更便于跟踪。

## 模板方法:固定骨架,变化留给子类

模板方法在抽象类中定义一个算法的骨架,把某些步骤声明为抽象方法,由子类实现。骨架方法的执行顺序固定,子类只能替换步骤内容。

```java
abstract class ReportExporter {
    public final String export(List<String> rows) {   // final 防止子类改动顺序
        StringBuilder sb = new StringBuilder(header()).append('\n');
        for (String row : rows) { sb.append(format(row)).append('\n'); }
        return sb.append(footer()).toString();
    }
    protected abstract String header();
    protected abstract String format(String row);
    protected String footer() { return "--- end ---"; }   // 钩子,子类可选覆写
}
class CsvExporter extends ReportExporter {
    protected String header() { return "id,name"; }
    protected String format(String row) { return row.replace('|', ','); }
}
public class Main {
    public static void main(String[] args) {
        System.out.print(new CsvExporter().export(List.of("1|张三", "2|李四")));
        // id,name
        // 1,张三
        // 2,李四
        // --- end ---
    }
}
```

骨架方法声明为 final,避免子类破坏步骤顺序;抽象方法强制子类补齐差异;钩子方法给出默认实现,子类按需覆写。这三类方法的分工是模板方法的核心。

JdbcTemplate 是这套结构在框架里的应用。第 14 章手写 JDBC 时,获取连接、创建 PreparedStatement、遍历 ResultSet、转换异常、在 finally 中释放资源都是重复代码。JdbcTemplate 把这些固定步骤放进模板,调用方只提供 SQL 与 RowMapper:

```java
List<User> users = jdbcTemplate.query(
        "select id, name from user where age > ?",
        (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name")),
        18);
```

SQL 与行映射是变化点,连接与异常处理是稳定骨架,两者被拆开。Spring 用回调实现变化点,避免继承;抽象类版本用子类实现,两种方式解决的问题相同。

模板方法依赖继承,子类与父类的骨架强耦合,骨架一改所有子类都受影响。骨架稳定、步骤顺序必须统一时适合使用;步骤之间可以自由组合时,策略或回调更灵活。

## 小结

- 策略把可替换的算法抽成接口,用 Map 注册或由 Spring 注入全部实现,调用方按 key 选择;
- 策略适合分支持续增长且各有独立依赖的场景,分支少而稳定时 if-else 更直接;
- java.util.Observer 已过时,监听器接口或 Spring 的 ApplicationEvent 是当前做法;
- Spring 事件默认同步,监听器异常会影响发布方,异步与事务后处理需要额外注解;
- 模板方法用 final 骨架固定步骤顺序,抽象方法提供变化点,JdbcTemplate 是框架中的实例。

第 15 章到这里结束。下一篇进入第 16 章,用限界上下文、聚合根与值对象把业务规则组织成可维护的领域模型。
