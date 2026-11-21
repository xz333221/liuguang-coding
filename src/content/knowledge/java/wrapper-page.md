---
title: 条件构造器与分页
summary: 'Wrapper 用链式方法拼装 where 条件，LambdaQueryWrapper 用方法引用代替字段名字符串，拼错编译期就报错；条件方法带 boolean 重载，false 时整段跳过；分页必须注册 MybatisPlusInterceptor + PaginationInnerInterceptor，否则分页参数被忽略、查出全表；逻辑删除用 @TableLogic，查询与删除自动追加条件，但手写 SQL 不会。'
category: java
node: java-persistence-wrapper
order: 78
level: 进阶
tags: [MyBatis-Plus, Wrapper, 分页, 逻辑删除]
updated: 2026-11-20
mindmap: wrapper-page.mindmap.json
terms: ["wrapper", "mybatis-plus", "logic-delete", "mapper"]
sources:
  - title: MyBatis-Plus · 条件构造器
    url: https://baomidou.com/guides/wrapper/
    note: QueryWrapper、LambdaQueryWrapper 的方法与条件重载。
  - title: MyBatis-Plus · 分页插件
    url: https://baomidou.com/plugins/pagination/
    note: 拦截器注册、Page 参数与 count 语句生成规则。
  - title: MyBatis-Plus · 逻辑删除
    url: https://baomidou.com/guides/logic-delete/
    note: '@TableLogic 与全局配置的取值约定。'
---

上一篇的动态 SQL 解决了「条件可选」，但一个实体十几个查询方法，每个都写一段 XML，维护成本也上来了。单表的条件查询其实高度模板化，这就是 Wrapper 要解决的事。

## 两种 Wrapper

```java
// 字符串列名:拼错了运行期才报错
new QueryWrapper<User>().eq("u_name", name);

// 方法引用:列名编译期就检查
new LambdaQueryWrapper<User>().eq(User::getName, name);
```

`LambdaQueryWrapper` 通过方法引用拿到字段名，再由 `@TableField` / 驼峰规则翻译成列名。列名改了、字段删了，编译直接失败，不会等到线上报 `Unknown column`。新代码优先用它，`QueryWrapper` 只在字段是动态拼接时才用得上。

更新用 `LambdaUpdateWrapper`:

```java
new LambdaUpdateWrapper<User>()
    .eq(User::getId, 1L)
    .set(User::getStatus, 2);
mapper.update(null, wrapper);
```

## 条件方法的 boolean 重载

每个条件方法都有一个带 `boolean condition` 的重载，false 时整段跳过：

```java
LambdaQueryWrapper<User> q = new LambdaQueryWrapper<User>()
    .eq(User::getStatus, 1)
    .like(StringUtils.hasText(name), User::getName, name)   // name 为空时整段不拼
    .ge(minAge != null, User::getAge, minAge)
    .orderByDesc(User::getId);

List<User> list = mapper.selectList(q);
```

这一手能替掉一大半 `if (name != null) { q.like(...) }`，是 Wrapper 最实用的地方。

`and` / `or` 的括号容易写错。默认是平铺的 and，要表达「状态为 1 且(名称为空或包含关键字)」时得嵌套：

```java
q.eq(User::getStatus, 1)
 .and(w -> w.isNull(User::getName).or().like(User::getName, keyword));
```

不嵌套的话会拼成 `status = 1 and name is null or name like ?`，优先级一变语义就错了。判断技巧：只要用了 `or()`，就想一下「这段需不需要括号」。

`select` 限制返回列，避免 `select *`:

```java
q.select(User::getId, User::getName);
```

## 分页：先注册插件

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}
```

用起来很简单：

```java
Page<User> page = new Page<>(1, 20);          // 第 1 页,每页 20 条
Page<User> result = mapper.selectPage(page, q);
result.getRecords();     // 当前页数据
result.getTotal();       // 总条数
result.getPages();       // 总页数
```

`selectPage` 会执行两条 SQL:一条 `count(*)`，一条带 `limit` 的查询。分页参数由插件改写进 SQL，所以**不注册插件时不会有任何报错**，只是 `limit` 从来没被加上，你拿到的是全表数据。这是线上最常见的一类事故：本地数据少看不出来，上线后一次查出十万行。

`IPage<T>` 是接口，`Page<T>` 是它的常用实现。Service 层返回 `IPage` 便于替换实现，但要序列化给前端时通常转成自定义的 `PageResult`，别直接把 `Page` 暴露出去——它带了一堆前端用不上的字段。

## 逻辑删除

物理删除(`delete from`)会让数据不可追溯，业务表一般用逻辑删除：加一列标记，删除时改成 1。

```java
@TableName("t_user")
public class User {
    @TableLogic
    private Integer deleted;      // 0 正常,1 已删除
}
```

配置好之后：

- `selectById` / `selectList` 自动追加 `deleted = 0`;
- `deleteById` 变成 `update t_user set deleted = 1 where id = ?`;
- `updateById` 也会带上 `deleted = 0` 的条件。

全局配置可以省掉每个实体上的注解：

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

两个坑必须知道：

1. **手写 XML 的 SQL 不会自动加条件**。你自己写的 `select` 要显式写 `deleted = 0`，否则删掉的数据会冒出来；
2. **唯一索引要重新设计**。`user_name` 唯一时，删掉的行还占着这个名字，再注册同名用户就冲突。常见做法是把唯一索引改成 `(user_name, deleted)` 或者删除时把名字写成 `name_deleted_时间戳`。

## 能力边界

Wrapper 适合单表、条件可枚举的查询。下面这些写 XML 更清楚：

- 多表 join、子查询、`group by` 聚合；
- 需要 `union`、窗口函数、复杂 `case when`;
- 条件由业务规则动态生成，Java 侧拼出来的链式调用已经比 SQL 更难读。

判断标准很简单：**这段 Wrapper 你隔一周还看得懂吗**。看不懂就换回 XML,SQL 至少是声明式的。

## 小结

- `LambdaQueryWrapper` 用方法引用拿列名，编译期就能发现字段写错；
- 条件方法的 `boolean` 重载，false 时整段跳过，省掉大量 if;
- 用 `or()` 时想一下括号，嵌套用 `and(w -> ...)` 表达；
- 分页必须注册 `MybatisPlusInterceptor`，漏了不报错但会查出全表；
- `@TableLogic` 让查询与删除自动带条件，手写 SQL 要自己加；
- 逻辑删除会占唯一索引，索引设计要一起改；
- join、聚合、复杂条件写 XML,Wrapper 只做单表。

下一篇讲事务与连接池：多条 SQL 怎么保证一起成功，连接怎么复用。
