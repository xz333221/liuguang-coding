---
title: JPA / Hibernate 一览:与 MyBatis 的分工
summary: 'JPA 是 Jakarta EE 的对象关系映射规范,Hibernate 是它的实现;@Entity 描述表结构,EntityManager 的 persist、find、merge、remove 操作持久化上下文;JPQL 面向实体查询,懒加载处理不当会产生 N+1。JPA 以对象模型为中心,MyBatis 以 SQL 为中心。'
category: java
node: java-persistence-jpa
order: 81
level: 深入
tags: [JPA, Hibernate, EntityManager, N+1, ORM]
updated: 2026-11-19
mindmap: jpa-hibernate.mindmap.json
terms: ["runtime", "object", "identity"]
sources:
  - title: Jakarta Persistence 规范
    url: https://jakarta.ee/specifications/persistence/
    note: JPA 的规范定义与版本说明。
  - title: Hibernate ORM 文档
    url: https://hibernate.org/orm/documentation/
    note: 实体映射、持久化上下文与查询的官方文档入口。
  - title: Spring Framework Reference · Data Access
    url: https://docs.spring.io/spring-framework/reference/data-access.html
    note: Spring 对 JPA 的集成与事务管理。
---

上一篇的 JDBC 只负责执行 SQL,结果集到对象的转换要手写;MyBatis 把 SQL 集中管理,映射仍以 SQL 为起点。JPA 从另一端出发:先定义对象模型,再由框架生成并执行 SQL。这一篇看 JPA 与 Hibernate 的关系、核心 API,以及与 MyBatis 的分工。

## 规范与实现

JPA(Java Persistence API,现为 Jakarta Persistence)是对象关系映射(Object-Relational Mapping,ORM)的规范:定义实体注解、EntityManager 接口与 JPQL 查询语言,不提供实现。Hibernate 是最常用的实现,此外还有 EclipseLink。Spring Data JPA 在 JPA 之上再封装一层 Repository 接口,减少样板代码。三者关系:JPA 规定做什么,Hibernate 负责怎么做,Spring Data JPA 负责少写代码。

## 实体映射

一个类标注 @Entity 即成为实体,对应一张表:

```java
@Entity
@Table(name = "product")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    protected Product() { }        // JPA 要求无参构造

    public Product(String name, BigDecimal price) {
        this.name = name;
        this.price = price;
    }
    // getter 与 setter 省略
}
```

- @Entity:声明为实体,类名默认作为实体名;
- @Table:显式指定表名;
- @Id:主键字段;
- @GeneratedValue:主键生成策略,IDENTITY 对应数据库自增;
- @Column:列名、长度、精度与是否可空。

实体类需要无参构造(可为 protected),因为 Hibernate 通过反射创建实例;字段不必 public,访问由框架经反射完成。

## EntityManager 的四个方法

EntityManager 是 JPA 的操作入口,常用四个方法:

- persist:把新对象纳入持久化上下文,对应 INSERT;
- find:按主键查询,先查一级缓存再查数据库,对应 SELECT;
- merge:把游离对象的状态合并回持久化上下文,对应 UPDATE;
- remove:删除持久化上下文中的对象,对应 DELETE。

```java
@PersistenceContext
private EntityManager em;

@Transactional
public void rename(long id, String newName) {
    Product p = em.find(Product.class, id);   // SELECT
    if (p == null) {
        throw new IllegalArgumentException("product not found: " + id);
    }
    p.setName(newName);                        // 无需 update 语句
}                                              // 提交时自动 UPDATE
```

最后一行体现 ORM 的核心:修改托管对象后不调用保存方法,事务提交时 Hibernate 对比快照生成 UPDATE。

## JPQL 与派生查询

JPQL 面向实体与字段,不面向表与列:

```java
List<Product> list = em.createQuery(
        "SELECT p FROM Product p WHERE p.price > :min ORDER BY p.price", Product.class)
        .setParameter("min", new BigDecimal("100"))
        .getResultList();
```

`Product` 是实体名,`p.price` 是字段名,由 Hibernate 在运行时转换为对应的表与列。JPQL 与数据库方言解耦,更换数据库时不必修改查询。

Spring Data JPA 进一步提供派生查询:按方法名生成 JPQL,不需要写实现。

