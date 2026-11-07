# springboot-demo

流光知识库「Spring Boot:一个项目从哪几个文件夹开始」的配套示例。
一个只做一件事的小服务:登记书、标记读过、按 id 查。

## 目录

```
springboot-demo/
├─ pom.xml                         依赖与构建配置(Maven 的工程描述)
├─ src/
│  ├─ main/
│  │  ├─ java/com/liuguang/demo/
│  │  │  ├─ DemoApplication.java   启动类,必须在最外层的包
│  │  │  ├─ controller/            接口层:路由、参数、状态码
│  │  │  ├─ service/               业务层:规则、事务边界
│  │  │  ├─ repository/            仓储层:只做存取
│  │  │  ├─ model/                 实体:和表一一对应的数据形状
│  │  │  ├─ dto/                   入参出参:只放该给调用方看的字段
│  │  │  ├─ config/                配置类:声明可替换的基础设施 Bean
│  │  │  └─ exception/             自定义异常 + 全局异常处理
│  │  └─ resources/
│  │     ├─ application.yml        端口、数据源、日志等配置
│  │     ├─ schema.sql             建表语句
│  │     └─ data.sql               示例数据
│  └─ test/java/com/liuguang/demo/ 测试,不进产物
└─ target/                         构建产物,已在 .gitignore 里
```

## 跑起来

```bash
mvn spring-boot:run          # 开发期直接跑
mvn test                     # 跑测试(会起真实的 Spring 容器)
mvn package && java -jar target/springboot-demo-1.0.0.jar
```

打开 <http://localhost:8080/api/books> 应该能看到一条示例数据。

```bash
curl -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"代码整洁之道","author":"Robert C. Martin"}'

curl http://localhost:8080/api/books/1
curl -X PUT http://localhost:8080/api/books/1/read
```

## 请求怎么走

```
GET /api/books/1
      │
      ▼
BookController     ← 路由、@PathVariable 绑定、返回 200
      │  调
      ▼
BookService        ← 查不到抛 BookNotFoundException，方法上开事务
      │  调
      ▼
BookRepository     ← JpaRepository 生成的代理，发一条 select
      │
      ▼
H2 (内存库)
```

异常从 Service 抛出来之后，GlobalExceptionHandler 把它翻译成
`404 + ProblemDetail`,Controller 里不需要 try-catch。
