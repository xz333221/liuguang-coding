---
title: 行为型:策略 / 观察者 / 模板方法
summary: '策略把可替换的算法抽成接口，用 Map 注册、按 code 查表，替掉一大片 if-else；观察者维护一对多通知，Spring 的 ApplicationEvent + @EventListener 是现成实现，默认同步、异常会影响发布方；模板方法用 final 方法固定流程骨架，把变化步骤留给子类，JdbcTemplate 就是这么做的。分支少而稳定时，直接写 if-else 更好。'
category: java
node: java-patterns-behavioral
order: 84
level: 进阶
tags: [设计模式, 策略, 观察者, 模板方法, Spring 事件]
updated: 2026-11-20
mindmap: behavioral.mindmap.json
terms: ["dependency-injection", "bean", "spring-boot", "object"]
sources:
  - title: Refactoring Guru · 策略
    url: https://refactoringguru.cn/design-patterns/strategy
    note: 算法族抽取与上下文委托的结构。
  - title: Refactoring Guru · 观察者
    url: https://refactoringguru.cn/design-patterns/observer
    note: 发布者与订阅者之间的通知机制。
  - title: Spring Framework Reference · Application Events
    url: https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html
    note: ApplicationEventPublisher 与 @EventListener 的语义。
---

结构型管「对象怎么组装」，行为型管「对象之间怎么分工」。这一篇挑三个业务代码里出现频率最高的：策略替分支，观察者解耦通知，模板方法固定流程。

## 策略：把 if-else 换成查表

订单折扣的常见写法：

```java
public BigDecimal discount(Order order) {
    if ("NONE".equals(order.coupon())) {
        return order.amount();
    } else if ("FULL_100_MINUS_20".equals(order.coupon())) {
        return order.amount().subtract(new BigDecimal("20"));
    } else if ("VIP_10_PERCENT".equals(order.coupon())) {
        return order.amount().multiply(new BigDecimal("0.9"));
    }
    throw new IllegalArgumentException("未知优惠券");
}
```

每加一种券，这个方法长一截，还要改测试。策略把它拆成「接口 + 多个实现 + 一个查表」:

```java
public interface DiscountStrategy {
    String code();
    BigDecimal apply(BigDecimal amount);
}

@Component
public class FullReduction implements DiscountStrategy {
    public String code() { return "FULL_100_MINUS_20"; }
    public BigDecimal apply(BigDecimal amount) {
        return amount.compareTo(new BigDecimal("100")) >= 0
                ? amount.subtract(new BigDecimal("20")) : amount;
    }
}

@Component
public class VipDiscount implements DiscountStrategy {
    public String code() { return "VIP_10_PERCENT"; }
    public BigDecimal apply(BigDecimal amount) {
        return amount.multiply(new BigDecimal("0.9"));
    }
}
```

Spring 把所有实现注入进一个 `List`，启动时建成 Map:

```java
@Service
public class DiscountService {

    private final Map<String, DiscountStrategy> strategies;

    public DiscountService(List<DiscountStrategy> all) {
        this.strategies = all.stream()
                .collect(Collectors.toMap(DiscountStrategy::code, s -> s));
    }

    public BigDecimal discount(String code, BigDecimal amount) {
        DiscountStrategy s = strategies.get(code);
        if (s == null) {
            throw new IllegalArgumentException("未知优惠券: " + code);
        }
        return s.apply(amount);
    }
}
```

加一种券等于加一个类，`DiscountService` 一行不改，测试也只需要测新类。这是策略真正的收益：**改动被限制在一个新文件里**。

注意：策略适合「同一件事有多种算法，运行期选一种」。如果多个策略要串联(先满减再打折)，那是责任链或装饰器；如果状态会随事件变化，那是状态模式。

## 观察者：一件事，多方关心

下单成功后要做五件事：发短信、加积分、写审计日志、清缓存、推消息。全塞进 `placeOrder` 里，这个方法会越来越长，而且任何一件失败都可能影响主流程。

观察者把「主流程」和「副作用」分开：

