---
title: 聚合根与不变式
summary: '实体按身份区分,值对象按属性值区分;聚合是一组必须一起保持一致的对象,聚合根是唯一的外部入口,不变式由它维护。聚合边界同时是一致性边界与事务边界,应尽量小;跨聚合用领域事件达到最终一致;仓储只针对聚合根,内部集合只提供只读视图。'
category: java
node: java-ddd-aggregate
order: 86
level: 深入
tags: [DDD, 聚合根, 不变式, 实体, 最终一致]
updated: 2026-11-20
mindmap: aggregate.mindmap.json
terms: ["ddd", "aggregate", "value-object", "repository"]
sources:
  - title: Martin Fowler · DDD_Aggregate
    url: https://martinfowler.com/bliki/DDD_Aggregate.html
    note: 聚合、聚合根与一致性边界的定义。
  - title: Martin Fowler · Repository
    url: https://martinfowler.com/eaaCatalog/repository.html
    note: 以聚合为单位封装持久化的意图。
  - title: Domain Language · DDD Reference
    url: https://domainlanguage.com/ddd/reference/
    note: 不变式与聚合边界的原始表述。
---

上一篇把系统切成了若干上下文。这一篇进到上下文内部,解决一个更具体的问题:**一条业务规则,怎么保证它不会被任何一条代码路径绕过。**

## 实体与值对象

先分清两种东西:

| | 实体 Entity | 值对象 Value Object |
| --- | --- | --- |
| 区分方式 | 身份(ID) | 属性值 |
| 可变性 | 可变,但身份不变 | 不可变,改就换一个新的 |
| 例子 | 订单、用户、账户 | 金额、地址、时间区间、手机号 |

两个 `Address("天津市东丽区", "300300")` 是同一个地址,没有「第 1 个地址」这种说法,所以它是值对象。订单号不同就是不同订单,哪怕其他字段全一样,所以它是实体。

这个区分不是学术分类,它决定 `equals` 怎么写:实体按 ID 比,值对象按所有字段比。第 3 章 `equals` / `hashCode` 那篇说过,混用会导致集合里出现「看起来重复」的元素。

## 聚合:必须一起改的东西

看一段业务规则:订单总金额必须等于各明细金额之和;明细最多 50 条;已支付的订单不能改明细。

```java
// 反例:每个类各自管自己
public class Order {
    private BigDecimal total;
}
public class OrderItem {
    private BigDecimal amount;
}
```

这样写,`order.setTotal(...)` 谁都能调,规则一旦变成「总金额由明细算出」就守不住。正确做法是把必须一起保持一致的对象收进一个聚合,并指定唯一入口:

```java
public class Order {                                  // 聚合根

    private final OrderId id;
    private final List<OrderItem> items = new ArrayList<>();
    private OrderStatus status = OrderStatus.CREATED;

    public static Order create(OrderId id) {
        return new Order(id);
    }

    public void addItem(String sku, int qty, BigDecimal unitPrice) {
        ensureMutable();                              // 已支付不能改
        if (items.size() >= 50) {
            throw new IllegalStateException("明细不能超过 50 条");
        }
        items.add(new OrderItem(sku, qty, unitPrice));
    }

    public void removeItem(String sku) {
        ensureMutable();
        items.removeIf(it -> it.sku().equals(sku));
    }

    public BigDecimal total() {                       // 现算,不存字段
        return items.stream()
                .map(OrderItem::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<OrderItem> items() {                  // 只读视图
        return Collections.unmodifiableList(items);
    }

    public void pay() {
        if (items.isEmpty()) {
            throw new IllegalStateException("空订单不能支付");
        }
        this.status = OrderStatus.PAID;
    }

    private void ensureMutable() {
        if (status != OrderStatus.CREATED) {
            throw new IllegalStateException("订单已支付,不能修改明细");
        }
    }
}
```

四条规则现在只有一条路能绕过去——直接反射改字段,那不属于正常代码。这就是聚合根的作用:**它是外部唯一能拿到手的东西,所有状态变化都必须经过它的方法**。

注意 `total()` 是**现算**的,不是存字段。存字段就要维护一致性:加明细要加金额、删明细要减金额、改单价要重算——三处任何一处漏了,数据就错了。能现算的就不存,这是消除不变式维护成本最有效的一招。

## 不变式:任何时候都必须成立

上面代码里的 `ensureMutable()`、明细上限、空订单不能支付,都是不变式。判断标准很简单:**这条规则被违反时,数据就是错的**,而不是「业务上不太合理」。

- 「总金额 = 明细之和」——违反就是脏数据,是不变式;
- 「单笔订单不超过 5000 元需要审批」——这是业务流程,不是不变式,不该写在实体里。

不变式放在聚合根里,由它在**每次状态变化时**校验。放到 Service 里校验就守不住,因为下一个调用方可能忘了调。

## 边界:聚合要小

新手最容易犯的错是把整个领域做成一个大聚合:订单里放用户、用户里放地址、地址里放城市。后果是:

- 加载一个订单要把关联的全部数据拉出来,慢;
- 两个人同时改订单和用户,锁冲突;
- 事务边界变大,一个失败全部回滚。

聚合的边界应该等于**事务边界**:一个事务只改一个聚合。跨聚合的一致性靠领域事件达成最终一致:

```java
// 订单支付成功后,库存要扣减、积分要增加
order.pay();                                   // 改一个聚合,本地事务提交
publisher.publishEvent(new OrderPaid(order.id(), order.total()));
```

库存那一步失败了怎么办?重试 + 幂等,必要时用对账兜底。这比「一个大事务锁住订单和库存两张表」更抗压——后者在并发下单时几乎必然死锁。

判断聚合是否过大,问三个问题:能否在一个事务里改完?两个人会同时改它吗?加载它需要几条 SQL?

## 访问与存储

- **内部对象不对外暴露**:`items()` 返回不可变视图,否则外部拿到 `List` 直接 `add`,不变式就废了;
- **仓储只针对聚合根**:有 `OrderRepository`,不该有 `OrderItemRepository`。要改明细,先 `find` 订单再调它的方法;
- **ID 用值对象**:`OrderId` 比 `long` 更难传错,`new OrderId("...")` 编译期就挡住了把用户 ID 传进来的错误。

## 小结

- 实体按 ID 区分,值对象按属性值区分且不可变;`equals` 的写法跟着这个走;
- 聚合是一组必须一起保持一致的对象,聚合根是唯一入口,状态只能通过它的方法改;
- 不变式是「违反就说明数据错了」的规则,由聚合根在每次变化时校验;
- 能现算的字段不要存,存了就要在三处维护一致性;
- 聚合边界约等于事务边界,应该尽量小;跨聚合用领域事件达到最终一致;
- 仓储只针对聚合根,内部集合只提供只读视图,ID 用值对象。

下一篇讲聚合里最常用的两个零件:值对象怎么用 `record` 写,以及领域事件怎么发、怎么保证幂等。
