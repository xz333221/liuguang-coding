---
title: DDD:先把「下单」关进一个限界上下文里
summary: 'DDD 不是几张分层目录,而是三件事:用一套业务语言说话、让聚合根守住不变式、把领域层从框架里摘出来。分层只是这三件事的结果。'
category: java
node: java-ddd-bounded-context
order: 5
level: 进阶
tags: [DDD, 限界上下文, 聚合根, 值对象, 分层]
updated: 2026-11-07
mindmap: ddd.mindmap.json
demo: ddd-layers
terms: ["ddd", "bounded-context", "aggregate", "value-object", "repository", "application-service", "domain-event", "anti-corruption-layer"]
sources:
  - title: Martin Fowler · BoundedContext
    url: https://martinfowler.com/bliki/BoundedContext.html
    note: 限界上下文的定义与"一个边界一套模型"的说法出处。
  - title: Domain Language · DDD Reference
    url: https://domainlanguage.com/ddd/reference/
    note: Eric Evans 的 DDD 术语速查:实体、值对象、聚合、仓储、领域事件。
  - title: Alistair Cockburn · Hexagonal Architecture
    url: https://alistair.cockburn.us/hexagonal-architecture/
    note: 端口与适配器(六边形架构)的原型,依赖倒置的理论来源。
  - title: Martin Fowler · AnemicDomainModel
    url: https://martinfowler.com/bliki/AnemicDomainModel.html
    note: 只有 getter/setter、规则全在 Service 里的"贫血模型",是分层目录最常见的坏结果。
---

先说清楚:**DDD 不是"把包分成 controller / service / repository",那只是分层的结果,不是它的目的。** 它真正在解决三件事:

1. **用业务语言说事**:代码里的词跟业务专家嘴里的词一致,不用在脑子里翻译;
2. **把不变式关进一个地方**:谁也不能绕过规则改状态;
3. **让领域层不依赖框架**:换 ORM、换 Web 框架、换数据库,业务规则不跟着搬家。

配套示例在仓库的 `examples/ddd-demo/`,是个**纯 Java** 的下单上下文:没有 Spring、没有数据库,`javac` 就能编、`main` 就能跑。这不是为了炫技,而是 DDD 想达到的状态 —— 领域层自己站着,不靠框架扶着。

## 限界上下文:先划边界,再谈分层

一个**限界上下文**(bounded context)就是:一套术语、一个模型、一条边界。在边界内,"订单"只有一个意思;出了边界,别人嘴里的"订单"可能是另一回事。

真实项目里通常不止一个:

```text
订货上下文(order)      库存上下文(inventory)     支付上下文(payment)
  聚合根 Order             聚合根 Stock              聚合根 Payment
  值对象 Money              值对象 Quantity            值对象 Amount
```

它们之间**不共享领域模型**:订货上下文里的 `Order` 不该被支付上下文拿来直接改。跨上下文要么发领域事件,要么经过一层翻译(防腐层)。这就是为什么"一个 `Order` 类被五个模块共用"最后一定会变成一堆谁都不敢改的字段。

示例只做一个上下文,是为了把边界内的东西讲透:

```text
examples/ddd-demo/src/main/java/com/liuguang/ddd/order/
├─ domain/                    领域层:纯 Java,规则都在这里
│  ├─ model/
│  │  ├─ Order.java           聚合根
│  │  ├─ OrderId.java         值对象
│  │  ├─ OrderLine.java       实体(只在聚合内部)
│  │  ├─ Money.java           值对象
│  │  └─ OrderStatus.java
│  ├─ event/                  领域事件 + 发布接口
│  └─ repository/             仓储接口(接口在这里)
├─ application/               应用层:一个方法一个用例
│  ├─ OrderApplicationService.java
│  ├─ command/                入参
│  └─ view/                   出参(不把聚合根漏出去)
├─ infrastructure/            基础设施层:实现领域层声明的接口
│  ├─ InMemoryOrderRepository.java
│  └─ ConsoleEventPublisher.java
└─ interfaces/                接口层:这次是命令行,换成 Controller 也一样
   └─ OrderCli.java
```

## 四层与依赖方向

```text
                interfaces(HTTP / CLI / 消息监听)
                        │ 只能往下调
                        ▼
                application(用例编排)
                        ▼
                domain(规则、模型、接口)
                        ▲ 实现
                        │
                infrastructure(数据库、消息、外部系统)
```

关键只有一条:**domain 谁也不依赖,infrastructure 依赖 domain —— 方向是倒过来的。**

| 层 | 放什么 | 不该放什么 |
| --- | --- | --- |
| `interfaces` | 路由、参数绑定、把输入翻译成命令 | 业务判断、直接调仓储 |
| `application` | 用例流程、事务边界、权限校验 | 领域规则(空订单能不能提交这种) |
| `domain` | 实体、值对象、聚合根、领域服务、仓储接口 | 框架注解、SQL、HTTP 对象 |
| `infrastructure` | 仓储实现、事件发布实现、外部适配 | 业务规则 |

这条方向带来的直接好处:**领域层可以用单元测试跑**,不需要起 Spring、不需要连库。示例里的 `OrderTest` 就是这样 —— 构造对象、调方法、断言异常。

## 三个模型对象

### 值对象:没有身份,只有值

