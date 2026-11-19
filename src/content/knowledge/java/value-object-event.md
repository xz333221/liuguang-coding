---
title: 值对象与领域事件
summary: '值对象没有独立身份,不可变、按属性值相等、无副作用,Java 用 record 表达,金额用 BigDecimal 封装成带币种的 Money;领域事件描述已经发生的事实,用过去式命名,由聚合收集、应用服务在事务提交后发布,消费方按事件 ID 保证幂等。'
category: java
node: java-ddd-value-object
order: 87
level: 深入
tags: [DDD, 值对象, 领域事件, record, BigDecimal]
updated: 2026-11-19
mindmap: value-object-event.mindmap.json
terms: ["value-object", "domain-event", "record", "bigdecimal"]
sources:
  - title: Martin Fowler · DomainEvent
    url: https://martinfowler.com/bliki/DomainEvent.html
    note: 领域事件的定义与发布方式。
  - title: Oracle Java · Record
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html
    note: record 自动生成成员与不可变约束。
  - title: Spring Framework Reference · The IoC Container
    url: https://docs.spring.io/spring-framework/reference/core/beans.html
    note: ApplicationEventPublisher 与容器事件机制。
---

上一篇的订单聚合里,订单号被包装成 OrderId,总金额由明细计算。OrderId 没有独立身份,靠值区分,属于值对象;聚合之间的通知则交给领域事件。

## 值对象:不可变、按值相等

值对象(value object)是以属性值定义相等性的对象,没有独立标识。它有三个特征:

- 不可变:创建后属性不再变化,需要修改就创建新对象;
- 按值相等:属性相同即相等,不比较引用;
- 无副作用:方法只返回结果,不修改自身或外部状态。

不可变的对象可以安全共享,作为 Map 的 key 不会因为字段变化而丢失,并发访问也不需要额外同步。

## 用 record 实现

第 3 章讲过,record 自动生成构造器、访问器、equals、hashCode 与 toString,字段隐式为 final,类是 final 的。值对象正好符合这个形状:

```java
import java.math.BigDecimal;
import java.math.RoundingMode;

public class Main {
    record Money(BigDecimal amount, String currency) {
        Money {
            if (amount == null) throw new IllegalArgumentException("金额不能为空");
            if (!"CNY".equals(currency)) throw new IllegalArgumentException("只支持 CNY");
            amount = amount.setScale(2, RoundingMode.HALF_UP);
        }

        Money add(Money other) {
            if (!currency.equals(other.currency)) {
                throw new IllegalArgumentException("币种不一致");
            }
            return new Money(amount.add(other.amount), currency);
        }

        static Money of(String value) { return new Money(new BigDecimal(value), "CNY"); }
    }

    public static void main(String[] args) {
        Money a = Money.of("19.9");
        Money b = Money.of("0.1");
        System.out.println(a.add(b));                     // Money[amount=20.00, currency=CNY]
        System.out.println(a.equals(Money.of("19.90")));  // true,按值相等
    }
}
```

record 的 equals 比较全部字段。BigDecimal 的 equals 同时比较数值与 scale,所以构造器里统一调用 setScale(2),否则 19.9 与 19.90 会被判为不等。

## 自校验与不可变

值对象在构造器里完成校验与规范化,非法状态无法被创建,后续方法不必重复判断。Money 只接受 CNY,金额统一保留两位小数,所有使用方拿到的都是同一种表示。

三个约束:

- 不提供 setter,修改通过方法返回新对象,如 add 返回新的 Money;
- 内部集合用 List.copyOf 包装,或在构造时复制一份;
- 需要「修改」时返回新实例,调用方不会与其他持有者互相影响。

## 金额为什么封装成 Money

第 3 章 3.3 节的 BigDecimal 解决了 double 的二进制精度问题,但单独的 BigDecimal 不携带币种,也允许「元」与「分」混算。Money 把金额与币种绑在一起:构造时统一精度,加减前校验币种,展示时格式一致。跨表、跨服务传入金额时,单位与币种随对象一起走,不需要在每个调用点重新约定。

## 领域事件:已经发生的事

领域事件(domain event)表示领域里已经发生的事实,命名用过去式:OrderPaid、OrderShipped、InventoryDeducted。它不表达「请做某事」;命令用祈使语气(如 PayOrder),两者不要混用。

一个事件至少包含四部分:

- 事件 ID:全局唯一,用于追踪与幂等;
- 发生时间:事件产生的时刻,不是消费的时刻;
- 聚合 ID:事件属于哪个聚合;
- 载荷:消费方需要的业务字段,只放必要数据。

```java
import java.time.Instant;
import java.util.UUID;

public class Main {
    record OrderPaid(String eventId, Instant occurredAt, String orderId, String amount) {
        static OrderPaid of(String orderId, String amount) {
            return new OrderPaid(UUID.randomUUID().toString(), Instant.now(), orderId, amount);
        }
    }

    public static void main(String[] args) {
        OrderPaid event = OrderPaid.of("A1001", "199.00");
        System.out.println(event.orderId());              // A1001
        System.out.println(event.eventId().length());     // 36,UUID
        System.out.println(event.occurredAt() != null);   // true
    }
}
```

事件对象同样不可变。载荷只放消费方真正需要的字段:放整个订单快照会让事件与模型实现绑定,字段一改就得兼容历史消息。

## 发布:事务提交之后

聚合不直接调用消息中间件,只把事件收集到内部列表;应用服务保存聚合后取出事件,交给发布器。这样领域层不依赖任何消息设施。

Spring 提供 ApplicationEventPublisher 发布事件,配合 @TransactionalEventListener 把监听器放到事务提交之后执行:

```java
@Service
class OrderApplicationService {
    private final OrderRepository repository;
    private final ApplicationEventPublisher publisher;

    OrderApplicationService(OrderRepository repository, ApplicationEventPublisher publisher) {
        this.repository = repository;
        this.publisher = publisher;
    }

    @Transactional
    public void pay(String orderId) {
        Order order = repository.findById(new OrderId(orderId)).orElseThrow();
        order.pay();
        repository.save(order);
        order.pullEvents().forEach(publisher::publishEvent);
    }
}

@Component
class StockListener {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void on(OrderPaid event) {
        // 扣减库存;失败进入重试,按 eventId 去重
    }
}
```

在事务内发布、提交后执行,可以避免订单回滚而库存已经扣减。没有事务时,AFTER_COMMIT 监听器默认不执行,需要显式设置 fallbackExecution = true。

## 事件不被消费不是错误

发布方只声明事实,是否有人消费由订阅方决定。新增一个下游不需要修改订单聚合,这是解耦的收益。代价是发送语义:消息队列通常保证至少一次发送,同一个事件可能到达两次。

处理方式是幂等(idempotent):同一操作执行多次与执行一次的结果相同。常见做法是用 eventId 建唯一索引,或在消费表里记录已处理的事件 ID,重复事件直接跳过。

## 小结

- 值对象没有独立身份,不可变、按值相等、无副作用;
- record 自动生成 equals/hashCode,构造器统一精度后按值比较才可靠;
- Money 把 BigDecimal 与币种绑定,自校验放在构造器里;
- 领域事件用过去式命名,包含事件 ID、发生时间、聚合 ID 与载荷;
- 聚合收集事件,应用服务在事务提交后发布,消费方按 eventId 保证幂等。

下一篇回到整体结构:这些对象放进哪些层,依赖方向指向哪边,外部系统的模型怎样隔离。
