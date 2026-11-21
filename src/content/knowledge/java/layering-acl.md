---
title: 分层与防腐层
summary: '四个层次：表现层、应用层、领域层、基础设施层，依赖方向一律指向领域层；仓储接口由领域层定义、实现放在基础设施层，领域层因此不依赖 Spring 与数据库；应用服务只编排用例、控制事务，业务规则留在聚合里；防腐层把外部系统的字段、状态码与单位转换成本上下文的模型，只转换不写规则。'
category: java
node: java-ddd-layering
order: 88
level: 深入
tags: [DDD, 分层架构, 应用服务, 仓储, 防腐层]
updated: 2026-11-20
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

前几篇有了上下文、聚合、值对象与事件，这一篇解决最后一个问题：这些代码分别放在哪个包里，谁可以依赖谁。

## 四层与一条依赖方向

```
表现层 Controller      接收 HTTP,参数校验,返回 DTO
    ↓
应用层 ApplicationService  编排用例:取聚合 → 调方法 → 存回去 → 发事件
    ↓
领域层 Entity / ValueObject / DomainService / Repository 接口
    ↑
基础设施层 Repository 实现 / Mapper / 外部系统客户端
```

关键在最后那条**向上的箭头**:基础设施层实现领域层定义的接口，所以依赖方向是「基础设施 → 领域」。领域层不 import Spring、不 import MyBatis、不认识 `@Service`。它是一堆纯 Java 类，能在单元测试里直接 `new` 出来跑。

这条依赖倒置，换来的是：业务规则可以脱离框架测试，换 ORM 不动领域代码，框架升级不碰核心逻辑。

## 仓库接口在领域层

```java
// 领域层:只描述「需要什么」
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}
```

```java
// 基础设施层:说明「怎么做到」
@Repository
public class MyBatisOrderRepository implements OrderRepository {

    private final OrderMapper mapper;

    @Override
    public Optional<Order> findById(OrderId id) {
        return Optional.ofNullable(mapper.selectById(id.value()))
                .map(OrderPo::toDomain);
    }

    @Override
    public void save(Order order) {
        mapper.insert(OrderPo.from(order));
    }
}
```

领域层只认识 `OrderRepository` 这个接口，启动时 Spring 把实现注入进来。仓储的粒度是**聚合**，一个聚合一个仓储，不要给每条表都建一个。

`OrderPo`(持久化对象)与 `Order`(领域对象)是两个类，转换发生在基础设施层。这一步看起来啰嗦，但它把「数据库长什么样」挡在了领域层外面：表加了字段、列改了名，只改 `OrderPo`。

## 应用服务：只编排，不写规则

```java
@Service
public class OrderAppService {

    private final OrderRepository orders;
    private final InventoryClient inventory;
    private final ApplicationEventPublisher publisher;

    @Transactional
    public String place(PlaceCmd cmd) {
        Order order = Order.create(OrderId.next());          // 聚合自己保证规则
        cmd.items().forEach(i -> order.addItem(i.sku(), i.qty(), i.price()));

        inventory.deduct(order.skuQtyMap());                 // 跨上下文:防腐层客户端
        orders.save(order);
        order.pullEvents().forEach(publisher::publishEvent);
        return order.id().value();
    }
}
```

这段代码里没有一条 `if` 是业务规则——规则都在 `Order` 里。应用服务干四件事：取参数、取聚合、调聚合方法、存回去并处理事务与事件。

常见的错误是「应用服务包揽一切」:校验、计算、组装全写在 service 里，聚合退化成只有 getter/setter 的数据袋。这种叫**贫血模型**，业务规则散落在多个 service 里，规则一改要搜全项目。判断方法：如果你的 `Order` 类只有字段和 getter，而 `OrderService` 有八百行，那就是贫血。

也有反过来的极端：把事务、发消息、调外部接口写进聚合。聚合应该是纯内存对象，不依赖任何基础设施，否则没法单测。

## 防腐层：挡住外部模型

上游是外部系统或老系统时，它的模型不该流进你的领域层：

