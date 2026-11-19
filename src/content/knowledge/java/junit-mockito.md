---
title: 单元测试:JUnit 与 Mockito
summary: 'JUnit 5 用 @Test、生命周期方法与断言组织测试,参数化测试覆盖多组输入;Mockito 用 mock、when、verify 与 ArgumentCaptor 隔离 Repository 等边界依赖;单元测试应遵循金字塔,不测私有方法、不 mock 值对象。'
category: java
node: java-build-test
order: 68
level: 进阶
tags: [JUnit 5, Mockito, 单元测试, 测试金字塔]
updated: 2026-11-19
mindmap: junit-mockito.mindmap.json
terms: ["runtime", "value"]
sources:
  - title: JUnit 5 用户指南
    url: https://junit.org/junit5/docs/current/user-guide/
    note: 注解、生命周期、断言与参数化测试的权威说明。
  - title: Mockito 官方网站
    url: https://site.mockito.org/
    note: mock、stubbing、verify 与 JUnit 5 扩展的入口。
  - title: JUnit 5 用户指南 · Writing Tests
    url: https://junit.org/junit5/docs/current/user-guide/#writing-tests
    note: 测试类与测试方法的可见性约定。
---

上一篇把项目拆成多个模块,每个模块都需要独立验证。单元测试是最经济的验证方式:不启动容器、不连数据库,直接调用类的方法并断言结果。JUnit 5 负责组织测试与断言,Mockito 负责隔离外部依赖。

## JUnit 5 基础

JUnit 5 由 Jupiter API 与对应引擎组成,@Test 标记测试方法,@BeforeEach 在每个测试方法前执行,@AfterEach 在其后执行,@DisplayName 提供可读的测试名称。

测试类与方法不要求 public,包级私有即可,但不能声明为 private;测试类需要一个无参构造器,使用默认构造器即可满足。类名以 Test 结尾是约定,便于 Surefire 插件扫描。

```java
class CalculatorTest {

    private Calculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new Calculator();
    }

    @Test
    @DisplayName("2 + 3 等于 5")
    void add() {
        assertEquals(5, calculator.add(2, 3));
    }

    @Test
    void divideByZeroThrows() {
        assertThrows(ArithmeticException.class, () -> calculator.divide(1, 0));
    }
}
```

@BeforeEach 用于创建独立实例,@AfterEach 用于释放资源。测试之间不应共享可变状态,否则执行顺序会影响结果。

## 断言与参数化测试

常用断言包括 assertEquals、assertTrue、assertFalse、assertNull 与 assertThrows。assertAll 把一个对象的多个断言分组,全部执行后再统一报告失败,便于一次看到所有问题。

@ParameterizedTest 让同一段逻辑使用多组输入执行。@ValueSource 提供一组字面量,@CsvSource 提供多列数据,@MethodSource 引用返回数据流的方法。参数化测试位于 junit-jupiter-params,junit-jupiter 聚合依赖已经包含。

```java
@ParameterizedTest
@ValueSource(ints = {2, 4, 6})
void allEven(int n) {
    assertTrue(n % 2 == 0);
}

@Test
void userFields() {
    User user = new User("alice", 20);
    assertAll(
        () -> assertEquals("alice", user.getName()),
        () -> assertEquals(20, user.getAge())
    );
}
```

## Mockito:隔离外部依赖

单元测试不应访问数据库或网络,被测类依赖的 Repository、HTTP 客户端用测试替身(test double)替代。Mockito 为接口或类生成替身,常用 API 如下:

- mock(Class):创建 mock 对象;
- when(...).thenReturn(...) 与 thenThrow(...):定义返回值或异常;
- verify(mock).method(...):确认调用发生;times(n) 指定次数,never() 表示从未调用;
- ArgumentCaptor:捕获传入参数,检查参数内容。

例如 `verify(repository).save(captor.capture())` 之后,用 `captor.getValue()` 读取实际传入的对象。

mock 对未 stub 的方法返回 null、0 或 false,不会抛异常,漏写的 stub 往往表现为空指针。对关键调用补 verify,可以暴露未执行的分支。

## 注解方式:@ExtendWith、@Mock 与 @InjectMocks

@ExtendWith(MockitoExtension.class) 接管 mock 的创建与注入;@Mock 声明一个 mock 字段,@InjectMocks 创建被测对象并把 mock 注入其中,优先使用构造器注入;@Captor 简化 ArgumentCaptor 的声明。完整写法见下一节。

@InjectMocks 只注入声明过的 mock,不会自动装配真实依赖。需要 Spring 容器能力时应使用 @SpringBootTest,那属于集成测试,第 13 章展开。

## 测试粒度与原则

测试金字塔:底层单元测试数量最多,中层集成测试较少,顶层端到端测试最少。单元测试执行快、结果稳定,应覆盖主要分支与边界条件。

- 不测私有方法:私有方法是实现细节,通过公有方法的行为验证;直接测试私有方法会让重构成本变高;
- 不 mock 值对象:User、Money 这类只有数据的对象直接创建并断言字段,mock 之后断言失去意义;
- 只 mock 边界:Repository、HTTP 客户端、消息队列与时钟属于边界,业务逻辑与数据结构使用真实对象;
- 一个测试一个行为:断言过多会掩盖第一个失败原因,assertAll 只用于同一对象的字段检查。

运行期(runtime)行为与值对象(value object)的构造都应尽量贴近真实,只有边界依赖才需要替身。

## 完整例子:Service 依赖 Repository

```java
interface UserRepository {
    Optional<User> findById(long id);
    boolean existsByEmail(String email);
    void save(User user);
}

class User {
    private final String email;
    private final String name;

    User(long id, String email, String name) {
        this.email = email;
        this.name = name;
    }
    String getEmail() { return email; }
}

class UserService {
    private final UserRepository repository;

    UserService(UserRepository repository) { this.repository = repository; }

    User register(String email, String name) {
        if (repository.existsByEmail(email)) {
            throw new IllegalArgumentException("email exists: " + email);
        }
        User user = new User(0L, email, name);
        repository.save(user);
        return user;
    }
}

@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository repository;
    @InjectMocks UserService service;

    @Test
    void registerSavesNewUser() {
        when(repository.existsByEmail("a@example.com")).thenReturn(false);

        User user = service.register("a@example.com", "alice");

        assertEquals("a@example.com", user.getEmail());
        verify(repository).save(user);
    }
    @Test
    void registerRejectsDuplicateEmail() {
        when(repository.existsByEmail("a@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
            () -> service.register("a@example.com", "alice"));
        verify(repository, never()).save(any());
    }
}
```

两个测试分别覆盖正常注册与邮箱重复两条路径,Repository 全程是 mock,不接触数据库。这类测试执行在毫秒级,适合在每次提交前运行。

## 小结

- JUnit 5 用 @Test、@BeforeEach、@AfterEach 组织测试,测试类与方法包级私有即可;
- assertEquals、assertAll、assertThrows 覆盖值与异常断言,@ParameterizedTest 复用多组输入;
- Mockito 用 mock、when、thenReturn、thenThrow 定义行为,verify、times、never 验证调用;
- @ExtendWith(MockitoExtension.class) 配合 @Mock、@InjectMocks、@Captor 简化测试代码;
- 单元测试遵循金字塔,不测私有方法,不 mock 值对象,只 mock 边界依赖。
