---
title: 分层与防腐层
summary: '把领域模型放进表现、应用、领域、基础设施四层,依赖方向指向领域层,仓储接口由领域层定义、实现放在基础设施层;应用服务只编排用例,业务规则留在聚合与领域服务;防腐层把外部系统的字段、状态码与单位转换成本上下文的模型,不让外部模型进入领域层。'
category: java
node: java-ddd-layering
order: 88
level: 深入
tags: [DDD, 分层架构, 应用服务, 仓储, 防腐层]
updated: 2026-11-19
mindmap: layering-acl.mindmap.json
terms: ["ddd", "application-service", "repository", "anti-corruption-layer"]
sources:
  - title: Martin Fowler · PresentationDomainDataLayering
    url: https://martinfowler.com/bliki/PresentationDomainDataLayering.html
    note: 表现、领域、数据分层的职责与依赖方向。
  - title: Martin Fowler · BoundedContext
    url: https://martinfowler.com/bliki/BoundedContext.html
    note: 上下文边界与防腐层的作用。
  - title: Spring Framework Reference · The IoC Container
    url: https://docs.spring.io/spring-framework/reference/core/beans.html
    note: '@Service、@Repository 与依赖注入的容器机制。'
---

上一篇的值对象与领域事件解决了模型内部如何表达值、如何通知变化。剩下一个组织问题:这些对象放在哪一层,谁可以依赖谁,外部系统的模型怎样隔离在边界之外。

## 四层与依赖方向

领域驱动设计沿用经典分层,把代码分成四层:

- 表现层:Controller、请求参数校验、DTO 转换;
- 应用层:应用服务,一个方法对应一个用例,负责流程与事务边界;
- 领域层:实体、值对象、领域服务、仓储接口、领域事件;
- 基础设施层:数据库、消息队列、外部接口的实现。

依赖方向从外向内:表现层依赖应用层,应用层依赖领域层;基础设施层实现领域层定义的接口。领域层不依赖 Spring、MyBatis 或 Web 框架,编译期只依赖 JDK。

仓储接口由领域层声明、实现放在基础设施层,这就是依赖倒置:源码依赖指向领域层,运行时由容器注入具体实现。

## 应用服务:编排用例

应用服务(application service)负责取聚合、调用聚合方法、保存、发布事件。业务规则留在聚合里,应用服务只决定顺序与事务。

```java
@Service
public class PayOrderApplicationService {
    private final OrderRepository orders;
    private final ApplicationEventPublisher events;
    public PayOrderApplicationService(OrderRepository orders, ApplicationEventPublisher events) {
        this.orders = orders;
        this.events = events;
    }
    @Transactional
    public void pay(String orderId) {
        Order order = orders.findById(new OrderId(orderId))
                .orElseThrow(() -> new IllegalArgumentException("订单不存在: " + orderId));
        order.pay();                 // 能否支付由聚合判断
        orders.save(order);
        order.pullEvents().forEach(events::publishEvent);
    }
}
```

方法里没有 if (status == ...) 之类的状态判断,也没有折扣计算。这些规则属于 Order;应用服务只把一次请求需要的几步串起来。一个用例一个方法,调用方一眼就能看出系统提供哪些能力。

## 领域服务:跨实体的规则

领域服务(domain service)放置不属于单个实体、又确实是业务规则的逻辑。例如转账时校验两个账户的日累计限额,规则同时涉及两个账户,放进任一 Account 都不合适,可以放进 TransferService。领域服务无状态,参数与返回值都是领域对象,命名使用业务术语。

只涉及一个聚合的规则不要上移到领域服务,否则聚合会退化成数据容器。

## 仓储:接口与实现分离

仓储(repository)以聚合为单位提供存取,接口属于领域层,实现属于基础设施层:

```java
// domain 包
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}

// infrastructure 包
@Repository
public class JdbcOrderRepository implements OrderRepository {
    private final JdbcTemplate jdbc;
    public JdbcOrderRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override
    public Optional<Order> findById(OrderId id) {
        List<OrderLine> lines = jdbc.query(
                "select sku, unit_price, quantity from order_line where order_id = ?",
                (rs, i) -> new OrderLine(rs.getString("sku"),
                        rs.getBigDecimal("unit_price"), rs.getInt("quantity")),
                id.value());
        return lines.isEmpty() ? Optional.empty() : Optional.of(Order.restore(id, lines));
    }
    @Override
    public void save(Order order) {
        // insert 或 update 聚合根与明细,整个聚合在一个事务内完成
    }
}
```

