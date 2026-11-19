---
title: MyBatis 与 MyBatis-Plus 的分工
summary: 'MyBatis 负责 SQL 映射:Mapper 接口声明方法,XML 或注解承载 SQL,框架完成参数绑定与结果映射;MyBatis-Plus 在此基础上补 BaseMapper 通用 CRUD、条件构造器、分页、逻辑删除与代码生成,复杂查询仍应写在 XML。'
category: java
node: java-persistence-mybatis
order: 76
level: 进阶
tags: [MyBatis, MyBatis-Plus, Mapper, CRUD]
updated: 2026-11-19
mindmap: mybatis-plus.mindmap.json
terms: ["mybatis", "mybatis-plus", "mapper", "spring-boot"]
sources:
  - title: MyBatis 3 官方文档
    url: https://mybatis.org/mybatis-3/
    note: SqlSessionFactory、Mapper 接口与 XML 映射的整体结构。
  - title: MyBatis 3 · XML Mapper
    url: https://mybatis.org/mybatis-3/sqlmap-xml.html
    note: mapper namespace、select/insert/update/delete 与 resultMap 的定义。
  - title: MyBatis-Plus 官方文档
    url: https://baomidou.com/
    note: BaseMapper、IService、注解与插件的能力范围。
---

上一章的 Spring Cloud 解决了服务之间的注册、配置与网关;服务之间能互相调用之后,数据最终仍要落到数据库。这一篇从 MyBatis 与 MyBatis-Plus 的分界讲起:哪些代码由框架生成,哪些 SQL 必须自己写。

## 一个负责映射,一个负责通用 CRUD

MyBatis 是半自动 ORM 框架。ORM(Object-Relational Mapping,对象关系映射)把表的一行映射成 Java 对象;「半自动」指 SQL 仍由开发者书写,框架只负责参数绑定、执行与结果映射。与 Hibernate 那类全自动 ORM 相比,SQL 可见、可调优。

MyBatis-Plus(简称 MP)是 MyBatis 之上的一层增强,并非替代品:保留全部 MyBatis 能力,再补上单表通用 CRUD、条件构造器(Wrapper)、分页插件、逻辑删除、主键策略与代码生成器。

分工可以概括为一句话:MP 覆盖增删改查的重复部分,MyBatis 的 XML 承担业务查询。

| 能力 | 提供方 |
| --- | --- |
| SQL 与结果映射 | MyBatis |
| 参数绑定、缓存、插件 | MyBatis |
| BaseMapper 单表 CRUD | MyBatis-Plus |
| 条件构造器、分页 | MyBatis-Plus |
| 逻辑删除、代码生成 | MyBatis-Plus |

## Mapper 接口:XML 与注解两种写法

Mapper 是一个接口,方法名对应一条 SQL 的 id。MyBatis 在启动时为接口生成代理实现,调用方法即执行对应 SQL,不需要手写实现类。

XML 方式把 SQL 放在 resources/mapper/UserMapper.xml:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "https://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.mapper.UserMapper">

    <select id="findById" resultType="com.example.entity.User">
        select id, name, age from sys_user where id = #{id}
    </select>
</mapper>
```

namespace 必须是 Mapper 接口的全限定名,id 与接口方法名一致,MyBatis 靠这两项把方法与 SQL 对应起来。

注解方式适合只有一两行 SQL 的场景:

```java
public interface UserMapper {
    @Select("select id, name, age from sys_user where id = #{id}")
    User findById(Long id);
}
```

两种写法可以混用,同一接口里多数方法走注解、复杂方法放 XML 也可以。SQL 超过一行或需要动态标签时,写在 XML 里更易读。

## @Mapper 与 @MapperScan

@Mapper 标在单个接口上,MyBatis 启动时扫描并注册它。接口分散在多个包时逐个标注很繁琐,改用 @MapperScan 在配置类上声明包路径:

```java
@MapperScan("com.example.mapper")
@SpringBootApplication
public class Application { }
```

Spring Boot 项目通常直接用 @MapperScan,省去每个接口的注解。两个都写不会报错,但只保留一种即可。

## BaseMapper:MP 提供的单表 CRUD

继承 BaseMapper<T>,不用写任何 SQL 就有常用方法:

```java
public interface UserMapper extends BaseMapper<User> { }
```

常用方法:

- insert(entity)、deleteById(id)、updateById(entity)、selectById(id);
- selectList(wrapper)、selectCount(wrapper)、selectPage(page, wrapper);
- selectBatchIds(ids)、deleteBatchIds(ids)。

泛型 T 是实体类,MP 通过反射读取表名、主键与字段。实体与表的对应关系用注解声明:

```java
@TableName("sys_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_name")
    private String userName;

    @TableField(exist = false)
    private String token;   // 非表字段,不参与 CRUD
}
```

- @TableName:实体对应的表名,省略时按类名做驼峰转下划线;
- @TableId:主键字段与生成策略,AUTO 表示数据库自增,ASSIGN_ID 使用雪花算法;
- @TableField:普通字段的列名;exist = false 表示该字段不在表中。

## Service 层:IService 与 ServiceImpl

MP 还提供了 Service 层封装,IService<T> 定义常用业务方法,ServiceImpl<M extends BaseMapper<T>, T> 给出实现:

```java
public interface UserService extends IService<User> {
    User findByPhone(String phone);
}

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    @Override
    public User findByPhone(String phone) {
        return lambdaQuery().eq(User::getPhone, phone).one();
    }
}
```

Controller 注入 UserService 后,既能调用 save、removeById、page 这类通用方法,也能调用自己声明的方法。通用方法与自定义方法放在同一个入口,业务代码不必区分来源。

需要说明的是,IService 只是对 BaseMapper 的薄封装,它不产生新的 SQL 能力;复杂查询仍要回到 Mapper。

## 复杂 SQL 应该写在 XML

MP 的通用方法只覆盖单表。出现以下情况时,把 SQL 写回 Mapper XML:

- 多表 join、子查询、聚合与窗口函数;
- 需要精确控制索引提示、执行顺序或分页写法;
- 结果需要映射成多个对象(association / collection);
- 动态条件与业务语义强相关,用条件构造器拼出来反而难读。

用 MP 的 CRUD 替代所有查询,最终会把 join 拆成多次单表查询,再在 Java 里组装,数据库往返次数与数据量都放大。SQL 擅长的事交给 SQL。

## 小结

- MyBatis 负责 SQL 映射:Mapper 接口声明方法,XML 或注解承载 SQL,框架完成参数绑定与结果映射;
- MyBatis-Plus 在 MyBatis 之上补 BaseMapper 通用 CRUD、条件构造器、分页、逻辑删除与代码生成;
- @Mapper 标单个接口,@MapperScan 按包扫描,Spring Boot 项目通常用后者;
- 实体与表的对应关系由 @TableName、@TableId、@TableField 声明;
- IService / ServiceImpl 是 Service 层的通用封装,不新增 SQL 能力;
- 多表 join、复杂结果映射与强业务语义的查询应写在 XML。
