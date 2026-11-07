---
title: MyBatis 与 MyBatis-Plus:谁写 SQL,谁不写
summary: 'MyBatis 只做一件事:把 SQL 还给你,再帮你把结果塞进对象。MyBatis-Plus 不是另一个框架,它在 MyBatis 上补了"不写 SQL 的那一半" —— 单表 CRUD、条件构造器、分页、自动填充、逻辑删除。'
category: java
order: 4
level: 入门
tags: [MyBatis, MyBatis-Plus, 持久层, SQL 映射, 面试高频]
updated: 2026-11-07
mindmap: mybatis-plus.mindmap.json
demo: mybatis-versus-plus
terms: ["mybatis", "mybatis-plus", "mapper", "resultmap", "dynamic-sql", "wrapper", "logic-delete"]
sources:
  - title: MyBatis 3 文档 · XML 映射器
    url: https://mybatis.org/mybatis-3/zh/sqlmap-xml.html
    note: resultMap、动态 SQL、#{} 与 ${} 的官方定义,本文映射部分以它为准。
  - title: MyBatis 3 文档 · Java API
    url: https://mybatis.org/mybatis-3/zh/java-api.html
    note: SqlSession、SqlSessionFactory 与 Mapper 接口的绑定方式。
  - title: MyBatis-Plus 官方文档 · 快速开始
    url: https://baomidou.com/getting-started/
    note: starter、@MapperScan、mapper-locations 的配置方式。
  - title: MyBatis-Plus 官方文档 · 核心功能
    url: https://baomidou.com/guides/
    note: BaseMapper、条件构造器、分页插件、自动填充与逻辑删除的开关与默认值。
  - title: MyBatis-Plus 官方文档 · 分页插件
    url: https://baomidou.com/plugins/pagination/
    note: PaginationInnerInterceptor 必须注册才生效,以及 count 语句的生成规则。
---

先说结论:**MyBatis 干的事只有一件 —— 把 SQL 交回你手里,再负责把结果映射成对象。** 它不猜你要什么 SQL,也不替你生成表结构。

**MyBatis-Plus 也不是另一个框架,它是 MyBatis 的增强包。** 在不写 SQL 就能完成的那些操作上(单表 CRUD、条件查询、分页)替你省掉样板代码;需要精细控制 SQL 的时候,还是回到 MyBatis 的接口 + XML。

配套示例在仓库的 `examples/mybatis-demo/`,同一张 `book` 表,两条路并存:

```text
mybatis-demo/
├─ src/main/java/com/liuguang/mybatis/
│  ├─ entity/Book.java             表结构 + MP 注解(主键策略 / 逻辑删除 / 自动填充)
│  ├─ mapper/BookMapper.java        继承 BaseMapper,再加一个手写 SQL 的方法
│  ├─ service/BookService.java      条件构造器 + 调用 XML
│  ├─ controller/BookController.java
│  └─ config/                       分页插件、自动填充处理器
├─ src/main/resources/
│  ├─ mapper/BookMapper.xml         手写 SQL:resultMap、动态 where
│  ├─ application.yml               mapper-locations、驼峰映射、打印 SQL
│  ├─ schema.sql / data.sql
└─ src/test/java/                   两条路各测一遍
```

## 三件套:配置、接口、XML

一个 MyBatis 查询由三块拼起来,缺一块就报错:

**① 配置**告诉它去哪找 SQL:

