---
title: 值对象与领域事件
summary: '值对象没有独立身份：不可变、按属性值相等、方法没有副作用，Java 用 record 表达，紧凑构造器里做校验；金额用 BigDecimal 封装成带币种的 Money，运算返回新对象。领域事件描述已经发生的事实，用过去式命名，带事件 ID 与发生时间，由聚合收集、应用服务在事务提交后发布，消费方按事件 ID 幂等。'
category: java
node: java-ddd-value-object
order: 87
level: 深入
tags: [DDD, 值对象, 领域事件, record, BigDecimal]
updated: 2026-11-20
mindmap: value-object-event.mindmap.json
terms: ["value-object", "domain-event", "record", "bigdecimal"]
sources:
  - title: Martin Fowler · DomainEvent
    url: https://martinfowler.com/bliki/DomainEvent.html
    note: 领域事件的定义与发布方式。
  - title: Oracle Java · Record
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html
    note: record 自动生成成员与不可变约束。
  - title: Spring Framework Reference · Application Events
    url: https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html
    note: ApplicationEventPublisher 与事务事件监听。
---

上一篇的聚合根里，金额用的是 `BigDecimal`,SKU 用的是 `String`。都能跑，但传参时很容易错位：两个 `String`(sku、地址)、两个 `BigDecimal`(金额、折扣)，编译器分不出区别。这一篇讲怎么用值对象把这些「裸类型」包起来，以及聚合之间怎么用事件通信。

## 值对象：没有身份，只有值

三条特征：

- **不可变**:创建后不能改，要改就造一个新的；
- **按属性值相等**:两个 `Money(100, CNY)` 是同一个值；
- **无副作用**:`plus` 返回新对象，不改自己。

Java 用 `record` 写最省事：

```java
public record Sku(String value) {

    public Sku {                                   // 紧凑构造器:只写校验
        if (value == null || !value.matches("[A-Z0-9-]{6,20}")) {
            throw new IllegalArgumentException("非法的 SKU: " + value);
        }
    }
}
```

`record` 自动生成 `equals` / `hashCode` / `toString`，字段是 `final`，天然不可变。紧凑构造器不写参数列表，校验逻辑在这里执行，赋值由编译器补。

与 `Sku` 相关的非法状态，从「运行到某个分支才发现」变成了「根本造不出来」。这是值对象最大的收益：**校验只有一处，一旦通过，后面所有代码都可以放心**。

## Money:金额必须带币种

`BigDecimal` 单独出现永远有歧义：100 元还是 100 分？人民币还是美元？

```java
public record Money(BigDecimal amount, Currency currency) {

    public Money {
        Objects.requireNonNull(amount);
        Objects.requireNonNull(currency);
        amount = amount.setScale(2, RoundingMode.HALF_UP);      // 统一精度
    }

    public static Money cny(String v) {
        return new Money(new BigDecimal(v), Currency.CNY);
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(amount.add(other.amount), currency);
    }

    public Money times(int qty) {
        return new Money(amount.multiply(BigDecimal.valueOf(qty)), currency);
    }

    private void requireSameCurrency(Money other) {
        if (currency != other.currency) {
            throw new IllegalArgumentException("币种不一致");
        }
    }
}
```

三个细节值得注意：

1. **构造时统一精度**。`new BigDecimal("1.0")` 和 `new BigDecimal("1.00")` 用 `equals` 比较是不相等的——它们的 scale 不同。在构造器里 `setScale(2)` 一劳永逸；
2. **运算返回新对象**。`plus` 不改 `this`，所以一个 `Money` 实例可以安全地被多个线程、多个订单共享；
3. **运算前校验币种**。人民币加美元直接抛异常，比悄悄算出一个错数字好。

第 3 章 `BigDecimal` 那篇讲过 `double` 的精度问题，值对象是把这个知识点落到业务模型上的方式。

## 领域事件：已经发生的事实

领域事件描述**过去发生的事**，命名用过去式：`OrderPlaced`、`PaymentRefunded`、`StockDeducted`。不用 `PlaceOrder`(那是命令)，不用 `OrderEvent`(太泛)。

```java
public record OrderPaid(
        String eventId,
        long orderId,
        Money paidAmount,
        Instant occurredAt) {

    public static OrderPaid of(long orderId, Money amount) {
        return new OrderPaid(UUID.randomUUID().toString(), orderId, amount, Instant.now());
    }
}
```

四个字段各有用途：`eventId` 用于消费方幂等，`orderId` 是聚合标识，`paidAmount` 是必要载荷，`occurredAt` 用于排查与排序。

事件里**只放必要载荷**，不要把整个聚合塞进去。一是体积，二是消费方会依赖你所有的字段，以后改聚合就变成了破坏性变更。

## 发布：聚合收集，应用服务发出

聚合不该依赖消息中间件，它只负责「记住发生了什么」:

```java
public class Order {
    private final List<Object> events = new ArrayList<>();

    public void pay() {
        // ... 校验与状态变更
        events.add(OrderPaid.of(id.value(), total()));
    }

    public List<Object> pullEvents() {
        List<Object> copy = List.copyOf(events);
        events.clear();
        return copy;
    }
}
```

应用服务在本地事务提交后统一发布：

```java
@Transactional
public void pay(PayCmd cmd) {
    Order order = orderRepository.find(new OrderId(cmd.orderId()));
    order.pay();
    orderRepository.save(order);

    order.pullEvents().forEach(publisher::publishEvent);
}
```

用 Spring 时，`@TransactionalEventListener(phase = AFTER_COMMIT)` 能保证「事务回滚了事件就不发」，省掉手写发件箱。跨进程(发 MQ)时，可靠的做法是**事务性发件箱**:事件和业务数据在同一个本地事务里写进 `outbox` 表，再由独立进程轮询发送，发成功才标记。这样不会出现「数据提交了、消息没发出去」。

## 幂等：消费方必须自己保证

消息中间件通常保证「至少一次」，意味着同一个事件可能被投递两次。消费方要能认出来：

```java
@TransactionalEventListener(phase = AFTER_COMMIT)
public void on(OrderPaid event) {
    if (!processedEventRepo.markIfAbsent(event.eventId())) {
        return;                        // 已经处理过,直接返回
    }
    pointService.add(event.orderId(), event.paidAmount());
}
```

`markIfAbsent` 靠事件 ID 的唯一索引实现，插入成功才继续处理。判断标准：**这段逻辑执行两次，结果一样吗？** 加积分用「设为 100」而不是「加 100」，扣库存用「按订单号去重」而不是「减 1」，都是幂等的写法。

注意：事件是「通知」，不是「命令」。消费方不该回写发布方的聚合——那会形成双向依赖。需要回写时，发一个新的事件。

## 小结

- 值对象：不可变、按值相等、无副作用；`record` 自动生成 `equals` / `hashCode`，紧凑构造器放校验；
- 包住裸类型(`Sku`、`OrderId`)能让编译器帮你挡掉传参错位；
- `Money` 必须带币种，构造时统一精度，运算返回新对象并校验币种；
- 领域事件用过去式命名，带 `eventId`、聚合 ID、载荷、发生时间，只放必要字段；
- 聚合收集事件，应用服务在事务提交后发布；跨进程用事务性发件箱保证不丢；
- 消费方按 `eventId` 幂等，「执行两次结果一样」是硬要求。

下一篇讲这些零件放在哪：分层架构与防腐层。
