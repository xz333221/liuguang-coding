---
title: ResultMap 与动态 SQL
summary: 'resultMap 声明列与属性的映射，解决列名不一致、association/collection 关联；嵌套结果一条 join，嵌套查询会变成 1 + N 条；动态 SQL 用 if、choose、where、set、foreach、sql/include 按参数拼装；#{} 走预编译防注入，${} 直接拼接文本，只能用于表名列名且必须白名单。'
category: java
node: java-persistence-resultmap
order: 77
level: 进阶
tags: [MyBatis, resultMap, 动态 SQL, SQL 注入]
updated: 2026-11-20
mindmap: resultmap-dynamic-sql.mindmap.json
terms: ["resultmap", "dynamic-sql", "mapper", "namespace"]
sources:
  - title: MyBatis 3 · XML Mapper
    url: https://mybatis.org/mybatis-3/sqlmap-xml.html
    note: resultMap、association、collection 与 typeAlias 的官方定义。
  - title: MyBatis 3 · Dynamic SQL
    url: https://mybatis.org/mybatis-3/dynamic-sql.html
    note: if、choose、where、set、foreach、trim 与 sql 片段。
  - title: MyBatis 3 · Mapper Annotations
    url: https://mybatis.org/mybatis-3/java-api.html
    note: '@Select、@Results 等注解写法的对照。'
---

上一篇的 `BaseMapper` 只认得「表结构与实体一一对应」。碰到列名带前缀、一个订单带多个明细、按前端传的条件动态拼 where 时，就得自己动手写映射和 SQL。这一篇讲这两件事。

## 为什么需要 resultMap

列名与属性名能靠驼峰映射自动对上时，`resultType` 就够了：

```xml
<select id="selectById" resultType="User">
  select id, user_name, created_at from t_user where id = #{id}
</select>
```

对不上的情况有三种：列名和属性名毫无关系(比如 `u_name`)、需要把多列拼成一个对象、需要一对一 / 一对多关联。这时用 `resultMap` 显式声明：

```xml
<resultMap id="userMap" type="User">
  <id     column="id"         property="id"/>
  <result column="u_name"     property="name"/>
  <result column="created_at" property="createdAt"/>
</resultMap>

<select id="selectById" resultMap="userMap">
  select id, u_name, created_at from t_user where id = #{id}
</select>
```

`<id>` 标主键，`<result>` 标普通列。主键这一行不只是「说明哪列是主键」，它还决定多行结果如何合并成对象——一对多映射时靠它去重。

## 一对一与一对多

```xml
<resultMap id="orderMap" type="Order">
  <id     column="id"         property="id"/>
  <result column="order_no"   property="orderNo"/>

  <association property="buyer" javaType="User">
    <id     column="user_id"   property="id"/>
    <result column="user_name" property="name"/>
  </association>

  <collection property="items" ofType="OrderItem">
    <id     column="item_id"   property="id"/>
    <result column="sku"       property="sku"/>
  </collection>
</resultMap>
```

对应的 SQL 是一次 join:

```xml
<select id="selectOrder" resultMap="orderMap">
  select o.id, o.order_no, u.id as user_id, u.u_name as user_name,
         i.id as item_id, i.sku
  from t_order o
  join t_user u on u.id = o.user_id
  left join t_order_item i on i.order_id = o.id
  where o.id = #{id}
</select>
```

一个订单三件商品，join 会返回三行。MyBatis 按 `orderMap` 的 `<id>` 把三行合并成一个 `Order`,`items` 里装三条明细。这叫**嵌套结果**，一条 SQL 搞定。

另一种写法是**嵌套查询**:主查询查出订单，`<association select="...">` 再按 id 查一次用户。

```xml
<association property="buyer" column="user_id"
             select="com.example.mapper.UserMapper.selectById"/>
```

方便，但代价是 1 + N 条 SQL。查 1 个订单没事，查 100 个订单就是 101 次数据库往返。面试里问的 N+1 就是它。默认可以靠 `fetchType="lazy"` 延迟到真正用到时再查，但延迟加载解决的是「不用的不查」，不是「查得少」。

判断标准：列表查询用嵌套结果(join)，详情查询才用嵌套查询。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 290" role="img" aria-label="嵌套结果用一条 join 查询，嵌套查询是一条主查询加 N 条子查询">
    <rect x="6" y="6" width="748" height="278" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="32" y="36" width="340" height="212" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="52" y="62" font-size="13" font-weight="700" fill="var(--ink)">嵌套结果：一条 join</text>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">
      <rect x="52" y="76" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="64" y="94" fill="var(--muted)">order 1 | item 甲</text>
      <rect x="52" y="108" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="64" y="126" fill="var(--muted)">order 1 | item 乙</text>
      <rect x="52" y="140" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="64" y="158" fill="var(--muted)">order 1 | item 丙</text>
    </g>
    <text x="52" y="192" font-size="11" fill="var(--muted)">同一个 id 的行，由 resultMap 按 &lt;id&gt; 合并</text>
    <text x="52" y="220" font-size="12" fill="var(--ink)">结果：1 个 Order,items 里 3 条</text>
    <rect x="388" y="36" width="340" height="212" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="408" y="62" font-size="13" font-weight="700" fill="var(--ink)">嵌套查询：1 + N 条</text>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11">
      <rect x="408" y="76" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="420" y="94" fill="var(--muted)">1. 查订单列表</text>
      <rect x="408" y="108" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="420" y="126" fill="var(--muted)">2. 订单 1 → 查明细</text>
      <rect x="408" y="140" width="300" height="26" rx="6" fill="var(--panel)" stroke="var(--line)" />
      <text x="420" y="158" fill="var(--muted)">3. 订单 2 → 查明细</text>
    </g>
    <text x="408" y="192" font-size="11" fill="var(--muted)">4. 订单 3 → 查明细 …… 一共 N 次往返</text>
    <text x="408" y="220" font-size="12" fill="var(--ink)">结果一样，数据库被打 N+1 次</text>
    <text x="32" y="272" font-size="12" fill="var(--muted)">列表接口用左边；详情页数据量小，右边配懒加载也能接受。</text>
  </svg>
  <figcaption>N+1 不是「写法错」，而是「每条订单都多一次往返」——数据量一大就现原形。</figcaption>