```java
// 事件:一个不可变的记录,名字用过去式
public record OrderPlaced(long orderId, long userId, BigDecimal amount) {}

@Service
public class OrderService {

    private final ApplicationEventPublisher publisher;

    @Transactional
    public void place(PlaceCmd cmd) {
        long orderId = orderMapper.insert(cmd);
        publisher.publishEvent(new OrderPlaced(orderId, cmd.userId(), cmd.amount()));
    }
}

@Component
public class PointListener {

    @EventListener
    public void on(OrderPlaced event) {
        pointService.add(event.userId(), event.amount().intValue());
    }
}
```

发布方只认识事件，不认识任何监听者。加一个「发短信」的监听者，`OrderService` 不用改。

三个必须知道的细节：

1. **默认是同步的**。`publishEvent` 会依次调用所有监听器，监听器抛异常会传回发布方，把事务一起回滚。想异步要 `@Async`(需要 `@EnableAsync`)或 `@TransactionalEventListener(phase = AFTER_COMMIT)`;
2. **`@TransactionalEventListener` 默认在提交后才执行**。写在事务里的事件如果回滚了，监听器不会触发——这正是「订单没落库却发了短信」的解法；
3. **监听器里再发事件要小心循环**。A 监听 B 的事件、B 又发 A 的事件，会无限递归。

Spring 的事件机制是观察者的标准实现，自己写 `List<Listener>` 维护注册与遍历只在不能引入 Spring 时才需要。

## 模板方法：骨架固定，步骤可变

导入 Excel 的流程永远是：校验文件 → 读表头 → 逐行解析 → 分批入库 → 汇总结果。不同业务只有「解析一行」不一样。把骨架写在父类，变化点留给子类：

```java
public abstract class ExcelImporter<T> {

    public final ImportResult run(Path file) {          // final:骨架不许改
        validate(file);
        List<String> headers = readHeaders(file);
        List<T> rows = new ArrayList<>();
        for (Row row : readRows(file, headers)) {
            T item = parseRow(row);                    // 变化点
            if (item != null) rows.add(item);
        }
        int saved = saveAll(rows);
        return new ImportResult(rows.size(), saved);
    }

    protected void validate(Path file) {               // 钩子:默认实现,子类可覆盖
        if (!Files.isRegularFile(file)) {
            throw new IllegalArgumentException("文件不存在");
        }
    }

    protected abstract T parseRow(Row row);            // 必须实现

    protected abstract int saveAll(List<T> rows);
}

public class UserImporter extends ExcelImporter<User> {

    @Override
    protected User parseRow(Row row) {
        String name = row.get("姓名");
        return name == null || name.isBlank() ? null : new User(name, row.getInt("年龄"));
    }

    @Override
    protected int saveAll(List<User> rows) {
        userMapper.batchInsert(rows);
        return rows.size();
    }
}
```

三点设计意图：`run` 是 `final`，子类改不了顺序；`parseRow` / `saveAll` 抽象，必须实现；`validate` 有默认实现，是「可选覆盖的钩子」。

JDK 与 Spring 里到处是这个结构：`AbstractList`、`JdbcTemplate.execute`、`HttpServlet.service`(它固定了按方法分发到 `doGet` / `doPost` 的骨架)。第 3 章抽象类那篇讲的「公共流程在父类，变化步骤留子类」，就是模板方法。

代价是继承：子类被绑死在父类的流程上，骨架一变所有子类跟着受影响。所以只有当流程**稳定**时才用继承；流程本身还在变，用组合(把每一步抽成接口传进来)更灵活。

## 适用边界

- 分支只有两三个、且长期不变 → 直接写 if-else，策略类只会让人多跳几个文件；
- 通知方只有一两个、且必须强一致 → 直接调用方法，事件机制的价值在「一对多 + 解耦」;
- 骨架还在频繁调整 → 用组合而非模板方法；
- 需要「多个策略依次尝试，任一成功即止」→ 那是责任链，不是策略。

## 小结

- 策略：接口 + 多实现 + Map 查表，替掉长 if-else，新增一种只加一个类；
- 观察者：发布方只发事件，Spring 用 `ApplicationEventPublisher` + `@EventListener`，默认同步、异常影响发布方，提交后执行用 `@TransactionalEventListener`;
- 模板方法：`final` 骨架 + 抽象步骤 + 可选钩子，`JdbcTemplate` / `HttpServlet` 都是这个结构；
- 三者都在处理「变化」，变化点在哪就用哪个；没有变化点时，简单写法更值得维护。

第 15 章结束。下一章往业务架构走：限界上下文、聚合，把业务规则关进模型里。
