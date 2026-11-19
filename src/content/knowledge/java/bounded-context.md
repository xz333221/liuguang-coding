---
title: 限界上下文与统一语言
summary: '业务规则变复杂后,一个覆盖全系统的大模型会因同一个词承担多种含义而失真;限界上下文把模型限定在术语唯一、规则自洽的边界内,统一语言让业务与代码共用同一套词汇,上下文之间再通过共享内核、客户-供应商、防腐层或开放主机服务协作。'
category: java
node: java-ddd-bounded-context
order: 85
level: 深入
tags: [DDD, 限界上下文, 统一语言, 上下文映射]
updated: 2026-11-19
mindmap: bounded-context.mindmap.json
terms: ["ddd", "bounded-context", "anti-corruption-layer"]
sources:
  - title: Martin Fowler · BoundedContext
    url: https://martinfowler.com/bliki/BoundedContext.html
    note: 限界上下文的定义与多模型并存的理由。
  - title: Martin Fowler · Domain Driven Design
    url: https://martinfowler.com/tags/domain%20driven%20design.html
    note: 战略设计与战术设计的文章索引。
  - title: Domain Language · DDD Reference
    url: https://domainlanguage.com/ddd/reference/
    note: 上下文映射各关系的原始表述。
---

上一篇用策略、观察者与模板方法处理对象之间的协作。这些模式解决的是局部结构;当业务规则本身复杂到一定程度,先要回答另一个问题:模型覆盖多大范围,同一个词在不同场景里是否指同一件事。领域驱动设计(Domain-Driven Design,DDD)从这个问题开始,给出的答案是限界上下文。

## 一个模型覆盖全系统的代价

电商系统早期通常只有一个 Order 类:下单时写入商品与优惠,支付后记录流水,发货后追加物流单号,开票时再补发票信息。字段持续增加,方法开始互相矛盾:销售希望未支付订单可以改明细,履约希望明细进入拣货后不再变化,结算只关心应收金额。同一个 canModify() 无法同时满足三种要求。

代码里的模型与业务人员理解的概念逐渐对不上,这种现象叫模型失真。业务复杂度本身无法消除,可以消除的是额外负担:把不同含义强行放进一个模型,每个使用方都要为无关字段做兼容,修改一处影响全部场景。

## 统一语言:同一个词只有一个含义

统一语言(ubiquitous language)是在某个限界上下文内,业务人员、产品与开发共同使用、含义唯一的一套术语。它不只写在文档里,类名、方法名、事件名、数据库字段名都使用同一套词。

落地有三条做法:

- 维护术语表:每个上下文记录词、定义与反例,新成员先读术语表;
- 用业务动词命名方法:confirmPayment、ship、cancel,不用 updateStatus 这类技术词;
- 发现两个角色对同一个词理解不同,立即确认边界或改名,不要留到编码阶段。

```java
public class Main {
    enum OrderStatus { CREATED, PAID, SHIPPED, COMPLETED }

    static final class Order {
        private OrderStatus status = OrderStatus.CREATED;

        void confirmPayment() { status = OrderStatus.PAID; }

        void ship() {
            if (status != OrderStatus.PAID) {
                throw new IllegalStateException("未支付不能发货");
            }
            status = OrderStatus.SHIPPED;
        }
    }

    public static void main(String[] args) {
        Order order = new Order();
        order.confirmPayment();
        order.ship();
        System.out.println(order.status);   // SHIPPED
    }
}
```

方法名直接来自业务动作,状态变化由聚合维护。读代码的人不需要猜 updateStatus(3) 里的 3 代表什么。

## 边界怎么划

限界上下文是模型适用的显式边界:边界内术语含义唯一,边界外是另一套模型。划分依据主要有三条:

- 按业务能力:销售、履约、结算、库存各自有独立的规则与数据,可以分别建模;
- 按团队边界:一个团队维护一个上下文,沟通成本最低,这条经验称为康威定律;
- 按语言变化点:同一个词的含义开始不同之处,就是边界候选。

