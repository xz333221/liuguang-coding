---
title: 事务与连接池
summary: '事务把多条 SQL 组成一个原子单元,Spring 的 @Transactional 由代理在方法前后开启、提交或回滚;传播行为决定事务如何加入或新建,隔离级别控制并发读的一致性;连接由 HikariCP 这样的连接池统一分配与回收。'
category: java
node: java-persistence-transaction
order: 79
level: 进阶
tags: [事务, "@Transactional", 传播行为, 隔离级别, HikariCP]
updated: 2026-11-19
mindmap: transaction-pool.mindmap.json
terms: ["runtime", "spring-boot", "bean"]
sources:
  - title: Spring Framework Reference · Transaction Management
    url: https://docs.spring.io/spring-framework/reference/data-access/transaction.html
    note: 声明式事务、传播行为与回滚规则的官方说明。
  - title: HikariCP
    url: https://github.com/brettwooldridge/HikariCP
    note: 核心参数与连接池配置建议。
  - title: Oracle Java 教程 · JDBC Transactions
    url: https://docs.oracle.com/javase/tutorial/jdbc/basics/transactions.html
    note: autocommit、commit 与 rollback 的基础用法。
---

上一篇的条件构造器解决了 SQL 的拼装与分页,但一次业务操作往往包含多条 SQL:扣款与入账必须同时成功,任何一步失败都要整体撤销。这种「要么全部生效,要么全部不生效」的约束由事务提供,而事务运行在数据库连接上,连接的创建与复用由连接池管理。

## 事务与 ACID

事务(transaction)是一组要么全部提交、要么全部回滚的数据库操作。ACID 是它要满足的四个性质:

- 原子性(Atomicity):事务内的操作不可分割,失败时全部撤销;
- 一致性(Consistency):事务前后数据满足约束,例如转账前后总金额不变;
- 隔离性(Isolation):并发事务之间互不干扰,干扰程度由隔离级别决定;
- 持久性(Durability):提交后的修改写入磁盘,即使宕机也不丢失。

数据库直接保证原子性、隔离性与持久性,一致性由应用逻辑与约束共同维护。

## JDBC 的提交方式

JDBC 连接默认 autocommit 为 true,每条 SQL 单独提交,无法跨语句回滚。要显式控制事务,先关闭自动提交,再在成功时 commit、失败时 rollback:

```java
try (Connection conn = dataSource.getConnection()) {
    conn.setAutoCommit(false);
    try {
        update(conn, "UPDATE account SET balance = balance - 100 WHERE id = 1");
        update(conn, "UPDATE account SET balance = balance + 100 WHERE id = 2");
        conn.commit();
    } catch (SQLException e) {
        conn.rollback();
        throw e;
    } finally {
        conn.setAutoCommit(true);   // 归还连接池前恢复默认值
    }
}
```

`finally` 中恢复 autocommit 是必要步骤:连接会被连接池回收给下一个请求,带着未结束的事务或为 false 的提交模式会产生难以复现的问题。

## @Transactional 的原理

手写提交与回滚样板重复,Spring 用注解声明事务边界:

```java
@Service
public class TransferService {
    private final AccountMapper accountMapper;

    public TransferService(AccountMapper accountMapper) {
        this.accountMapper = accountMapper;
    }

    @Transactional
    public void transfer(long from, long to, BigDecimal amount) {
        accountMapper.debit(from, amount);
        accountMapper.credit(to, amount);
    }
}
```

注解本身只是元数据,不产生任何行为。Spring 启动时为标注了 @Transactional 的 Bean 创建代理,代理对象在运行时拦截方法调用:从连接池取连接、关闭 autocommit、执行目标方法,正常返回则提交,抛出符合条件的异常则回滚,最后归还连接。这正是第 8 章动态代理的应用:事务逻辑被织入调用链,业务方法只描述做什么。

代理只能拦截经代理对象进入的调用。同一个类内部一个方法直接调用另一个标注了 @Transactional 的方法,不经过代理,注解不生效,这是最常见的失效场景:

```java
@Service
public class OrderService {
    public void create(Order order) {
        save(order);   // 同类自调用,不经过代理,save 上的 @Transactional 失效
    }

    @Transactional
    public void save(Order order) { ... }
}
```

解决办法是把事务方法拆到另一个 Bean,由注入的代理对象调用。不要依赖自调用。

## 传播行为

传播行为(propagation)规定当前已经存在事务时,新方法的事务如何加入或新建。常用三种:

