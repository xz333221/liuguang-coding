---
title: 'JDBC 与连接池:SQL 到对象的最短路径'
summary: 'JDBC 用 DriverManager、Connection、PreparedStatement、ResultSet 四个接口直接执行 SQL;JDBC 4 起驱动通过 SPI 自动发现;PreparedStatement 预编译并阻断注入,批量与事务都在 Connection 上控制。业务层直接使用 JDBC 会重复资源管理与异常处理,MyBatis 正是在它之上的封装。'
category: java
node: java-persistence-jdbc
order: 80
level: 进阶
tags: [JDBC, PreparedStatement, ResultSet, 驱动, 批量]
updated: 2026-11-19
mindmap: jdbc.mindmap.json
terms: ["runtime", "protocol"]
sources:
  - title: Oracle Java 教程 · JDBC Basics
    url: https://docs.oracle.com/javase/tutorial/jdbc/
    note: 连接、语句、结果集与事务的基础用法。
  - title: java.sql 包说明
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/package-summary.html
    note: Connection、PreparedStatement、ResultSet 等接口的官方定义。
  - title: Spring Framework Reference · Data Access with JDBC
    url: https://docs.spring.io/spring-framework/reference/data-access/jdbc.html
    note: JdbcTemplate 消除 JDBC 样板代码的思路。
---

上一篇的事务最终落在 Connection 上:提交、回滚与隔离级别都是连接的方法。这一篇从 JDBC 这一层看连接从哪里来、SQL 如何执行,以及 MyBatis 在它之上封装了什么。

## 四个核心接口

JDBC(Java Database Connectivity)是 Java 访问关系型数据库的标准 API,定义在 java.sql 包中。日常使用集中在四个接口:

- DriverManager:按 URL 找到匹配的驱动,建立连接;
- Connection:一个数据库会话,负责创建语句与控制事务;
- PreparedStatement:带占位符的预编译 SQL,执行查询或更新;
- ResultSet:查询结果的行集合,按列读取。

驱动由数据库厂商提供,例如 MySQL 的 mysql-connector-j。JDBC 只规定接口,具体的通信协议由驱动实现。

## 驱动如何被加载

早期写法要显式加载驱动类:

```java
Class.forName("com.mysql.cj.jdbc.Driver");
```

Class.forName 触发类初始化,驱动在静态块中向 DriverManager 注册自己。JDBC 4 起引入 SPI:驱动 jar 内的 `META-INF/services/java.sql.Driver` 文件列出实现类,DriverManager 在运行时通过 ServiceLoader 自动发现。现代项目不再需要这行代码,手写反而会在更换驱动时留下硬编码。反射与类加载的机制在反射章节已经展开。

## 一次完整的增删改查

```java
String url = "jdbc:mysql://127.0.0.1:3306/shop?serverTimezone=Asia/Shanghai";
try (Connection conn = DriverManager.getConnection(url, "app", "secret")) {
    // 插入
    String insert = "INSERT INTO product(name, price) VALUES (?, ?)";
    try (PreparedStatement ps = conn.prepareStatement(insert)) {
        ps.setString(1, "键盘");
        ps.setBigDecimal(2, new BigDecimal("199.00"));
        ps.executeUpdate();                       // 1
    }

    // 查询
    String query = "SELECT id, name, price FROM product WHERE price > ?";
    try (PreparedStatement ps = conn.prepareStatement(query)) {
        ps.setBigDecimal(1, new BigDecimal("100"));
        try (ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                long id = rs.getLong("id");
                String name = rs.getString("name");
                BigDecimal price = rs.getBigDecimal("price");
                System.out.println(id + " " + name + " " + price);   // 1 键盘 199.00
            }
        }
    }

    // 更新与删除
    try (PreparedStatement ps = conn.prepareStatement(
            "UPDATE product SET price = ? WHERE id = ?")) {
        ps.setBigDecimal(1, new BigDecimal("189.00"));
        ps.setLong(2, 1);
        ps.executeUpdate();                       // 1
    }
    try (PreparedStatement ps = conn.prepareStatement("DELETE FROM product WHERE id = ?")) {
        ps.setLong(1, 1);
        ps.executeUpdate();                       // 1
    }
}
```