领域层只认识 OrderRepository 接口,单元测试可以传入内存实现,不需要数据库。更换持久化方案时只改基础设施层。

## 防腐层:隔离外部模型

防腐层(anti-corruption layer,ACL)是上下文边界上的转换层,负责把外部系统的数据结构、状态码与单位转换成本上下文的领域对象。外部接口改字段或改状态机时,只改 ACL,领域层不受影响。

```java
import java.math.BigDecimal;
public class Main {
    enum PaymentStatus { SUCCESS, PENDING, UNKNOWN }

    record PaymentResult(String tradeNo, BigDecimal amount, PaymentStatus status) {}

    // 第三方返回的对象:字段名与状态码由对方定义
    static final class ThirdPartyPayResponse {
        String trade_no;
        String trade_status;
        long total_fee;   // 单位:分
    }

    // 防腐层:转换状态与单位
    static PaymentResult toDomain(ThirdPartyPayResponse response) {
        PaymentStatus status = switch (response.trade_status) {
            case "TRADE_SUCCESS" -> PaymentStatus.SUCCESS;
            case "WAIT_BUYER_PAY" -> PaymentStatus.PENDING;
            default -> PaymentStatus.UNKNOWN;
        };
        return new PaymentResult(response.trade_no, BigDecimal.valueOf(response.total_fee, 2), status);
    }

    public static void main(String[] args) {
        ThirdPartyPayResponse response = new ThirdPartyPayResponse();
        response.trade_no = "T20261119001";
        response.trade_status = "TRADE_SUCCESS";
        response.total_fee = 19900;
        System.out.println(toDomain(response));
        // PaymentResult[tradeNo=T20261119001, amount=199.00, status=SUCCESS]
    }
}
```

ACL 只做映射:状态码对齐、单位换算、字段改名。折扣、风控这类判断属于业务规则,放回领域层。外部模型不变时 ACL 可以很薄;外部模型频繁变化时,这一层能挡住大部分修改。

## DTO 与领域对象的转换边界

Controller 接收请求 DTO,应用服务把 DTO 转成聚合方法需要的参数,返回时把领域对象转成响应 DTO。不要让 Controller 直接返回聚合:内部集合、延迟加载代理与仅供领域使用的字段会暴露到接口,序列化还可能触发额外查询。

转换集中在一处:接口层做 DTO 与领域对象的映射,应用层只处理用例输入与输出。转换方向保持单向,领域对象不引用 DTO。

## 包结构建议

```text
com.example.order
├── interfaces        # Controller, Request/Response DTO
├── application       # 用例服务, 事务边界
├── domain            # Order, Money, OrderRepository, OrderPaid
└── infrastructure    # JdbcOrderRepository, PayClient, PayAcl
```

先按限界上下文分包,每个上下文内部再分层。跨上下文不直接 import 对方的领域对象,只通过事件、DTO 或 ACL 交互。

## 常见误区

- 贫血模型:实体只有 getter/setter,规则全部散落在 Service,聚合退化成数据表映射;
- Service 包揽一切:一个 OrderService 承担校验、计算、持久化与通知,任何改动都影响全部用例;
- 领域层引入 Spring:@Service、@Transactional 让领域对象脱离容器就无法测试;事务注解留在应用层,领域层保持纯 Java;
- 防腐层写业务规则:ACL 只做转换,规则判断放回领域层。

## 小结

- 四层依赖方向指向领域层,领域层不依赖框架,仓储接口由领域层定义;
- 应用服务编排用例与事务,业务规则留在聚合与领域服务;
- 仓储以聚合为单位存取,接口与实现分离,测试可替换为内存实现;
- 防腐层转换外部模型的状态码、单位与字段,不承担业务规则;
- DTO 与领域对象在接口边界转换,Controller 不直接返回聚合;
- 常见误区是贫血模型、Service 包揽一切与领域层引入框架。

第 16 章到这里结束。下一篇进入第 17 章,从时间复杂度与 Big-O 开始,讨论怎样估算一个写法在大数据量下的代价。