```yaml
mybatis-plus:
  mapper-locations: classpath*:mapper/*.xml
  type-aliases-package: com.liuguang.mybatis.entity
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

**② 接口**只写方法签名:

```java
public interface BookMapper extends BaseMapper<Book> {
    List<Book> search(@Param("keyword") String keyword,
                      @Param("readOnly") boolean readOnly);
}
```

**③ XML** 里放真正的 SQL,`namespace` 指回接口:

```xml
<mapper namespace="com.liuguang.mybatis.mapper.BookMapper">
  <select id="search" resultMap="bookMap">
    select id, title, author, read_flag, created_at
    from book
    <where>
      deleted = 0
      <if test="keyword != null and keyword != ''">
        and (title like concat('%', #{keyword}, '%')
             or author like concat('%', #{keyword}, '%'))
      </if>
      <if test="readOnly">and read_flag = true</if>
    </where>
  </select>
</mapper>
```

MP 的 CRUD 是第四块:`BaseMapper` 自带的方法没有 XML,SQL 是启动时按实体注解拼出来的。

## 接口和 XML 怎么对上

只有两条规则:

- `namespace` = Mapper 接口的**全限定名**;
- `<select>/<insert>/<update>/<delete>` 的 `id` = **方法名**。

对不上时启动**不会**报错,调用才抛 `Invalid bound statement (not found)` —— 这个报错基本就三个原因:namespace 写错、id 和接口方法名不一致、`mapper-locations` 没扫到 XML。

多个参数必须用 `@Param` 起名,否则 XML 里只能用 `param1` / `arg0` 这种默认名,很难查。

## 结果怎么塞进对象

三种情况,按列名与字段名的对应程度选:

| 情况 | 做法 |
| --- | --- |
| 列名是 `created_at`,字段是 `createdAt` | 开 `map-underscore-to-camel-case` 就够了 |
| 列名 `read_flag`,字段 `read` | 驼峰映射对不上,要 `resultMap` 或 `@TableField("read_flag")` |
| 一对多(查订单带明细) | `resultMap` 里用 `<collection>` |

```xml
<resultMap id="bookMap" type="com.liuguang.mybatis.entity.Book">
  <id column="id" property="id"/>
  <result column="read_flag" property="read"/>
</resultMap>
```

`resultType` 适合"列名能直接对上"的简单情况;`resultMap` 是显式点名,**只要出现改名或嵌套,就老实用 resultMap** —— 它写错时至少能看出来,驼峰映射对不上时只会悄悄给你一个 `null`。

## #{} 和 ${}:一个走预编译,一个拼字符串

```xml
<!-- #{}:编译成 ?,参数走 PreparedStatement -->
select * from book where author = #{author}

<!-- ${}:原样拼进 SQL 文本 -->
order by ${orderColumn} desc
```

| 写法 | 机制 | 能否被注入 | 用在哪 |
| --- | --- | --- | --- |
| `#{}` | 预编译占位符 | 不能 | 一切**值** |
| `${}` | 字符串拼接 | **能** | 列名、表名、排序字段等占位符放不下的地方 |

`${}` 不是不能用,而是**必须只接受白名单**:排序列从固定枚举里取,绝不能让用户直接把字符串传进来。这是 MyBatis 里唯一一处"写法看着没问题、实际能拖库"的地方。

## 动态 SQL:让 SQL 按参数变

四个标签覆盖绝大多数场景:

- `<if test="...">` —— 条件成立才拼这段;
- `<where>` —— 自动补 `WHERE`,并吃掉开头多余的 `AND`;
- `<foreach>` —— 把集合展开成 `IN (?, ?, ?)`;
- `<choose>/<when>/<otherwise>` —— 类似 switch,只走一个分支。

```xml
<select id="findByAuthors" resultMap="bookMap">
  select * from book
  <where>
    deleted = 0
    <if test="authors != null and authors.size() > 0">
      and author in
      <foreach collection="authors" item="a" open="(" separator="," close=")">#{a}</foreach>
    </if>
  </where>
</select>
```

动态 SQL 的价值不在于少写几个 if,而在于**同一个映射文件能覆盖多种入参组合**,不用为每种组合写一个方法。

## 一级缓存与二级缓存

- **一级缓存**默认开启,作用域是同一个 `SqlSession`:同一会话里用同样参数查两次,第二次直接拿缓存。Spring 集成下 `SqlSession` 绑在事务/一次请求上,所以跨请求不共享;一旦执行了 insert/update/delete,缓存整体清空。
- **二级缓存**默认关闭,作用域是 mapper 的 namespace,跨 `SqlSession` 共享。要显式开(`<cache/>` 或配置),而且**多实例部署时各节点缓存互不可见**。

一句话:**缓存省的是重复查询,换的是"可能读到旧数据"的风险。** 有强一致要求的表(余额、库存)别开二级缓存,真要高并发再加 Redis 这类集中缓存。

## MyBatis-Plus 补的那一半

| 能力 | 用法 | 省掉的是什么 |
| --- | --- | --- |
| 单表 CRUD | `BaseMapper` 的 `selectById` / `insert` / `updateById` / `deleteById` | 一堆重复的 XML |
| 服务层模板 | `ServiceImpl<Mapper, Entity>` 的 `save` / `getById` / `page` / `removeById` | Controller 与 Mapper 之间的转调样板 |
| 条件构造器 | `Wrappers.<Book>lambdaQuery().eq(...)` | 为每种条件组合写一个方法 |
| 分页 | `new Page<>(页, 大小)` + 分页插件 | 手写 `limit` 和 count 语句 |
| 自动填充 | `@TableField(fill = INSERT)` + `MetaObjectHandler` | 每个实体的 `setCreatedAt` |
| 逻辑删除 | `@TableLogic` | `update ... set deleted = 1` 与查询里到处加 `deleted = 0` |

条件构造器是最常用的一个,它把"查什么"从字符串变成方法调用:

```java
var query = Wrappers.<Book>lambdaQuery()
        .eq(Book::getAuthor, "周志明")
        .orderByDesc(Book::getCreatedAt);
Page<Book> page = bookService.page(new Page<>(1, 3), query);
```

**`Book::getAuthor` 这一层是重点**:它拿到了字段名,编译期就能校验字段是否存在;而 `eq("author", ...)` 那种字符串写法,字段改名之后只有运行时才炸。

分页有一个必须记住的前提:**不注册 `PaginationInnerInterceptor`,`selectPage` 不会发 count,也不会改写 limit**。分页"没生效、总数永远是 -1"几乎都是这个原因。

## MP 也要知道边界

- **多表 join、复杂统计**:回 XML 写。用 wrapper 拼 join 属于自找麻烦。
- **业务规则别塞进 wrapper**:条件构造器适合"按参数筛数据",不适合承担权限判断、状态机流转这类规则 —— 那些规则应该留在 Service 里,并且能被单测直接覆盖。
- **SQL 一定要看日志**:MP 帮你拼的 SQL 也得有人看过。开 `log-impl: StdOutImpl`,或者把它接到日志框架里。

## 六个常见坑

1. **`@MapperScan` 与 `mapper-locations` 都对才叫扫到了**:接口没被注册成 Bean,或者 XML 没被打进 classpath,报错都是 `Invalid bound statement`。
2. **驼峰映射救不了改名**:`read_flag` 对不到 `read`,老老实实写 `resultMap` 或 `@TableField`。
3. **分页插件没装**:见上。
4. **逻辑删除后手写 SQL 忘了 `deleted = 0`**:MP 的方法会自动加,你写的 SQL 不会。
5. **`${}` 拼用户输入**:排序、表名这类地方必须走白名单。
6. **嵌套查询造成的 N+1**:`<association>` / `<collection>` 默认是一条一条查,列表一大就慢;能 join 就别嵌套,或者用 `fetchType="lazy"` 配合批量加载。

## 一句话总结

**MyBatis 负责"SQL 归你、映射归我";MyBatis-Plus 负责"单表那点事不用你写"。** 记住三条:接口与 XML 靠 `namespace + id` 对上;值和列名各用 `#{}` 与白名单化的 `${}`;MP 的分页、自动填充、逻辑删除都要在配置或注解里**显式打开**。