try-with-resources 保证 Connection、PreparedStatement、ResultSet 按逆序关闭。三者都持有底层资源,漏关会耗尽连接与游标。连接通常来自连接池而非 DriverManager,获取方式不同,关闭约定一致。

## PreparedStatement 与注入

PreparedStatement 的 SQL 带 `?` 占位符,参数通过 setXxx 传入。驱动把 SQL 模板发给数据库预编译,执行时只传参数,参数始终按值处理,不会被解释为 SQL 语法。

对比字符串拼接:

```java
String name = "x' OR '1'='1";
String sql = "SELECT * FROM product WHERE name = '" + name + "'";
// 实际执行: SELECT * FROM product WHERE name = 'x' OR '1'='1'  → 返回全表
```

同样的输入用占位符,只会查找名为 `x' OR '1'='1` 的商品,查不到结果。这就是 SQL 注入的成因与防御方式:不拼接用户输入。预编译还省去每次执行时的解析开销,批量执行时收益更明显。

## 批量操作

逐条执行意味着多次网络往返。批量接口把多条语句合并后发送:

```java
String sql = "INSERT INTO product(name, price) VALUES (?, ?)";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    for (int i = 1; i <= 1000; i++) {
        ps.setString(1, "商品" + i);
        ps.setBigDecimal(2, BigDecimal.valueOf(i));
        ps.addBatch();
        if (i % 500 == 0) {
            ps.executeBatch();      // 每 500 条提交一批,控制内存占用
        }
    }
    ps.executeBatch();
}
```

MySQL 驱动默认仍逐条发送,URL 加上 `rewriteBatchedStatements=true` 才会合并成多值 INSERT。

## 在 Connection 上控制事务

JDBC 默认 autocommit,每条语句独立提交。需要事务时关闭它,并在成功与失败两条路径上分别处理:

```java
conn.setAutoCommit(false);
try {
    debit(conn, 1, new BigDecimal("100"));
    credit(conn, 2, new BigDecimal("100"));
    conn.commit();
} catch (SQLException e) {
    conn.rollback();
    throw e;
}
```

事务的边界、隔离级别与传播行为在上一篇已经展开;这里只需记住,JDBC 层的事务就是 Connection 上的一组方法。

## 为什么业务代码不直接写 JDBC

上面的例子可以运行,但放进业务层会迅速膨胀:

- 样板代码:每次都要获取连接、创建语句、遍历结果集、把列逐个拼成对象;
- 资源管理:三到四层 try-with-resources,异常路径同样要保证关闭;
- 异常转换:SQLException 是受检异常,方法签名被迫声明或层层包装,业务真正关心的往往只是唯一键冲突、连接超时等少数分类;
- 可维护性:SQL 分散在 Java 代码中,改一句查询就要重新编译。

MyBatis 在 JDBC 之上做了三件事:把 SQL 放进映射文件或注解、用 ResultMap 把结果集映射为对象、把 SQLException 转换为统一的运行时异常。第 14 章前几篇讲的 Mapper 接口、动态 SQL 与条件构造器,底层执行仍然走 PreparedStatement。Spring 另有一个选择 JdbcTemplate,用回调消除样板代码,SQL 依旧手写。

## 小结

- JDBC 的四个核心接口:DriverManager、Connection、PreparedStatement、ResultSet;
- JDBC 4 起驱动通过 SPI 自动注册,不再需要 Class.forName;
- PreparedStatement 用占位符传参,预编译并阻断 SQL 注入;
- addBatch 与 executeBatch 减少网络往返,分批提交控制内存;
- 事务在 Connection 上控制,关闭 autocommit 后显式 commit 或 rollback;
- 业务层不直接写 JDBC,原因是样板代码、资源管理与异常转换;MyBatis 是它的封装。

下一篇换一条路径:JPA 不再手写 SQL,而是先定义对象模型,由框架生成并执行语句。
