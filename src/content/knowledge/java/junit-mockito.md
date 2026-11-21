---
title: 单元测试：JUnit 与 Mockito
summary: 'JUnit 5 用 @Test/断言/生命周期注解组织测试，@ParameterizedTest 数据驱动；Mockito mock 隔离外部依赖，when/thenReturn 打桩、verify 验证交互；测试应独立可重复、覆盖边界。'
category: java
node: java-build-test
order: 68
level: 进阶
tags: [JUnit, Mockito, 断言, 打桩, 参数化测试]
updated: 2026-11-18
mindmap: java-build-test.mindmap.json
terms: ["maven", "runtime"]
sources:
  - title: JUnit 5 User Guide
    url: https://junit.org/junit5/docs/current/user-guide/
    note: 注解、断言、参数化测试与生命周期的官方依据。
  - title: Mockito 官方文档
    url: https://site.mockito.org/
    note: mock/spy/打桩/验证的参照。
---

构建的 test 阶段跑的就是单元测试。JUnit 负责"组织与断言",Mockito 负责"隔离依赖"。这一篇讲两者配合写出独立、可重复、覆盖边界的测试。

## JUnit 5 基础

```java
class CalculatorTest {
    private Calculator calc;

    @BeforeEach
    void setUp() { calc = new Calculator(); }

    @Test
    void addsTwoNumbers() {
        assertEquals(5, calc.add(2, 3));
    }

    @Test
    void divideByZeroThrows() {
        assertThrows(ArithmeticException.class, () -> calc.divide(1, 0));
    }
}
```

- @Test 标记测试方法；@BeforeEach/@AfterEach 每方法前后；@BeforeAll/@AfterAll 全类一次(静态);
- 断言：assertEquals/assertTrue/assertNull/assertThrows/assertAll(组合);
- @DisplayName 可读名；@Disabled 跳过；@Tag 分组。

## 参数化测试

```java
@ParameterizedTest
@CsvSource({"2,3,5", "0,0,0", "-1,1,0"})
void adds(int a, int b, int expected) {
    assertEquals(expected, calc.add(a, b));
}
```

@ValueSource/@CsvSource/@MethodSource 提供数据，一个方法跑多组，覆盖边界(0、负数、空、极大)而不复制方法。

## Mockito:隔离依赖

测 Service 时不想真连数据库/发 HTTP，用 mock 替换依赖：

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock OrderRepository repo;
    @InjectMocks OrderService service;

    @Test
    void createsOrderWhenStockEnough() {
        when(repo.findStock("sku-1")).thenReturn(10);   // 打桩
        Order o = service.create("sku-1", 2);
        assertNotNull(o);
        verify(repo).save(any(Order.class));            // 验证交互
    }

    @Test
    void rejectsWhenStockShort() {
        when(repo.findStock("sku-1")).thenReturn(0);
        assertThrows(IllegalStateException.class, () -> service.create("sku-1", 1));
        verify(repo, never()).save(any());
    }
}
```

- @Mock 创建模拟对象，@InjectMocks 注入被测对象；
- when(...).thenReturn/thenThrow 打桩；any()/eq() 参数匹配；
- verify 验证调用次数/参数；never()/times(n);
- spy 包装真实对象部分打桩(慎用，易掩盖设计问题)。

## 测试原则

- **独立可重复**:不依赖执行顺序、外部状态、当前时间/随机(注入 Clock/Random);
- **覆盖边界与异常**:空、null、0、负、越界、并发；
- **测行为不测实现**:断言可观察结果与交互，不绑死内部私有细节；
- **快**:单元测试不连真实 IO，集成测试另分层(@Tag/失败安全);
- 命名表达意图：方法名/DisplayName 说清"什么条件→什么结果"。

## Maven 集成

surefire 插件默认跑 *Test/Test*/*Tests 类；mvn test 执行；失败则构建中断。覆盖率用 JaCoCo 插件(jacoco:report)，但覆盖率是参考不是目标，关键路径与边界优先。

## 小结

- JUnit 5:@Test/断言/生命周期/@ParameterizedTest 数据驱动；
- Mockito:@Mock/@InjectMocks 隔离，when 打桩、verify 验证；
- 独立可重复、覆盖边界异常、测行为不测实现、快；
- surefire 跑测试，JaCoCo 覆盖率参考；
- 测试是重构的安全网，先写关键路径。

第 12 章到此。下一章 Spring 生态：Boot 结构、IoC、自动配置、Web、配置、Servlet、Cloud。