边界按业务含义切,不按技术分层切。Controller、Service、DAO 是层,不是上下文;把一个上下文拆成 controller 包、service 包、dao 包,只是换了目录,术语冲突仍然存在。

## 同一个词,不同含义

以订单为例,三个上下文对它的理解并不相同:

| 上下文 | Order 的含义 | 关键字段 | 关键行为 |
| --- | --- | --- | --- |
| 销售 | 客户提交的购买意向 | 商品、折扣、应付金额 | 改明细、应用优惠、取消 |
| 履约 | 仓库执行的发货任务 | 拣货位、包裹、承运商 | 拣货、发货、签收 |
| 结算 | 一笔应收账款的凭据 | 发票号、税率、结算金额 | 开票、对账、收款 |

三个类可以同名,分属不同包,字段与方法各自独立。合并成一个类后,每个上下文都要为另外两个上下文的字段做兼容,任何一方的规则变化都会影响其余两方。

```java
import java.math.BigDecimal;

public class Main {
    // 销售上下文:关注折扣与应付金额
    record SalesOrder(String no, BigDecimal payable) {}
    // 履约上下文:关注仓库与包裹
    record FulfillmentOrder(String no, String warehouse) {}

    public static void main(String[] args) {
        SalesOrder sales = new SalesOrder("A1001", new BigDecimal("199.00"));
        FulfillmentOrder fulfillment = new FulfillmentOrder("A1001", "SHA-01");
        System.out.println(sales.payable());          // 199.00
        System.out.println(fulfillment.warehouse());  // SHA-01
    }
}
```

```text
com.example
├── sales
│   ├── domain/Order.java          # 购买意向
│   └── application/PlaceOrder.java
├── fulfillment
│   ├── domain/Order.java          # 发货任务
│   └── application/ShipOrder.java
└── shared
    └── Money.java                 # 共享内核,只放稳定的基础类型
```

## 上下文映射的几种关系

上下文映射(context map)描述多个上下文之间如何协作,常见关系有四种:

- 共享内核(shared kernel):两个上下文共用一小块模型,修改需要双方共同评审,只适合非常稳定的部分;
- 客户-供应商(customer-supplier):下游提出需求,上游安排计划并维护接口,依赖方向明确;
- 防腐层(anti-corruption layer):下游在自己的边界内转换模型,上游的字段与状态变化不进入领域层;
- 开放主机服务(open host service):上游把能力发布成稳定的服务契约,供多个下游使用。

此外还有顺从者(conformist)与各行其道(separate ways):前者放弃转换,直接跟随上游模型;后者不做集成。选择哪种关系取决于团队协作方式与模型差异,技术只是其中一个因素。

## 落地建议

- 先划边界再建模型:先列业务能力与术语冲突点,再决定有几个上下文,目录结构是结果;
- 不要一个 Model 打天下:跨上下文共享实体类,任何一方的字段变更都会影响另一方;
- 共享内核只放值对象与标识:Money、OrderNo 这类稳定类型可以共享,Order 本身不共享;
- 边界允许先粗后细:初期在一个上下文内分模块,语义稳定后再拆;
- 术语表与代码一起评审:新增类名、事件名时对照术语表,出现同义词就统一。

## 小结

- 业务复杂度无法消除,一个模型覆盖全系统会让同一个词承担多种含义,导致模型失真;
- 限界上下文是术语唯一、规则自洽的模型边界,按业务能力、团队与语言变化点划分;
- 统一语言要求文档、类名、方法名与事件名使用同一套业务词汇;
- 上下文之间通过共享内核、客户-供应商、防腐层、开放主机服务协作;
- 先划边界再建模型,跨上下文不共享实体类,共享内核只放稳定的值对象。

下一篇进入边界内部:一组必须一起保持一致的对象怎样组织成聚合,业务规则放在哪里。
