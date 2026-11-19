---
title: 通配符与上下界(PECS)
summary: '? extends T 是上界,只读不写(producer);? super T 是下界,只写不读具体类型(consumer);PECS 即 Producer Extends、Consumer Super,用于设计接受泛型容器的 API。'
category: java
node: java-generics-wildcard
order: 38
level: 进阶
tags: [通配符, 上界, 下界, PECS]
updated: 2026-11-18
mindmap: java-generics-wildcard.mindmap.json
terms: ["reference-type", "compile-time"]
sources:
  - title: Oracle Java 教程 · Wildcards
    url: https://docs.oracle.com/javase/tutorial/java/generics/wildcards.html
    note: 上界/下界通配符与读写限制的依据。
  - title: Oracle Java 教程 · Wildcard Use and PECS
    url: https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html
    note: PECS 原则与 Collections.copy 签名的参照。
---

上一篇留下一个问题:方法想接受"元素是 Number 或其子类的列表",写 `List<Number>` 会拒绝 `List<Integer>`。通配符 `?` 就是为这种"类型不确定但有范围"的场景准备的。

## 无界通配符 ?

`List<?>` 表示"元素类型未知但确定的某个列表"。可以读(读出来是 Object),不能 add 除 null 外的任何元素——因为编译器不知道它到底装什么:

```java
static void print(List<?> list) {
    for (Object o : list) {
        System.out.println(o);
    }
    // list.add("x");   // 编译错误:未知类型,无法保证安全
}
```

`List<?>` 与 `List<Object>` 不同:后者是"确定装 Object 的列表",可以 add 任何对象;前者是"类型未知的列表",只读。

## 上界 ? extends T:只读(producer)

`List<? extends Number>` 表示"元素是 Number 或 Number 的某个子类"。可以接受 List<Integer>、List<Double>:

```java
static double sum(List<? extends Number> list) {
    double total = 0;
    for (Number n : list) {   // 读出来至少是 Number,安全
        total += n.doubleValue();
    }
    return total;
    // list.add(1);           // 编译错误:可能是 List<Double>,add Integer 不安全
}
```

读安全(元素必是 Number 的子类),写不安全(不知道具体子类,无法保证 add 的类型匹配)。因此上界通配符适合作**数据提供方**(producer):你从它里面读。

## 下界 ? super T:只写(consumer)

`List<? super Integer>` 表示"元素是 Integer 或 Integer 的某个父类"。可以接受 List<Integer>、List<Number>、List<Object>:

```java
static void fill(List<? super Integer> list) {
    list.add(1);      // 写安全:无论实际是 Integer/Number/Object 都装得下
    list.add(2);
    // Integer n = list.get(0);   // 编译错误:读出来只能保证是 Object
}
```

写安全(add Integer 必兼容),读不安全(读出来只能当 Object)。因此下界通配符适合作**数据消费方**(consumer):你往它里面写。

## PECS:Producer Extends, Consumer Super

把两条规则合成一句口诀:**PECS**(Producer Extends, Consumer Super)。

- 参数是给你**读**数据的容器 → `? extends T`;
- 参数是让你**写**数据的容器 → `? super T`;
- 既读又写 → 不用通配符,用精确类型 `List<T>`。

JDK 的 `Collections.copy` 是标准示例:

```java
public static <T> void copy(List<? super T> dest, List<? extends T> src)
```

src 是提供方用 extends,dest 是消费方用 super。照这个模式设计自己的泛型 API 即可。

## ? 与 T 的分工

- `T` 是**声明处**的类型参数:定义类/方法时引入,方法体内可多次引用同一类型;
- `?` 是**使用处**的通配符:表示某个未知但受约束的类型,不能给它 add、也不能声明变量类型为 ?。

需要"方法内多处用到同一类型"时用 T;只是"接受一个范围受限的容器"时用 ?。

## 小结

- `List<?>` 未知类型,只读;
- `? extends T` 上界:读安全写不安全,作 producer;
- `? super T` 下界:写安全读不安全,作 consumer;
- PECS:读用 extends、写用 super、既读又写用精确 T;
- T 用于声明处,? 用于使用处。

下一篇讲类型擦除:泛型信息在编译后去了哪里,以及由此带来的限制。