- REQUIRED(默认):有事务则加入,没有则新建。两个方法共用一个事务,任一失败整体回滚。
- REQUIRES_NEW:始终新建事务,原事务挂起。新事务的提交或回滚不影响原事务,适合必须独立留痕的操作,如审计日志。
- NESTED:在当前事务内创建保存点(savepoint),失败只回滚到保存点,外层可以继续。要求底层驱动支持保存点。

独立提交的写法是 `@Transactional(propagation = Propagation.REQUIRES_NEW)`,用在审计方法上。选择依据是失败的影响范围:同一业务单元用 REQUIRED,需要独立提交用 REQUIRES_NEW,允许局部失败用 NESTED。

## 隔离级别与并发问题

多个事务并发读写同一批数据时,可能出现三种读异常:

- 脏读:读到另一个事务尚未提交的修改,对方回滚后读到的数据从未存在;
- 不可重复读:同一事务内两次读同一行,结果不同,因为期间被其他事务修改并提交;
- 幻读:同一事务内两次按条件查询,第二次多出或少掉若干行,因为期间有插入或删除。

SQL 标准定义四个隔离级别,逐级加强:

| 级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED | 避免 | 可能 | 可能 |
| REPEATABLE READ | 避免 | 避免 | 可能 |
| SERIALIZABLE | 避免 | 避免 | 避免 |

隔离级别越高,并发度越低。MySQL 的 InnoDB 默认 REPEATABLE READ,Oracle 与 PostgreSQL 默认 READ COMMITTED。Spring 可以在注解上指定 `isolation = Isolation.READ_COMMITTED`,没有明确需求时保持数据库默认值。

## 回滚规则

默认只对 RuntimeException 与 Error 回滚;受检异常(checked exception)不回滚,事务照样提交。实际项目中通常希望任何异常都回滚,因此显式声明 `@Transactional(rollbackFor = Exception.class)`。

被 catch 吞掉的异常不会触发回滚:代理看不到异常,认为方法正常返回。需要回滚时要么继续抛出,要么调用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`。

## 只读事务与超时

查询方法可以标注 `@Transactional(readOnly = true)`,向驱动与数据库声明不写数据,部分数据库可以据此优化。事务超时用同一注解的 `timeout` 设置,单位为秒,超时后事务被回滚,防止长事务长期占用连接与锁:

```java
@Transactional(readOnly = true, timeout = 5)
public List<Order> recent() { ... }
```

## 连接池

事务依赖数据库连接,而建立连接涉及 TCP 握手、认证与会话初始化,成本远高于执行一条 SQL。连接池预先创建一批连接,业务代码借出、用完归还,避免频繁创建与销毁。

Spring Boot 默认使用 HikariCP,核心参数在 application.yml 中配置:

```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/shop
    username: app
    password: ${DB_PASSWORD}
    hikari:
      maximumPoolSize: 10
      minimumIdle: 5
      connectionTimeout: 3000      # 借连接的最长等待,毫秒
      idleTimeout: 600000          # 空闲连接回收,毫秒
      maxLifetime: 1800000         # 连接最长存活,毫秒
      leakDetectionThreshold: 20000
```

- maximumPoolSize:池中连接上限。并非越大越好:每个连接占用数据库内存与线程,数据库能承受的并发连接有限,池过大只会把压力推给数据库并增加上下文切换。常见取值在 10 到 20。
- minimumIdle:保持的最小空闲连接数,低于此值会补充。
- connectionTimeout:借不到连接时的最长等待,超时抛异常。设置过长会让请求线程长时间挂起。
- idleTimeout:空闲连接被回收的时间。
- maxLifetime:连接的最长寿命,应小于数据库或中间件主动断开连接的时间,避免取到已被服务端关闭的连接。

连接泄漏指借出的连接没有归还,可用连接逐渐减少,最终所有请求都在 connectionTimeout 上失败。开启 leakDetectionThreshold 后,HikariCP 会在连接被占用超过阈值时打印堆栈,据此定位没有关闭连接的代码。排查时优先检查手动获取连接的位置与异常路径。

## 小结

- ACID 是事务的四个性质,数据库保证原子性、隔离性与持久性;
- JDBC 默认自动提交,手动事务需关闭 autocommit 并在成功时 commit、失败时 rollback;
- @Transactional 由代理织入,同类自调用不经过代理,注解失效;
- 传播行为决定事务的加入与新建,隔离级别决定并发读的异常范围;
- 默认只对 RuntimeException 回滚,覆盖受检异常时写 rollbackFor;
- 连接池不是越大越好,maxLifetime 应小于数据库断连时间,泄漏用 leakDetectionThreshold 排查。

下一篇回到 JDBC:看 Connection 从哪里来、SQL 如何执行,以及 MyBatis 在它之上封装了什么。
