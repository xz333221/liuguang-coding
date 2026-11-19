---
title: 条件构造器与分页
summary: 'Wrapper 用链式方法拼装 where 条件,LambdaQueryWrapper 以方法引用替代字段名字符串;分页由 MybatisPlusInterceptor 与 PaginationInnerInterceptor 改写 SQL,返回 Page<T> 与 IPage;逻辑删除用 @TableLogic 标记字段,查询与删除自动追加条件。'
category: java
node: java-persistence-wrapper
order: 78
level: 进阶
tags: [MyBatis-Plus, Wrapper, 分页, 逻辑删除]
updated: 2026-11-19
mindmap: wrapper-page.mindmap.json
terms: ["wrapper", "mybatis-plus", "logic-delete", "mapper"]
sources:
  - title: MyBatis-Plus 官方文档
    url: https://baomidou.com/
    note: 条件构造器、分页插件与逻辑删除的能力范围。
  - title: MyBatis 3 官方文档
    url: https://mybatis.org/mybatis-3/
    note: Mapper 接口与插件机制的底层说明。
  - title: MyBatis 3 · XML Mapper
    url: https://mybatis.org/mybatis-3/sqlmap-xml.html
    note: 复杂 SQL 与结果映射仍由 XML 承担。
---

上一篇的 XML 动态 SQL 灵活,但单表按条件增删改查若都写 XML,会产生大量结构相同的语句。MyBatis-Plus 用条件构造器(Wrapper)以 Java 代码表达 where 条件,并配合分页插件与逻辑删除,覆盖这类重复场景。

## QueryWrapper 与 LambdaQueryWrapper

Wrapper 是条件构造器,把 where 子句拆成链式方法调用。QueryWrapper 用字符串列名:

```java
QueryWrapper<User> qw = new QueryWrapper<>();
qw.eq("name", "张三").ge("age", 18).orderByDesc("id");
List<User> users = userMapper.selectList(qw);
```

字符串列名没有编译期检查,列名写错只能在运行时暴露。LambdaQueryWrapper 用方法引用取字段,重构改名时编译期就会报错:

```java
LambdaQueryWrapper<User> lqw = new LambdaQueryWrapper<>();
lqw.eq(User::getName, "张三")
   .ge(User::getAge, 18)
   .orderByDesc(User::getId);
List<User> users = userMapper.selectList(lqw);
```

MyBatis-Plus 3.4 之后还提供 Wrappers.lambdaQuery() 与 Mapper 上的 lambdaQuery(),写法等价,可按团队习惯选择。

新代码优先 LambdaQueryWrapper,只有字段名无法用方法引用表达(如动态列)时才退回字符串形式。

## UpdateWrapper:按条件更新

QueryWrapper 只承载查询条件,更新还需要 set 子句。UpdateWrapper 在条件之外提供 set,列名以字符串传入;LambdaUpdateWrapper 用方法引用指定字段与值:

```java
LambdaUpdateWrapper<User> luw = new LambdaUpdateWrapper<>();
luw.set(User::getStatus, 2).eq(User::getAge, 18);
userMapper.update(null, luw);
```

update 的第一个参数是实体对象,传 null 表示更新值全部由 Wrapper 的 set 提供。set 只适用于单表更新,需要关联其他表或使用数据库特有表达式时,写回 XML。

## 常用条件方法

- eq / ne:等于、不等于;
- gt / ge / lt / le:大于、大于等于、小于、小于等于;
- like / likeLeft / likeRight:模糊匹配;
- in / notIn:集合包含;
- between:闭区间;
- isNull / isNotNull:空值判断;
- orderByAsc / orderByDesc:排序。

条件方法都带一个 boolean 重载,用于按运行时判断是否加入该条件:

```java
boolean hasAge = minAge != null;
new LambdaQueryWrapper<User>()
        .eq(User::getStatus, 1)
        .ge(hasAge, User::getAge, minAge)
        .orderByDesc(User::getId);
```

传 false 时该条件整体跳过,省去在 Java 里逐个拼 if。

## and / or 与括号语义

链式调用默认用 and 连接。or() 之后的第一个条件与前一组形成或关系,连续 or 会把条件摊平,括号需要用嵌套 Wrapper 表达:

```java
// name = ? and (age > ? or status = ?)
new LambdaQueryWrapper<User>()
        .eq(User::getName, "张三")
        .and(w -> w.gt(User::getAge, 18).or().eq(User::getStatus, 1));
```

嵌套 lambda 的参数是子 Wrapper,生成一对括号。or() 不带参数表示「或」,or(Consumer) 表示括号内的或条件块。混用 and 与 or 时不加括号,优先级由拼接顺序决定,结果容易与预期不同;需要明确分组就显式嵌套。

## select 指定列

默认查询实体全部字段。只需要部分列时,链上 select(User::getId, User::getName) 即可,生成的 SQL 是 select id, name from ...,避免读取大字段(如 text、blob)。select 的列必须能构成完整对象,未查询的字段取默认值。

## 分页:插件与 Page

MP 的分页由拦截器改写 SQL,不会简单拼 limit。先注册插件:

```java
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}
```

查询时传入 Page<T>,返回的 IPage 携带总记录数、总页数与当前页数据:

```java
Page<User> page = new Page<>(1, 10);          // 第 1 页,每页 10 条
IPage<User> result = userMapper.selectPage(page, new LambdaQueryWrapper<User>()
        .eq(User::getStatus, 1));

System.out.println(result.getTotal());        // 总记录数
System.out.println(result.getRecords());      // 当前页数据
System.out.println(result.getPages());        // 总页数
```

分页执行两条 SQL:一条 select count(*) 求总数,一条带 limit 取当页数据。count 语句由插件根据原 SQL 生成,会自动去掉 order by 与不需要的 join 字段。数据量大且不需要总数时,用 Page 的 searchCount(false) 关闭 count 查询。

## 逻辑删除

逻辑删除指删除时只把标记字段改为已删除,数据行保留。实体字段加 @TableLogic:

```java
public class User {
    @TableId
    private Long id;

    @TableLogic
    private Integer deleted;   // 0 未删除,1 已删除
}
```

也可在配置文件里全局声明,免去每个实体加注解:

```yaml
mybatis-plus:
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
```

配置后,select 自动追加 deleted = 0,deleteById 变为 update ... set deleted = 1,update 同样带上未删除条件。手写 XML 的 SQL 不受影响,需要自己加条件。

## Wrapper 的边界

条件构造器适合单表。以下场景回到 XML:

- 多表 join、子查询、聚合;
- 需要 union、窗口函数或数据库特有语法;
- 条件与业务分支强耦合,链式调用读不出结构;
- 需要精确控制执行计划或批量写入方式。

判断标准很简单:Wrapper 写出来比等效 SQL 更难读时,就该写 SQL。下一篇讲事务与连接池,关注 SQL 执行前后的边界由谁维护。

## 小结

- QueryWrapper 用字符串列名,LambdaQueryWrapper 用方法引用,后者有编译期检查,新代码优先;
- 常用条件方法都有 boolean 重载,可按运行时判断跳过;
- and 与 or 混用时用嵌套 Wrapper 表达括号,避免优先级歧义;
- select 可限定查询列;分页由 MybatisPlusInterceptor 注册,返回 Page / IPage,count 语句由插件生成;
- @TableLogic 或全局配置实现逻辑删除,查询与删除自动追加条件,手写 SQL 不受影响;
- 多表 join、聚合与复杂分支仍写 XML。
