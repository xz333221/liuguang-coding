---
title: 结构型:代理 / 装饰器 / 适配器
summary: '三者都是「把一个对象包在另一个对象外面」,接口关系相似而意图不同:代理和目标实现同一接口、控制对目标的访问(鉴权、延迟加载、远程调用),装饰器也实现同一接口、在不改接口的前提下层层叠加职责,适配器实现调用方期望的接口、把不兼容的实现转过来。判断口诀:控制访问是代理,叠加能力是装饰器,转换接口是适配器。'
category: java
node: java-patterns-structural
order: 83
level: 进阶
tags: [设计模式, 代理, 装饰器, 适配器, 动态代理]
updated: 2026-11-20
mindmap: structural.mindmap.json
terms: ["object", "reference-type", "runtime"]
sources:
  - title: Refactoring Guru · 代理
    url: https://refactoringguru.cn/design-patterns/proxy
    note: 代理与目标同接口、控制访问的定位。
  - title: Refactoring Guru · 装饰器
    url: https://refactoringguru.cn/design-patterns/decorator
    note: 包装同类型组件并叠加职责的结构。
  - title: Refactoring Guru · 适配器
    url: https://refactoringguru.cn/design-patterns/adapter
    note: 类适配器与对象适配器的差异。
---

上一篇的创建型管「对象怎么生出来」,这一篇管「生出来之后怎么套一层」。代理、装饰器、适配器的类图几乎一样:都是一个类持有另一个对象、都实现某个接口。区分它们只看意图,不看结构。

## 代理:控制访问

代理和目标实现同一个接口,调用方拿到的是代理,代理决定「要不要真的转给目标」。

```java
public interface ReportService {
    String load(long id);
}

public class ReportServiceProxy implements ReportService {

    private final ReportService target;
    private final CurrentUser currentUser;

    public ReportServiceProxy(ReportService target, CurrentUser currentUser) {
        this.target = target;
        this.currentUser = currentUser;
    }

    @Override
    public String load(long id) {
        if (!currentUser.hasPermission("report:read")) {
            throw new SecurityException("无权访问");
        }
        long start = System.nanoTime();
        try {
            return target.load(id);                 // 真正的调用
        } finally {
            log.info("load cost {} ns", System.nanoTime() - start);
        }
    }
}
```

代理的典型用途:权限校验、访问计数、延迟加载(Hibernate 的实体代理)、远程调用(RPC 把本地方法变成网络请求)、事务与缓存。

手写代理的缺点是每个方法都要转发一遍。第 8 章的 JDK 动态代理把转发收进一个 `InvocationHandler`,Spring 的 `@Transactional` / `@Cacheable` / `@Async` 全走这条路。理解代理,是理解这些注解为什么「同类自调不生效」的前提。

## 装饰器:叠加职责

装饰器同样实现目标接口,但它不是「控制能不能访问」,而是「在访问前后加点东西」,并且可以一层层套:

```java
public interface Notifier {
    void send(String msg);
}

public class SmsNotifier implements Notifier {
    public void send(String msg) { /* 发短信 */ }
}

public class RetryDecorator implements Notifier {
    private final Notifier inner;
    public RetryDecorator(Notifier inner) { this.inner = inner; }

    public void send(String msg) {
        for (int i = 0; i < 3; i++) {
            try { inner.send(msg); return; }
            catch (RuntimeException e) { if (i == 2) throw e; }
        }
    }
}

public class LogDecorator implements Notifier {
    private final Notifier inner;
    public LogDecorator(Notifier inner) { this.inner = inner; }

    public void send(String msg) {
        log.info("send: {}", msg);
        inner.send(msg);
    }
}
```

组合方式随意,顺序有意义:

```java
Notifier notifier = new LogDecorator(new RetryDecorator(new SmsNotifier()));
```

日志在最外层,重试的每一次都会被记录;反过来套,重试只发生在日志内部,失败的三次只有一条日志。

Java 里最熟悉的装饰器是 IO:`new DataInputStream(new BufferedInputStream(new FileInputStream(f)))`——每层只加一种能力(缓冲、读基本类型),自由组合。设计上一个关键点:**装饰器必须实现同一接口**,否则不能互相套。这也是它和「在业务类里加几个 if」的本质区别。

## 适配器:转换接口

适配器实现的是**调用方期望的接口**,内部持有**不兼容的实现**:

```java
// 第三方支付 SDK,签名与返回值都不是我们想要的样子
public class ThirdPartyPaySdk {
    public Map<String, Object> doPay(String json, String sign) { /* ... */ }
}

// 我们系统内部统一的支付接口
public interface PayGateway {
    PayResult pay(BigDecimal amount, String orderNo);
}

public class ThirdPartyPayAdapter implements PayGateway {

    private final ThirdPartyPaySdk sdk;

    public ThirdPartyPayAdapter(ThirdPartyPaySdk sdk) { this.sdk = sdk; }

    @Override
    public PayResult pay(BigDecimal amount, String orderNo) {
        String json = Json.write(Map.of(
                "amount", amount.movePointRight(2).longValue(),   // 元 → 分
                "orderNo", orderNo));
        Map<String, Object> raw = sdk.doPay(json, sign(json));

        int code = (int) raw.get("ret_code");
        return switch (code) {
            case 0 -> PayResult.ok((String) raw.get("trade_no"));
            case 1001 -> PayResult.fail("余额不足");
            default -> PayResult.fail("支付失败: " + code);
        };
    }
}
```

