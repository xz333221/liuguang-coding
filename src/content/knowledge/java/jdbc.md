---
title: 'JDBC 与连接池：SQL 到对象的最短路径'
summary: 'JDBC 用 DriverManager、Connection、PreparedStatement、ResultSet 四个接口直接执行 SQL;JDBC 4 起驱动靠 SPI 自动发现，不用 Class.forName;PreparedStatement 预编译绑定参数，拼接字符串才会被注入；批量用 addBatch / executeBatch，事务在 Connection 上控制。业务代码不直接写 JDBC，是因为资源管理、异常转换与结果映射的样板太多。'
category: java
node: java-persistence-jdbc
order: 80
level: 进阶
tags: [JDBC, PreparedStatement, ResultSet, 驱动, 批量]
updated: 2026-11-20
mindmap: jdbc.mindmap.json
terms: ["protocol", "runtime", "maven"]
sources:
  - title: Oracle Java 教程 · JDBC Basics
    url: https://docs.oracle.com/javase/tutorial/jdbc/basics/
    note: 连接、语句、结果集与事务的基础用法。
  - title: java.sql 包说明
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/package-summary.html
    note: Connection、PreparedStatement、ResultSet 等接口的官方定义。
  - title: Spring Framework Reference · Data Access with JDBC
    url: https://docs.spring.io/spring-framework/reference/data-access/jdbc.html
    note: JdbcTemplate 消除样板代码的思路。
---

前面几篇用的 `BaseMapper`、`@Transactional` 都搭在 JDBC 上。这层平时不碰，但要判断「框架替我做了什么」「这个报错到底出在哪一层」，得知道它的四个接口。

## 四个核心接口

| 接口 | 职责 |
| --- | --- |
| `DriverManager` | 按 URL 找驱动，建立 `Connection` |
| `Connection` | 一个数据库会话，控制事务与关闭 |
| `PreparedStatement` | 带占位符的 SQL，执行并返回结果 |
| `ResultSet` | 结果集游标，按列取值 |

一次完整查询：

```java
String url = "jdbc:mysql://localhost:3306/order?useSSL=false&serverTimezone=Asia/Shanghai";

try (Connection conn = DriverManager.getConnection(url, "order_app", pwd);
     PreparedStatement ps = conn.prepareStatement(
             "select id, order_no, amount from t_order where status = ? limit ?")) {

    ps.setInt(1, 1);
    ps.setInt(2, 20);

    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            long id = rs.getLong("id");
            String no = rs.getString("order_no");
            BigDecimal amount = rs.getBigDecimal("amount");
            System.out.println(id + " " + no + " " + amount);
        }
    }
}
```

`try-with-resources` 按声明逆序关闭：`ResultSet` → `Statement` → `Connection`。漏掉任何一个，连接就不会归还，池很快被借空。

取值的几个细节：`rs.next()` 把游标移到下一行，第一行之前必须调一次，返回 false 说明没有数据；列下标从 1 开始，不是 0;`getInt` 遇到 SQL NULL 返回 0，想区分「没有值」要用 `rs.wasNull()` 或改取包装类型。

## 驱动从哪来

老代码里有这么一行：

```java
Class.forName("com.mysql.cj.jdbc.Driver");
```

这是 JDBC 4 之前的写法，靠显式加载类来触发静态块注册驱动。**JDBC 4 起不需要了**:驱动 jar 的 `META-INF/services/java.sql.Driver` 里写了实现类名，`DriverManager` 用 SPI 自动发现。

所以现在报 `No suitable driver found`，原因只有两个：驱动依赖没进 classpath，或者 URL 写错了(前缀不认识)。而不是「忘了 Class.forName」。

Spring Boot 里连 URL 都不用写，`spring.datasource.url` 一配，自动配置就建好了 `DataSource`。

## PreparedStatement:预编译挡注入

```java
// 正确:占位符,值单独传给数据库,不参与 SQL 解析
ps = conn.prepareStatement("select * from t_user where u_name = ?");
ps.setString(1, name);

// 错误:字符串拼接
String sql = "select * from t_user where u_name = '" + name + "'";
```

第二种写法，当 `name` 是 `' or '1'='1` 时，SQL 变成 `where u_name = '' or '1'='1'`，全表数据被拖出来——这就是 SQL 注入。占位符能彻底堵住它，因为参数是作为「值」走二进制协议传的，数据库不会把它当语法解析。

预编译还有一个收益：同一条 SQL 执行多次时，数据库可以复用执行计划。批量插入几万行时这个差别很明显。

## 批量操作

逐条 `executeUpdate` 是几万次网络往返。批量把多条语句攒起来一次发：

```java
String sql = "insert into t_order_item (order_id, sku, qty) values (?, ?, ?)";

try (PreparedStatement ps = conn.prepareStatement(sql)) {
    int n = 0;
    for (OrderItem it : items) {
        ps.setLong(1, it.orderId());
        ps.setString(2, it.sku());
        ps.setInt(3, it.qty());
        ps.addBatch();

        if (++n % 1000 == 0) {        // 分批提交,控制内存与锁持有时间
            ps.executeBatch();
            ps.clearBatch();
        }
    }
    ps.executeBatch();
}
```

MySQL 驱动要开 `rewriteBatchedStatements=true`，否则驱动仍然一条一条发，批量只是省了往返次数，提升有限。开了之后驱动会把 `insert ... values (?,?),(?,?),...` 合并成一条，速度差好几倍。

## 事务在 Connection 上

上一篇讲过，`conn.setAutoCommit(false)` 之后，`commit` / `rollback` 都作用于这个连接。要点是：**事务绑定在连接上，不是绑定在方法或线程上**。同一个事务里的所有 SQL 必须走同一个 `Connection`，这也是 Spring 用 `ThreadLocal` 把连接绑到当前线程的原因。

## 为什么业务代码不直接写 JDBC

上面那段查询，真正的业务只有「按状态查订单」一句话，其余全是样板：

- 资源管理：`try-with-resources` 三层嵌套，漏一个就泄漏；
- 异常处理：`SQLException` 是受检异常，每个方法都得处理，而且它把「连接断了」「约束冲突」「语法错」混成一个类型；
- 结果映射：每张表都要手写 `rs.getXxx("col")`，列顺序一改就错；
- 参数绑定：`setInt(1, ...)` 的下标是手数的，插一个参数后面全要改。

Spring 的 `JdbcTemplate` 消掉了前两项(回调 + 把 `SQLException` 转成 `DataAccessException`),MyBatis 连结果映射也一并做掉。所以业务代码里几乎见不到 JDBC，但「一条 SQL 从 `Connection` 到 `ResultSet` 怎么走」这件事没变，只是被包在了下面。

## 小结

- 四个接口：`DriverManager` 建连接、`Connection` 管会话与事务、`PreparedStatement` 执行、`ResultSet` 取值；
- 列下标从 1 开始，`next()` 先移游标；`getInt` 分不清 NULL，用包装类型或 `wasNull()`;
- JDBC 4 用 SPI 自动发现驱动，`No suitable driver` 是依赖或 URL 的问题；
- 占位符让参数只当值，拼接字符串才有注入；
- 批量要 `addBatch` + 分批 `executeBatch`,MySQL 还要 `rewriteBatchedStatements=true`;
- 事务绑定在连接上；业务不直接写 JDBC 是因为样板太多，不是因为它不能用。

下一篇换一种世界观：JPA / Hibernate，以对象模型为中心访问数据库。