</figure>

## typeAlias

`resultType` 里写全限定名太长，可以注册别名：

```yaml
mybatis:
  type-aliases-package: com.example.domain
```

配了之后 `com.example.domain.User` 直接写 `User`。类上也能用 `@Alias("U")` 自定义。别名只是省字，别为了省字起一堆看不懂的短名。

## 动态 SQL

条件查询的难点是「用户可能传也可能不传」。用字符串拼 SQL，要处理 where 后面第一个 and、末尾逗号、空条件——全是容易漏的分支。MyBatis 把这些收进了标签：

```xml
<select id="search" resultMap="userMap">
  select id, u_name, created_at
  from t_user
  <where>
    <if test="name != null and name != ''">
      and u_name like concat('%', #{name}, '%')
    </if>
    <if test="status != null">
      and status = #{status}
    </if>
    <if test="minAge != null">
      and age &gt;= #{minAge}
    </if>
  </where>
  order by id desc
</select>
```

`<where>` 只在内部有条件时才输出 `where`，并自动去掉开头多余的 `and` / `or`。`<set>` 同理，处理 update 语句末尾的逗号。

`<choose>` 相当于 switch，只走一个分支：

```xml
<choose>
  <when test="orderNo != null">and order_no = #{orderNo}</when>
  <when test="phone != null">and buyer_phone = #{phone}</when>
  <otherwise>and created_at &gt; now() - interval 7 day</otherwise>
</choose>
```

`<foreach>` 用于 in 与批量插入：

```xml
<select id="selectByIds" resultMap="userMap">
  select id, u_name from t_user
  where id in
  <foreach collection="ids" item="id" open="(" separator="," close=")">
    #{id}
  </foreach>
</select>

<insert id="batchInsert">
  insert into t_order_item (order_id, sku, qty) values
  <foreach collection="items" item="it" separator=",">
    (#{it.orderId}, #{it.sku}, #{it.qty})
  </foreach>
</insert>
```

重复的列清单用 `<sql>` 抽出来，`<include>` 引用：

```xml
<sql id="cols">id, u_name, created_at</sql>

<select id="selectById" resultMap="userMap">
  select <include refid="cols"/> from t_user where id = #{id}
</select>
```

注意：`<foreach>` 拼出来的 in 列表太长(几千个 id)会触发 SQL 长度限制和解析开销，大量 id 应该分批或改成 join 临时表。

## #{} 与 ${}:一个防注入，一个不防

- `#{}` 生成 `?` 占位符，值走 `PreparedStatement` 绑定，永远不参与 SQL 解析；
- `${}` 直接把字符串拼进 SQL 文本。

```java
// 安全:值不会变成 SQL 语法
@Select("select * from t_user where u_name = #{name}")
User byName(String name);

// 危险:sortColumn 来自前端时可以变成 "id; drop table t_user"
@Select("select * from t_user order by ${sortColumn}")
List<User> sorted(String sortColumn);
```

`${}` 不是不能用，它只能用在**结构和值区分不清**的地方：表名、列名、`order by` 的方向。这些位置无法用占位符，所以必须在 Java 侧做白名单：

```java
private static final Set<String> SORTS = Set.of("id", "created_at", "age");

if (!SORTS.contains(sortColumn)) {
    throw new IllegalArgumentException("非法的排序字段");
}
```

同理，`like` 用 `concat('%', #{name}, '%')` 而不是 `'%${name}%'`。

## 小结

- `resultType` 够用时别写 `resultMap`；列名不一致、关联对象、需要合并多行时才用；
- `<id>` 决定多行如何合并成一个对象，一对多映射必须标对；
- 嵌套结果一条 join，嵌套查询 1 + N 条；列表查询用前者；
- 动态 SQL:`where` / `set` 自动裁剪，`if` / `choose` 分支，`foreach` 拼 in 与批量插入，`sql` + `include` 复用片段；
- `#{}` 预编译绑定，`${}` 直接拼接，只能用于表名列名并做白名单；
- 超长 in 列表要分批，别指望一条 SQL 塞一万个 id。

下一篇讲另一个少写 SQL 的路径：条件构造器与分页插件。
