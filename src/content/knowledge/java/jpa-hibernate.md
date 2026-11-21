---
title: JPA / Hibernate 一览:与 MyBatis 的分工
summary: 'JPA 是 Jakarta EE 的对象关系映射规范，Hibernate 是它最常用的实现，Spring Data JPA 再省掉一层样板；@Entity 描述表结构，EntityManager 的 persist / find / merge / remove 操作持久化上下文，脏检查让改动自动产生 UPDATE;JPQL 面向实体查询，派生方法名生成查询，懒加载处理不当会变成 N+1。JPA 以对象为中心，MyBatis 以 SQL 为中心。'
category: java
node: java-persistence-jpa
order: 81
level: 深入
tags: [JPA, Hibernate, EntityManager, N+1, ORM]
updated: 2026-11-20
mindmap: jpa-hibernate.mindmap.json
terms: ["jdk", "record", "identity"]
sources:
  - title: Jakarta Persistence 规范
    url: https://jakarta.ee/specifications/persistence/
    note: JPA 的规范定义与版本说明。
  - title: Hibernate ORM User Guide
    url: https://docs.jboss.org/hibernate/orm/6.6/userguide/html_single/Hibernate_User_Guide.html
    note: 实体映射、持久化上下文与查询的官方文档。
  - title: Spring Data JPA Reference
    url: https://docs.spring.io/spring-data/jpa/reference/
    note: 派生查询、分页与 @Query 的用法。
---

前面三篇全在 SQL 这一侧：自己写语句、自己管事务。JPA 走的是另一条路——你只管操作对象，SQL 由框架生成。两套思路没有对错，只有适用场景，这一篇把 JPA 那套讲清楚，也讲清楚它和 MyBatis 该怎么分。

## 规范与实现

- **JPA**(Jakarta Persistence API)是一份**规范**，只定义接口与注解，不提供实现；
- **Hibernate** 是最常用的实现，另有 EclipseLink;
- **Spring Data JPA** 在 Hibernate 之上再包一层：写个接口继承 `JpaRepository`，方法名按约定起，实现类由框架生成。

平时说的「用 JPA」，实际是「用 Hibernate 加 Spring Data JPA 的便利封装」。

## 实体映射

```java
@Entity
@Table(name = "t_order")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_no", nullable = false, length = 32)
    private String orderNo;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)      // 存字符串,别存序号
    private OrderStatus status;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    // getter / setter
}
```

几个必须记住的点：

- 实体类不能是 `final`，字段不能用 `final`，并且要有无参构造方法——Hibernate 靠反射造对象；
- `@Enumerated` 一定显式写 `STRING`。默认是 `ORDINAL`，存的是 0、1、2，以后枚举顺序一改，历史数据全部错位；
- 关联默认是 `EAGER`(`@ManyToOne`)或 `LAZY`(`@OneToMany`)，而 `LAZY` 只是「不立刻查」，不是「不查」。

## EntityManager 与持久化上下文

```java
Order order = new Order();
order.setOrderNo("NO20261120001");
em.persist(order);                 // 交给上下文管理,相当于 insert

Order found = em.find(Order.class, 1L);     // 按主键查,先看上下文里有没有
found.setAmount(new BigDecimal("99.00"));   // 改字段,不用调 update

em.remove(found);                  // 删除
```

第二段最能体现 JPA 的思路：改完字段**不用调 `update`**。`EntityManager` 维护一个持久化上下文(一级缓存)，里面存着从数据库取出来的对象；事务提交时，Hibernate 会把每个对象的当前状态和它记录的**快照**比对，发现变化就生成 `UPDATE`。这叫脏检查。

代价是：你在实体上随便改一个字段，提交时就可能产生一次全字段 `UPDATE`。不想被更新时用 `@Transactional(readOnly = true)` 或 `em.detach(obj)`。

持久化上下文里同一主键只有一个对象实例：`find` 两次拿到的是同一个引用。事务结束后对象变成**游离态**，再改字段不会同步到数据库。

`merge` 是把游离态对象的字段复制到上下文里的受管对象上，不是「直接更新一行」。返回值才是受管对象，对入参对象的修改没有意义——这点和直觉相反，是新手最常踩的坑。

## 查询：JPQL 与派生方法

JPQL 面向实体，不写表名列名：

```java
List<Order> list = em.createQuery(
        "select o from Order o where o.status = :status order by o.id desc", Order.class)
    .setParameter("status", OrderStatus.PAID)
    .setMaxResults(20)
    .getResultList();
```

Spring Data JPA 再省一步，方法名就是查询：

```java
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatusOrderByIdDesc(OrderStatus status);

    @Query("select o from Order o where o.amount > :min")
    List<Order> findExpensive(@Param("min") BigDecimal min);
}
```

派生查询适合两三个条件的简单查询；条件一多，方法名会长到没法读，这时候写 `@Query`。需要用到数据库方言特有语法时，`nativeQuery = true` 直接写原生 SQL。

## N+1:JPA 最经典的性能坑

```java
List<Order> orders = repository.findByStatus(PAID);   // 1 条 SQL
for (Order o : orders) {
    o.getItems().size();                              // 每条订单再查一次:Lazy 触发
}
```

100 个订单就是 101 次查询。三种解法：

1. `@Query("select distinct o from Order o join fetch o.items where ...")`——`join fetch` 一次拉回；
2. `@EntityGraph(attributePaths = "items")`——写法更干净，效果同上；
3. 设 `hibernate.default_batch_fetch_size`——把 N 次变 N/批次 次，治标但省事。

注意 `join fetch` 遇到一对多 + 分页时会出问题：Hibernate 是在内存里分页的，数据量大会拖垮内存，日志里会有 `firstResult/maxResults specified with collection fetch; applying in memory` 的警告。

## 与 MyBatis 的分工

| | JPA / Hibernate | MyBatis |
| --- | --- | --- |
| 中心 | 对象模型，SQL 自动生成 | SQL，手写语句 |
| 上手成本 | 高(上下文、级联、懒加载) | 低(会 SQL 就会) |
| 单表 CRUD | 几乎零代码 | 需 BaseMapper 或 XML |
| 复杂查询 | 生成 SQL 难控，常要落回原生 | 完全可控 |
| 团队协作 | 依赖对 ORM 的理解 | 依赖对 SQL 的理解 |
| 典型场景 | 领域模型复杂、写多读少 | 报表、多表关联、存量系统 |

现实里最常见的组合是：CRUD 与简单查询用 JPA 或 MyBatis-Plus，报表和复杂查询手写 SQL。两者可以在一个项目里并存，各自接不同的表或不同的读模型——不必为了统一而统一。

## 小结

- JPA 是规范，Hibernate 是实现，Spring Data JPA 是再一层的封装；
- 实体要无参构造、不能 final;`@Enumerated` 必须写 `STRING`;
- `EntityManager` 维护持久化上下文，脏检查让改动自动变 UPDATE;
- `merge` 返回受管对象，改入参无效；事务结束后对象变游离态；
- JPQL 面向实体，派生查询按方法名生成，复杂条件写 `@Query`;
- N+1 用 `join fetch`、`@EntityGraph` 或 `batch_fetch_size` 解决，一对多 + 分页要小心内存分页；
- JPA 以对象为中心，MyBatis 以 SQL 为中心，同一项目里可以按场景并存。

第 14 章结束。下一章讲设计模式：业务里真会用到的那几个。