```java
// 外部系统返回的东西:字段缩写、状态码是数字、金额单位是分
public record LegacyStockResp(int s, long q, String u) {}

// 防腐层:翻译成本上下文能懂的语言
@Component
public class LegacyStockAdapter implements StockPort {

    private final LegacyClient client;

    @Override
    public StockInfo query(Sku sku) {
        LegacyStockResp r = client.get(sku.value());
        return new StockInfo(
                sku,
                Math.toIntExact(r.q()),
                StockState.fromCode(r.s()));      // 3 → AVAILABLE
    }
}
```

防腐层做三件事：翻译字段与状态码、转换单位(分↔元、磅↔千克)、兜住外部异常并转成本上下文的错误类型。

它**只转换，不写业务规则**。如果适配器里开始出现「库存小于 10 就预警」这种判断，那说明规则放错地方了——应该放在领域层，由它接收 `StockInfo` 之后决定。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 250" role="img" aria-label="防腐层把外部系统的响应转换成本上下文的领域对象">
    <defs>
      <marker id="aclArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="238" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="32" y="60" width="216" height="110" rx="12" fill="var(--canvas)" stroke="var(--line)" />
    <text x="140" y="84" font-size="12" fill="var(--muted)" text-anchor="middle">外部系统</text>
    <text x="140" y="108" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)" text-anchor="middle">LegacyStockResp</text>
    <text x="140" y="128" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--muted)" text-anchor="middle">s=3, q=120, u="pcs"</text>
    <text x="140" y="152" font-size="10.5" fill="var(--muted)" text-anchor="middle">字段缩写，状态码是数字</text>
    <line x1="256" y1="115" x2="300" y2="115" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#aclArrow)" />
    <rect x="306" y="52" width="160" height="126" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="386" y="80" font-size="12.5" font-weight="700" fill="var(--ink)" text-anchor="middle">防腐层</text>
    <text x="386" y="104" font-size="11" fill="var(--muted)" text-anchor="middle">3 → AVAILABLE</text>
    <text x="386" y="126" font-size="11" fill="var(--muted)" text-anchor="middle">分 → 元，磅 → 千克</text>
    <text x="386" y="148" font-size="11" fill="var(--muted)" text-anchor="middle">异常 → 本上下文错误</text>
    <line x1="474" y1="115" x2="518" y2="115" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#aclArrow)" />
    <rect x="524" y="60" width="204" height="110" rx="12" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="626" y="84" font-size="12" fill="var(--muted)" text-anchor="middle">领域层</text>
    <text x="626" y="108" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)" text-anchor="middle">StockInfo</text>
    <text x="626" y="128" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--muted)" text-anchor="middle">sku, qty, StockState</text>
    <text x="626" y="152" font-size="10.5" fill="var(--muted)" text-anchor="middle">只说业务语言</text>
    <text x="32" y="210" font-size="12" fill="var(--muted)">适配器只做翻译：不在这里判断「库存低于 10 就预警」，那是领域层的规则。</text>
  </svg>
  <figcaption>外部字段名留在适配器里，领域层永远看不到 <code>s</code> / <code>q</code> 这种缩写。</figcaption>
</figure>

## 常见误区

- **表现层直接调仓储**。Controller → Repository 跳过了应用层，事务边界和事件发布都没了。小项目偶尔图快，代价是后面加一个「下单后发消息」要改所有 Controller;
- **领域层引入 Spring 注解**。`@Service` 一出现在实体上，单测就要起容器，依赖倒置也就破了；
- **DTO 与领域对象混用**。`@RequestBody` 直接绑到 `Order` 上，前端就能改 `status`、`total`。入参用 DTO，转换在应用层做；
- **按技术分包**。`controller/` 下放所有 Controller、`service/` 下放所有 Service，业务一复杂就找不到东西。按上下文分包，包内再分层，是更耐长的结构。

## 小结

- 四层：表现、应用、领域、基础设施；依赖方向一律指向领域层；
- 仓储接口定义在领域层、实现在基础设施层，粒度是聚合；`Order` 与 `OrderPo` 分开，转换在基础设施层；
- 应用服务只编排用例、控制事务与事件，业务规则留在聚合里；
- 贫血模型(只有 getter 的实体 + 八百行 service)是最常见的退化形态；
- 防腐层翻译字段、状态码、单位，只转换不写规则；
- 别让表现层直连仓储，别把 Spring 注解放进领域层，入参用 DTO。

第 16 章结束。下一章换到算法：先学会估算一个写法贵不贵。
