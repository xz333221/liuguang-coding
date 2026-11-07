# mybatis-demo

流光知识库「MyBatis 与 MyBatis-Plus:谁写 SQL,谁不写」的配套示例。
同一个 `book` 表,两条路并存:

- **MyBatis**:`BookMapper.xml` 里的手写 SQL、动态 `where`、`resultMap`;
- **MyBatis-Plus**:`BaseMapper` 的 CRUD、条件构造器、分页插件、自动填充、逻辑删除。

## 目录

```
mybatis-demo/
├─ pom.xml                             spring-boot-starter-parent + mybatis-plus-spring-boot3-starter
├─ src/main/java/com/liuguang/mybatis/
│  ├─ MybatisDemoApplication.java      @MapperScan 在这里
│  ├─ entity/Book.java                 表结构 + MP 注解(主键策略、逻辑删除、自动填充)
│  ├─ mapper/BookMapper.java           继承 BaseMapper,再声明一个手写 SQL 方法
│  ├─ service/BookService.java         继承 ServiceImpl:条件构造器 + 调用 XML
│  ├─ controller/BookController.java   /api/books 分页、/api/books/search
│  └─ config/
│     ├─ MybatisPlusConfig.java        分页插件
│     └─ AuditFieldsHandler.java       自动填充 created_at / updated_at
├─ src/main/resources/
│  ├─ application.yml                  mapper-locations、驼峰映射、打印 SQL
│  ├─ mapper/BookMapper.xml            手写 SQL 与动态 where、resultMap
│  ├─ schema.sql                       建表
│  └─ data.sql                         三条示例数据
└─ src/test/java/.../BookMapperTest.java  两条路都测一遍
```

## 跑起来

```bash
mvn spring-boot:run        # 端口 8081
mvn test                   # 起真容器,连 H2 内存库
```

```bash
curl "http://localhost:8081/api/books?author=周志明&page=1&size=3"
curl "http://localhost:8081/api/books/search?keyword=Java&readOnly=true"
curl -X POST http://localhost:8081/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"重构","author":"Martin Fowler","read":false}'
curl -X DELETE http://localhost:8081/api/books/1
```

`application.yml` 里开了 `log-impl: StdOutImpl`,每条 SQL 都会打到控制台 ——
`deleteById` 打出来的是 `UPDATE book SET deleted=1 ...`,不是 DELETE,这就是逻辑删除。

## 三个容易记错的地方

1. **`namespace` 与 `id`**:`namespace` 是 Mapper 接口全限定名,`id` 是方法名。对不上时启动不报错,调用才抛 `Invalid bound statement (not found)`。
2. **`read_flag` → `read`**:驼峰映射只能把 `read_flag` 对到 `readFlag`,对不到 `read`,所以实体上要写 `@TableField("read_flag")`,XML 里要写 `resultMap`。
3. **分页插件**:没装 `PaginationInnerInterceptor`,`selectPage` 不会发 count、也不会改写 limit。
