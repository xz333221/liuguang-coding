---
title: ResultMap 与动态 SQL
summary: 'resultMap 声明列与属性的映射,解决列名不一致、association/collection 关联与嵌套查询;动态 SQL 用 if、choose、where、set、foreach、trim 按参数拼装语句;#{} 预编译绑定参数,${} 直接拼接文本,排序列必须做白名单校验。'
category: java
node: java-persistence-resultmap
order: 77
level: 进阶
tags: [MyBatis, resultMap, 动态 SQL, SQL 注入]
updated: 2026-11-19
mindmap: resultmap-dynamic-sql.mindmap.json
terms: ["resultmap", "dynamic-sql", "mapper", "namespace"]
sources:
  - title: MyBatis 3 · XML Mapper
    url: https://mybatis.org/mybatis-3/sqlmap-xml.html
    note: resultMap、association、collection 与 typeAlias 的官方定义。
  - title: MyBatis 3 · Dynamic SQL
    url: https://mybatis.org/mybatis-3/dynamic-sql.html
    note: if、choose、where、set、foreach、trim 与 sql 片段。
  - title: MyBatis 3 官方文档
    url: https://mybatis.org/mybatis-3/
    note: Mapper 命名空间与参数绑定的整体说明。
---

前一篇说明了通用 CRUD 的边界,复杂查询要手写 SQL。手写 SQL 有两件事必须处理:查询结果的列怎样落到对象属性上,语句又怎样随参数变化。前者用 resultMap,后者用动态 SQL。

## resultMap:列名与属性名不一致

resultMap 是结果映射声明:告诉 MyBatis 哪一列填到哪个属性。默认按列名与属性名同名匹配,开启 map-underscore-to-camel-case 后可自动把下划线转成驼峰;列名与属性名对不上时,默认机制失效。

```xml
<resultMap id="userMap" type="com.example.entity.User">
    <id property="id" column="user_id"/>
    <result property="userName" column="user_name"/>
    <result property="age" column="age"/>
</resultMap>

<select id="findById" resultMap="userMap">
    select user_id, user_name, age from sys_user where user_id = #{id}
</select>
```

id 标记主键列,result 标记普通列。两者在 MyBatis 内部有区别:主键用于判断两行是否属于同一个对象,嵌套结果映射时尤其重要。

## 关联对象:association 与 collection

表关联的结果是一行里嵌着另一个对象。association 映射单个对象,collection 映射集合:

```xml
<resultMap id="orderMap" type="com.example.entity.Order">
    <id property="id" column="order_id"/>
    <result property="amount" column="amount"/>
    <association property="user" javaType="com.example.entity.User">
        <id property="id" column="user_id"/>
        <result property="name" column="user_name"/>
    </association>
    <collection property="items" ofType="com.example.entity.OrderItem">
        <id property="id" column="item_id"/>
        <result property="productName" column="product_name"/>
    </collection>
</resultMap>
```

javaType 是单个对象的类型,ofType 是集合元素的类型。对应的 SQL 用 join 一次取出全部列,MyBatis 按 id 把重复行折叠成一个对象并填充集合。

## 嵌套查询与 N+1

关联映射还有第二种写法:不写 join,把子查询交给另一个 select:

```xml
<resultMap id="orderMap" type="com.example.entity.Order">
    <id property="id" column="order_id"/>
    <association property="user" column="user_id"
                 select="com.example.mapper.UserMapper.selectById"/>
</resultMap>
```

这称为嵌套查询(nested select)。它写起来简单,但主查询返回 N 条订单时会额外执行 N 次用户查询,即 N+1 问题。数据量增大后,数据库往返次数随记录数增长。

两种写法的差别:

嵌套结果只执行一条 join,嵌套查询执行 1 + N 条。默认优先嵌套结果,嵌套查询只在关联数据少、且确实需要懒加载时使用。

## typeAlias:省略全限定名

resultType 与 resultMap 的 type 都要写全限定名,太长。typeAlias(类型别名)给它起短名:

```yaml
mybatis:
  type-aliases-package: com.example.entity
```

配置包路径后,该包下的类可以用类名充当别名(大小写不敏感),例如 resultType 写 User 即可。

别名只是书写便利,不改变类型解析,也不影响 resultMap 的行为。

## 动态 SQL:按参数拼装语句

动态 SQL 指 XML 中带判断与循环的标签,运行时根据参数生成最终语句。核心标签:

- if:条件成立才拼接;
- choose / when / otherwise:多分支,只取第一个成立的分支;
- where:自动加 where,并去掉开头多余的 and 或 or;
- set:update 时自动加 set,并去掉末尾多余的逗号;
- foreach:遍历集合,生成 in (...) 或批量 values;
- trim:自定义前后缀与裁剪规则,where 与 set 的底层就是它;
- sql + include:抽取可复用片段。

多条件查询的例子:

```xml
<select id="search" resultType="User">
    select id, name, age from sys_user
    <where>
        <if test="name != null and name != ''">
            and name like concat('%', #{name}, '%')
        </if>
        <if test="minAge != null">
            and age &gt;= #{minAge}
        </if>
        <choose>
            <when test="orderBy == 'age'">order by age</when>
            <otherwise>order by id</otherwise>
        </choose>
    </where>
</select>
```

where 只在至少一个条件成立时输出关键字;全部条件为空时,语句退化成全表查询,这一点要在接口层限制。

批量插入用 foreach:

```xml
<insert id="insertBatch">
    insert into sys_user (name, age) values
    <foreach collection="list" item="u" separator=",">
        (#{u.name}, #{u.age})
    </foreach>
</insert>
```

collection 的取值取决于参数形态:直接传 List 写 list,传数组写 array,使用 @Param 时写注解里的名字。

## #{} 与 ${}:预编译与文本拼接

#{} 生成 PreparedStatement 的占位符 ?,参数通过 setXxx 绑定,值不参与 SQL 解析,天然防注入。

${} 把参数原样拼进 SQL 文本,参数值会改变语句结构。

```xml
<!-- 排序列只能拼进 SQL,不能使用占位符 -->
<select id="findAllOrder" resultType="User">
    select * from sys_user order by ${orderBy}
</select>
```

order by 后面只能跟列名,不能用占位符,这类场景必须用 ${}。做法是在 Java 层做白名单校验,只允许预定义的列名通过:

```java
private static final Set<String> SORTABLE = Set.of("id", "name", "age");

public List<User> findAll(String orderBy) {
    if (!SORTABLE.contains(orderBy)) {
        throw new IllegalArgumentException("非法排序字段: " + orderBy);
    }
    return userMapper.findAllOrder(orderBy);
}
```

其余场景一律用 #{}。表名、列名需要动态时,同样按白名单枚举,不要接收前端传入的任意字符串。

## 小结

- resultMap 声明列与属性的对应,解决列名不一致;id 标记主键,result 标记普通列;
- association 映射单个关联对象,collection 映射集合,javaType 与 ofType 分别指定类型;
- 嵌套结果用一条 join 查询,嵌套查询会产生 N+1,默认选前者;
- 动态 SQL 的核心标签是 if、choose、where、set、foreach、trim,sql + include 负责复用;
- #{} 预编译绑定参数;${} 直接拼接文本,只用于列名等标识符并配合白名单;
- typeAlias 只是缩短全限定名,不改变类型。