适配器干三件事:转换方法签名、转换数据形态(元与分、枚举与状态码)、隔离第三方类型。做完之后,业务代码里再也不会出现 `ThirdPartyPaySdk` 这个类——它只在适配器里出现一次。这就是第 16 章会讲的防腐层的雏形。

对象适配器(组合)比类适配器(多继承)更常用,因为 Java 单继承,而且组合还能在运行期替换实现。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 290" role="img" aria-label="代理、装饰器、适配器三者都包一层,但接口关系与意图不同">
    <defs>
      <marker id="stArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="278" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <g>
      <rect x="24" y="30" width="228" height="228" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
      <text x="44" y="54" font-size="12.5" font-weight="700" fill="var(--ink)">代理</text>
      <g font-size="11.5" text-anchor="middle">
        <rect x="48" y="66" width="180" height="34" rx="8" fill="var(--panel)" stroke="var(--line)" />
        <text x="138" y="88" fill="var(--ink)">调用方</text>
        <rect x="48" y="122" width="180" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
        <text x="138" y="144" fill="var(--ink)">代理:控制访问</text>
        <rect x="48" y="178" width="180" height="34" rx="8" fill="var(--panel)" stroke="var(--line)" />
        <text x="138" y="200" fill="var(--ink)">目标(同接口)</text>
      </g>
      <line x1="138" y1="104" x2="138" y2="116" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <line x1="138" y1="160" x2="138" y2="172" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <text x="138" y="238" font-size="11" fill="var(--muted)" text-anchor="middle">决定「能不能进」</text>
    </g>
    <g>
      <rect x="266" y="30" width="228" height="228" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
      <text x="286" y="54" font-size="12.5" font-weight="700" fill="var(--ink)">装饰器</text>
      <g font-size="11.5" text-anchor="middle">
        <rect x="290" y="66" width="180" height="30" rx="8" fill="var(--panel)" stroke="var(--line)" />
        <text x="380" y="86" fill="var(--ink)">调用方</text>
        <rect x="290" y="110" width="180" height="30" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
        <text x="380" y="130" fill="var(--ink)">装饰器 A:日志</text>
        <rect x="290" y="154" width="180" height="30" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
        <text x="380" y="174" fill="var(--ink)">装饰器 B:重试</text>
        <rect x="290" y="198" width="180" height="30" rx="8" fill="var(--panel)" stroke="var(--line)" />
        <text x="380" y="218" fill="var(--ink)">目标(同接口)</text>
      </g>
      <line x1="380" y1="100" x2="380" y2="106" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <line x1="380" y1="144" x2="380" y2="150" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <line x1="380" y1="188" x2="380" y2="194" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <text x="380" y="246" font-size="11" fill="var(--muted)" text-anchor="middle">任意层,叠加能力</text>
    </g>
    <g>
      <rect x="508" y="30" width="228" height="228" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
      <text x="528" y="54" font-size="12.5" font-weight="700" fill="var(--ink)">适配器</text>
      <g font-size="11.5" text-anchor="middle">
        <rect x="532" y="66" width="180" height="34" rx="8" fill="var(--panel)" stroke="var(--line)" />
        <text x="622" y="88" fill="var(--ink)">调用方(期望接口)</text>
        <rect x="532" y="122" width="180" height="34" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
        <text x="622" y="144" fill="var(--ink)">适配器:转换</text>
        <rect x="532" y="178" width="180" height="34" rx="8" fill="var(--panel)" stroke="var(--line)" stroke-dasharray="5 4" />
        <text x="622" y="200" fill="var(--muted)">第三方(接口不同)</text>
      </g>
      <line x1="622" y1="104" x2="622" y2="116" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <line x1="622" y1="160" x2="622" y2="172" stroke="var(--muted)" stroke-width="1.4" marker-end="url(#stArrow)" />
      <text x="622" y="238" font-size="11" fill="var(--muted)" text-anchor="middle">接口对不上才用它</text>
    </g>
  </svg>
  <figcaption>结构几乎一样,区别只在意图:控制访问 / 叠加能力 / 转换接口。</figcaption>
</figure>

## 三者怎么分

| | 代理 | 装饰器 | 适配器 |
| --- | --- | --- | --- |
| 实现什么接口 | 和目标相同 | 和目标相同 | 调用方期望的接口 |
| 内部持有 | 目标 | 同接口组件 | 不兼容的实现 |
| 意图 | 控制访问 | 叠加职责 | 转换接口 |
| 能否多层嵌套 | 一般一层 | 任意层 | 一般一层 |
| 典型例子 | Spring AOP、Hibernate 懒加载 | `BufferedInputStream` | 第三方 SDK 包装 |

判断口诀:**能不能访问**是代理,**多做了一点**是装饰器,**接口对不上**是适配器。三者的代码长得像,是因为它们都遵守「面向接口 + 组合优于继承」,而不是因为它们是一回事。

## 小结

- 代理与目标同接口,控制访问:鉴权、计数、懒加载、远程调用、事务;动态代理把转发集中到 `InvocationHandler`;
- 装饰器与目标同接口,叠加职责,可任意嵌套,顺序影响语义;IO 流是最典型的例子;
- 适配器实现调用方期望的接口,内部持有不兼容实现,顺手转换单位与状态码;
- 区分靠意图:控制访问 / 叠加能力 / 转换接口;
- 共同前提是「面向接口」,没有接口这三者都无从下手。

下一篇讲行为型:把分支、通知与流程骨架从业务代码里抽出来。
