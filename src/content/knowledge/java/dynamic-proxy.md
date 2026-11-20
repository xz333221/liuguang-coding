---
title: 动态代理
summary: 'JDK 动态代理基于接口:Proxy.newProxyInstance 生成实现类,InvocationHandler.invoke 拦截全部方法调用;无接口时用 CGLIB 子类代理;Spring AOP 据此织入事务、日志等横切逻辑。'
category: java
node: java-reflection-proxy
order: 50
level: 深入
tags: [动态代理, Proxy, InvocationHandler, CGLIB, AOP]
updated: 2026-11-18
mindmap: java-reflection-proxy.mindmap.json
terms: ["runtime", "reference-type", "protocol"]
sources:
  - title: java.lang.reflect.Proxy javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/reflect/Proxy.html
    note: newProxyInstance 与 InvocationHandler 契约的依据。
  - title: Oracle Java 教程 · The Reflection API(代理用例)
    url: https://docs.oracle.com/javase/tutorial/reflect/
    note: 反射与代理关系的参照。
---

上一篇的反射能在运行时调用任意方法。把"调用任意方法"集中到一个拦截点,就得到**动态代理**:不改目标类代码,在调用前后织入日志、事务、权限等横切逻辑。这一篇讲 JDK 动态代理与 CGLIB 两条路线。

## 静态代理的问题

静态代理为每个目标类手写一个代理类,实现相同接口、转发调用并加逻辑:

```java
class UserServiceProxy implements UserService {
    private final UserService target;
    public User find(long id) {
        log("before");
        User u = target.find(id);
        log("after");
        return u;
    }
    // 每个方法都要重复一遍转发 + 逻辑
}
```

接口方法多时代理类膨胀,且逻辑与转发耦合。动态代理把"转发 + 织入"集中到一个处理器,运行时生成代理类。

## JDK 动态代理:基于接口

两个角色:

- `InvocationHandler`:唯一方法 `Object invoke(Object proxy, Method method, Object[] args)`,所有代理方法调用都路由到这里;
- `Proxy.newProxyInstance(loader, interfaces, handler)`:运行时生成实现指定接口的代理类并实例化。

```java
interface UserService {
    User find(long id);
}

UserService target = new UserServiceImpl();

UserService proxy = (UserService) Proxy.newProxyInstance(
        UserService.class.getClassLoader(),
        new Class<?>[]{UserService.class},
        (p, method, args) -> {
            log("before " + method.getName());
            Object result = method.invoke(target, args);   // 转发到目标
            log("after");
            return result;
        });

proxy.find(1);   // 触发 invoke,织入日志
```

限制:**目标必须有接口**,代理类实现的是接口而非继承目标类。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 250" role="img" aria-label="调用方调用代理对象,代理把调用转给 InvocationHandler,再由处理器调用目标对象">
    <defs>
      <marker id="pxArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="238" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="32" y="96" width="120" height="60" rx="12" fill="var(--canvas)" stroke="var(--line)" />
    <text x="92" y="122" font-size="13" fill="var(--ink)" text-anchor="middle">调用方</text>
    <text x="92" y="140" font-size="11" fill="var(--muted)" text-anchor="middle">只认识接口</text>
    <line x1="156" y1="126" x2="212" y2="126" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pxArrow)" />
    <rect x="216" y="86" width="160" height="80" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="296" y="114" font-size="13" font-weight="700" fill="var(--ink)" text-anchor="middle">代理对象</text>
    <text x="296" y="134" font-size="11" fill="var(--muted)" text-anchor="middle">运行时生成,实现同一接口</text>
    <text x="296" y="152" font-size="11" fill="var(--muted)" text-anchor="middle">$Proxy0</text>
    <line x1="380" y1="126" x2="436" y2="126" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pxArrow)" />
    <rect x="440" y="86" width="170" height="80" rx="12" fill="var(--canvas)" stroke="var(--line)" />
    <text x="525" y="112" font-size="13" font-weight="700" fill="var(--ink)" text-anchor="middle">InvocationHandler</text>
    <text x="525" y="132" font-size="11" fill="var(--muted)" text-anchor="middle">invoke(proxy, method, args)</text>
    <text x="525" y="150" font-size="11" fill="var(--muted)" text-anchor="middle">日志 / 事务 / 鉴权写在这</text>
    <line x1="614" y1="126" x2="654" y2="126" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#pxArrow)" />
    <rect x="658" y="96" width="66" height="60" rx="12" fill="var(--canvas)" stroke="var(--line)" />
    <text x="691" y="122" font-size="12" fill="var(--ink)" text-anchor="middle">目标</text>
    <text x="691" y="140" font-size="11" fill="var(--muted)" text-anchor="middle">真实实现</text>
    <text x="32" y="206" font-size="12" fill="var(--muted)">同一个 handler 可以处理任意接口,转发逻辑只写一次;CGLIB 走的是生成子类覆写方法,链路相同但不需要接口。</text>
  </svg>
  <figcaption>动态代理把「转发 + 增强」收在一个处理器里,Spring 的事务与缓存注解就挂在这个位置。</figcaption>
</figure>

## CGLIB:基于子类

无接口时,JDK 代理无能为力。CGLIB(及 ByteBuddy)在运行时**生成目标类的子类**,覆写方法织入逻辑,再委托父类方法:

- 不要求接口;
- 不能代理 final 类 / final 方法(无法继承/覆写);
- 通过方法拦截回调(MethodInterceptor)织入。

Spring AOP 默认:有接口用 JDK 代理,无接口用 CGLIB;Spring Boot 2.x 起默认统一 CGLIB(proxyTargetClass=true),避免"注入接口类型 vs 实现类型"的坑。

## 与 Spring AOP 的关系

Spring 的 @Transactional、@Async、自定义切面,底层就是动态代理:容器返回给你的 Bean 往往是代理对象,调用方法时先经过拦截器链(事务开启/提交、日志、权限),再转发到目标方法。

由此带来一个经典陷阱:**同类内部方法自调用不走代理**(this.method() 绕过代理对象),导致 @Transactional 失效(第 14 章事务篇详述)。理解代理是理解这类失效的前提。

## 小结

- 静态代理逐方法转发,膨胀;动态代理集中拦截;
- JDK 代理基于接口:Proxy.newProxyInstance + InvocationHandler.invoke;
- CGLIB 基于子类,无接口可用,final 类/方法不可代理;
- Spring AOP 用动态代理织入横切逻辑;
- 自调用绕过代理,是事务/切面失效的常见根因。

下一篇讲注解:把元数据写进代码,供反射读取驱动行为。