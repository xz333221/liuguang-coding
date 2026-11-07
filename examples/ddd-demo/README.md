# ddd-demo

流光知识库「DDD:先把"下单"关进一个限界上下文里」的配套示例。
一个纯 Java 的下单上下文,不依赖 Spring,也不连数据库 —— 这样领域层才真的"干净"。

## 目录

```
ddd-demo/
├─ pom.xml                             只有 junit 一个测试依赖,main 里不引任何框架
└─ src/main/java/com/liuguang/ddd/order/      ← 一个限界上下文(order)
   ├─ domain/                          领域层:纯 Java,业务规则都在这里
   │  ├─ model/
   │  │  ├─ Order.java                 聚合根:不变式与状态流转
   │  │  ├─ OrderId.java               值对象
   │  │  ├─ OrderLine.java             实体(只在聚合内部)
   │  │  ├─ Money.java                 值对象:金额
   │  │  └─ OrderStatus.java
   │  ├─ event/OrderPlaced.java        领域事件(过去时命名)
   │  ├─ event/DomainEventPublisher.java  发布能力(接口在领域层)
   │  └─ repository/OrderRepository.java  仓储接口(接口在领域层)
   ├─ application/                     应用层:一个方法一个用例
   │  ├─ OrderApplicationService.java
   │  ├─ command/PlaceOrderCommand.java
   │  └─ view/OrderView.java           出参:不把聚合根漏出去
   ├─ infrastructure/                  基础设施层:实现领域层声明的接口
   │  ├─ InMemoryOrderRepository.java
   │  └─ ConsoleEventPublisher.java
   └─ interfaces/OrderCli.java         接口层:这次用命令行,换成 Controller 也一样
```

## 跑起来

```bash
mvn test                       # 领域层与应用层的测试
mvn -q compile exec:java -Dexec.mainClass=com.liuguang.ddd.order.interfaces.OrderCli
```

没有 Maven 也行(只用 JDK 17):

```bash
javac -encoding UTF-8 -d out -sourcepath src/main/java \
      src/main/java/com/liuguang/ddd/order/interfaces/OrderCli.java
java -cp out com.liuguang.ddd.order.interfaces.OrderCli
```

输出:

```
[领域事件] OrderPlaced[orderId=ORD-xxxx, customerId=C-1001, total=Money[amount=92.30, currency=CNY], occurredAt=...]
下单成功:OrderView[id=ORD-xxxx, status=PLACED, total=92.30, lineCount=2]
取消之后:OrderView[id=ORD-xxxx, status=CANCELLED, total=92.30, lineCount=2]
```

## 这个例子想说明的四件事

1. **依赖方向是 interfaces → application → domain ← infrastructure**。infrastructure 依赖 domain(实现它声明的接口),domain 谁也不依赖 —— 所以它可以用 javac 单独编译、用单元测试单独跑。
2. **不变式只在聚合根里守**:空订单不能提交、最多 20 行、提交后不能再加商品,都在 `Order` 里,Service 一行判断都不写。
3. **仓储接口放 domain**:换成数据库只改 `infrastructure`,应用层与领域层不动。
4. **领域事件由聚合产生、由应用层发布**:聚合只攒着,发到哪是基础设施的事。
