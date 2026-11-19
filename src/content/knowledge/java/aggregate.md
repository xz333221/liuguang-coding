---
title: 聚合根与不变式
summary: '实体按身份区分,值对象按属性值区分;聚合是一组必须一起保持一致的对象,聚合根是唯一外部入口,不变式由它维护。聚合边界同时是一致性边界与事务边界,应尽量小,跨聚合通过领域事件达到最终一致,仓储只针对聚合根。'
category: java
node: java-ddd-aggregate
order: 86
level: 深入
tags: [DDD, 聚合根, 不变式, 实体, 最终一致]
updated: 2026-11-19
mindmap: aggregate.mindmap.json
terms: ["ddd", "aggregate", "value-object", "repository"]
sources:
  - title: Martin Fowler · Domain Driven Design
    url: https://martinfowler.com/tags/domain%20driven%20design.html
    note: 实体、值对象与聚合的战术设计索引。
  - title: Martin Fowler · Repository
    url: https://martinfowler.com/eaaCatalog/repository.html
    note: 以聚合为单位封装持久化的意图。
  - title: Domain Language · DDD Reference
    url: https://domainlanguage.com/ddd/reference/
    note: 聚合边界与不变式的原始定义。
---

上一篇把系统划成若干限界上下文,边界内的术语与规则各自独立。领域驱动设计的战略部分到此结束,进入边界内部,模型由实体与值对象组成;其中必须一起保持一致的那组对象,由聚合根统一管理。

## 实体与值对象

实体(entity)有唯一标识,身份不随属性变化。订单改收货地址、改明细、更换支付方式之后仍是同一个订单,靠 orderId 识别。值对象(value object)没有独立标识,按属性值判断相等:两笔 100 元没有区别,不需要区分是哪一笔。

落到代码,实体比较身份,通常只比较 ID;值对象比较全部属性。值对象不可变的写法在下一篇展开,这里先用它表达订单号。

## 聚合与聚合根

聚合(aggregate)是一组必须一起保持一致的对象。聚合根(aggregate root)是这组对象里唯一对外的入口:外部只能持有聚合根的引用,通过它的方法修改内部状态。

订单与订单明细是一个聚合。明细脱离订单没有意义,订单总金额必须等于各明细金额之和;外部拿到 Order 后调用 addItem、removeItem、pay,不能取出内部 List 直接添加明细。

## 不变式由聚合保证

不变式(invariant)是业务对象在任何时刻都必须满足的规则。订单聚合的典型不变式:

- 明细数量必须大于 0;
- 订单总金额等于各明细金额之和;
- 已支付的订单不能修改明细;
- 空订单不能支付。

这些规则必须写在聚合根的方法里。只要存在一条绕过聚合根的修改路径,不变式就可能被破坏:把内部 List 暴露出去,调用方可以跳过校验直接添加明细,规则等于没有。应用服务与 Controller 可以做参数格式校验,业务不变式仍归聚合。

## 代码:一个订单聚合

```java
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class Main {
    record OrderId(String value) {
        OrderId {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("订单号不能为空");
            }
        }
    }

    static final class OrderLine {
        private final String sku;
        private final BigDecimal unitPrice;
        private final int quantity;

        OrderLine(String sku, BigDecimal unitPrice, int quantity) {
            this.sku = sku;
            this.unitPrice = unitPrice;
            this.quantity = quantity;
        }

        BigDecimal amount() { return unitPrice.multiply(BigDecimal.valueOf(quantity)); }
    }

    static final class Order {
        private final OrderId id;
        private final List<OrderLine> lines = new ArrayList<>();
        private boolean paid;

        Order(OrderId id) { this.id = id; }

        void addItem(String sku, BigDecimal unitPrice, int quantity, int availableStock) {
            if (paid) throw new IllegalStateException("已支付订单不能修改明细");
            if (quantity <= 0) throw new IllegalArgumentException("数量必须大于 0");
            if (unitPrice.signum() < 0) throw new IllegalArgumentException("单价不能为负");
            if (quantity > availableStock) throw new IllegalArgumentException("库存不足");
            lines.add(new OrderLine(sku, unitPrice, quantity));
        }

        BigDecimal total() {
            BigDecimal sum = BigDecimal.ZERO;
            for (OrderLine line : lines) sum = sum.add(line.amount());
            return sum;
        }

        List<OrderLine> lines() { return List.copyOf(lines); }

        void pay() {
            if (lines.isEmpty()) throw new IllegalStateException("空订单不能支付");
            paid = true;
        }
    }

    public static void main(String[] args) {
        Order order = new Order(new OrderId("A1001"));
        order.addItem("book", new BigDecimal("30.00"), 2, 10);
        order.addItem("pen", new BigDecimal("15.00"), 1, 10);
        System.out.println(order.total());          // 75.00

        order.pay();
        try {
            order.addItem("book", new BigDecimal("30.00"), 1, 10);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());     // 已支付订单不能修改明细
        }
    }
}
```

几个细节:

- 订单号用 record 值对象包装,空值在构造时就被拒绝,聚合内不必再判 null;
- availableStock 是库存上下文提供的可用量快照,addItem 用它校验本次请求,库存的扣减仍由库存聚合负责;
- 总金额不存字段,由明细计算,避免明细与合计两份数据不一致;
- lines() 返回 List.copyOf 生成的只读副本,调用方无法通过它修改聚合状态;
- paid 是私有字段,只能由 pay() 修改,pay() 里同时校验空订单。

## 聚合边界怎么定

三条判断依据:

- 一致性边界:哪些数据必须在同一次操作后立刻一致,这些放进同一个聚合。订单与明细要实时满足「合计等于明细之和」,所以在同一个聚合;
- 事务边界:一次事务只修改一个聚合。第 14 章讲过,事务保证多条语句要么全部提交要么全部回滚,但范围越大,锁持有时间越长,并发冲突越多;
- 尽量小:聚合越大,加载、保存与加锁的成本越高,两个人同时修改同一聚合的概率也越高。

订单与库存不属于同一个聚合:库存有自己的扣减规则与并发要求。下单成功后通过领域事件通知库存,短暂的不一致可以接受。

## 跨聚合:领域事件与最终一致

最终一致(eventual consistency)指两个聚合不要求在同一事务内同时更新,只要求在短时间内通过事件达到一致。支付成功后发布 OrderPaid,库存聚合订阅后扣减;中间存在短暂窗口,系统最终收敛到一致状态。

与一个大事务同时锁定订单表、库存表、账户表相比,这种方式把失败范围限制在单个聚合内,也减少了锁冲突。代价是重复发送与失败重试需要处理,下一篇展开。

## 仓储只针对聚合根

仓储(repository)以聚合为单位存取:findById 返回包含明细的完整订单,save 保存整个聚合。不为 OrderLine 单独建仓储,否则外部可以绕过聚合根修改明细,不变式再次被破坏。

```java
import java.util.Optional;

public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}
```

接口只出现聚合根类型,调用方拿不到 OrderLine 的独立存取入口。

## 小结

- 实体按身份区分,值对象按属性值区分;
- 聚合是一组必须一起保持一致的对象,聚合根是唯一外部入口;
- 不变式由聚合根的方法维护,内部集合只返回只读副本;
- 聚合边界同时是一致性边界与事务边界,应尽量小,一次事务只改一个聚合;
- 跨聚合通过领域事件达到最终一致,仓储只针对聚合根。

下一篇展开聚合内部的两个基础类型:值对象怎样用 record 表达,领域事件怎样定义与发布。