```java
public record Money(BigDecimal amount, String currency) {
    public Money {
        if (amount.signum() < 0) throw new IllegalArgumentException("金额不能为负");
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("币种不能为空");
    }
    public Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("币种不一致");
        return new Money(amount.add(other.amount), currency);
    }
}
```

两个 `39.90 元` 的 `Money` **就是同一个东西**,不需要 id。值对象的价值在于:校验只写一次、方法签名说得清楚(`OrderId` 和 `String` 不会传反)、不可变所以可以放心共享。

### 实体:有身份,但只在聚合内部

`OrderLine` 是一行商品,靠 sku 区分。它不该被外部直接拿到改数量 —— 数量变了总价要跟着变,这种一致性只能由聚合根保证。

### 聚合根:一致性边界

```java
public class Order {
    private static final int MAX_LINES = 20;
    private OrderStatus status = OrderStatus.DRAFT;

    public void addLine(OrderLine line) {
        requireStatus(DRAFT, "只有草稿状态能加商品");
        if (lines.size() >= MAX_LINES) throw new IllegalStateException("最多 20 行");
        lines.add(line);
    }

    public void place() {
        requireStatus(DRAFT, "订单已经提交或已取消");
        if (lines.isEmpty()) throw new IllegalStateException("空订单不能提交");
        status = PLACED;
        pendingEvents.add(new OrderPlaced(id, customerId, total(), Instant.now()));
    }
}
```

**聚合根要满足的条件:一次修改只改一个聚合,并且这个聚合自己是自洽的。** 所以它没有公开构造器、没有 setter,状态只能通过 `place()` / `cancel()` 这类**有意义的行为**改变。规则写在这里,就不会出现"某个 Service 忘了校验"。

如果一条规则需要跨聚合(比如"库存不够不能下单"),它不属于任何一个聚合 —— 那是一个领域服务或流程,别硬塞进来。

## 仓储接口为什么写在 domain

```java
// domain/repository
public interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(OrderId id);
}

// infrastructure
public class InMemoryOrderRepository implements OrderRepository { ... }
```

接口放在领域层,是因为**用它的是领域与应用层**;实现放在基础设施层,是因为**它才需要知道数据库**。这就是依赖倒置。

顺带两条边界:

- 仓储不是 DAO:`findAll()` / 分页 / 复杂查询是"读模型"的事,别往仓储接口里塞;
- 仓储按**聚合**为单位存取,一次取整个 `Order`(含行),而不是先取订单再取行拼起来。

## 应用服务:只做编排

```java
public OrderId place(PlaceOrderCommand command) {
    Order order = Order.draft(OrderId.newId(), command.customerId());
    command.lines().forEach(order::addLine);

    order.place();
    orders.save(order);
    publishEventsOf(order);

    return order.id();
}
```

四步:建聚合、调行为、存、发事件。**这里不该出现 `if (lines.size() > 20)`** —— 那是聚合根的活。它也不知道调用方是 HTTP 还是定时任务,所以换个入口不用搬家。

出参也别直接给聚合根:给一个 `OrderView`,外部拿到只读数据,没法绕过规则改状态。

## 领域事件:聚合攒着,应用层发出去

事情发生在聚合里(`place()` 成功),但"发到哪"是基础设施的事:

```java
public record OrderPlaced(OrderId orderId, String customerId, Money total, Instant occurredAt) { }
```

应用层把 `order.pullEvents()` 取出来交给 `DomainEventPublisher`。这样领域层不知道有 Kafka 这回事,换成内存队列或日志只改实现类。

## 防腐层:上下文之间要有翻译官

跟外部系统(支付网关、老系统、别的上下文)打交道时,**不要让它们的模型渗进你的领域层**。做法是加一层适配器:

```text
领域模型 Order  ←  防腐层(ACL)  →  外部模型 PaymentOrder / legacy_order
```

防腐层负责字段映射、单位换算、状态对齐。它的存在价值是:外部接口换个字段名,你的 `Order` 不用动。

## 什么时候不该上 DDD

说实话的时候到了:

- **纯 CRUD 的管理后台**:一张表增删改查,规则就是"必填校验",四层只是多写三倍文件;
- **业务规则还没稳定的新项目**:先跑通再说,过早划上下文会把错误的边界固化成目录;
- **团队里没有人能代表业务**:DDD 的前提是有人能把业务语言讲清楚,没有的话模型会失真。

判断标准不是"项目大不大",而是:**有没有值得守的规则和会变的业务**。有,就值得;没有,分层就够用了。

## 五个常见误解

1. **贫血模型**:实体只有 getter/setter,规则全在 Service 里 —— 目录是 DDD 的,模型是反 DDD 的。规则跟着数据走,才是领域模型。
2. **一张表一个类**就叫实体。表是存储结构,实体是一致性边界,它们的边界经常对不上。
3. **把所有 Service 都叫"领域服务"**。领域服务是"跨聚合的业务动作",大部分 Service 其实是应用服务。
4. **仓储 = DAO**。仓储按聚合存取,DAO 按表;接口位置也反过来。
5. **DTO 到处飞**。领域层内部传递的是领域对象;DTO 只出现在边界(接口层入参、查询出参)。

## 一句话总结

**先划边界(一套语言、一个模型),再把规则关进聚合根,最后让领域层不依赖任何框架。** 分层目录只是这三件事的影子;反过来照着目录填代码,得到的往往是贫血模型加一堆事务脚本。