```java
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByPriceGreaterThanOrderByPriceAsc(BigDecimal min);
}
```

方法名中的 findBy、查询条件与排序都参与解析。复杂查询仍然回退到 @Query 写 JPQL。

## 懒加载与 N+1

实体之间的关联可以是懒加载(lazy):查询订单时不立即加载订单项,首次访问时才发 SQL。它能避免加载无关数据,但使用不当会出现 N+1。

N+1 指查询 N 条主记录发 1 条 SQL,随后为每条记录各发 1 条 SQL 加载关联,总数变成 N+1:

```java
List<Order> orders = orderRepository.findAll();   // 1 条
for (Order o : orders) {
    System.out.println(o.getItems().size());      // 每个订单 1 条,共 N 条
}
```

解决方式是让一次查询把关联一并取出:JPQL 的 `JOIN FETCH`、Spring Data 的 @EntityGraph,或按批量大小配置 @BatchSize。原则是按用例选择抓取策略,不依赖默认值。

## 持久化上下文与脏检查

持久化上下文(persistence context)是 EntityManager 管理实体实例的集合,同一事务内同一主键只对应一个对象实例,这就是一级缓存。第二次 find 直接返回缓存中的对象,不发 SQL。

脏检查(dirty checking)指提交或 flush 时,Hibernate 把托管对象的当前状态与该实体加载时的快照比较,有差异就生成 UPDATE。所以修改字段后无需显式保存。二级缓存跨 EntityManager 共享,需要显式开启并配置缓存实现,默认关闭。多数场景先优化 SQL 与抓取策略,再考虑二级缓存。

## 事务与持久化上下文

持久化上下文的生命周期与事务绑定:事务开始时创建,提交时 flush 并关闭;事务结束后实体变为游离(detached)状态,再修改字段不会被同步。

```java
@Transactional
public void updatePrice(long id, BigDecimal price) {
    Product p = em.find(Product.class, id);
    p.setPrice(price);        // 托管状态,提交时 UPDATE
}

public void updateOutside(long id, BigDecimal price) {
    Product p = em.find(Product.class, id);   // 无事务,返回游离对象
    p.setPrice(price);                        // 不会写库
}
```

Spring 的 @Transactional 在这里的作用与上一篇相同:代理开启事务,同时创建持久化上下文。传播行为 REQUIRES_NEW 会开启新的上下文,同一行数据在两个上下文中可能对应不同对象实例。

## JPA 与 MyBatis 的分工

两者解决同一个问题:Java 对象与关系表之间的转换,区别在起点。

| 维度 | JPA / Hibernate | MyBatis |
| --- | --- | --- |
| 中心 | 对象模型,SQL 由框架生成 | SQL,结果映射由配置完成 |
| 上手成本 | 需理解映射关系与抓取策略 | 会写 SQL 即可使用 |
| 复杂查询 | JPQL 表达力有限,常需原生 SQL | 动态 SQL 直接可控 |
| 表结构变更 | 修改实体字段,影响面清晰 | 同时修改 SQL 与映射 |
| 性能调优 | 依赖抓取策略与生成的 SQL | 直接查看手写 SQL |

- 领域模型复杂、以增删改查为主、团队接受 ORM 概念,选 JPA;
- 报表多、SQL 复杂、需要精细控制执行计划,选 MyBatis;
- 同一项目可以并存:核心写操作走 JPA,复杂查询走 MyBatis 或 JdbcTemplate。

## 小结

- JPA 是规范,Hibernate 是实现,Spring Data JPA 在其上减少样板代码;
- @Entity 与 @Id、@GeneratedValue、@Column 描述对象到表的映射;
- EntityManager 的 persist、find、merge、remove 对应四种读写操作;
- 持久化上下文提供一级缓存与脏检查,提交时自动 flush;
- 懒加载使用不当产生 N+1,用 JOIN FETCH 或 @EntityGraph 按用例抓取;
- JPA 以对象模型为中心,MyBatis 以 SQL 为中心,按查询复杂度与团队习惯选择。

第 14 章从 MyBatis 的 SQL 管理写到 JPA 的对象映射,持久层的三条路径至此完整。第 15 章回到代码结构本身,看设计模式如何组织这些分层与扩展点。
