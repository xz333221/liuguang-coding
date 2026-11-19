---
title: 不可变集合与 Collections 工具
summary: 'List.of/Set.of/Map.of 创建真不可变集合(禁止 null、修改抛 UnsupportedOperationException);Collections.unmodifiableXxx 只是视图,底层可变则仍可变;共享与返回内部集合时用不可变或防御性拷贝。'
category: java
node: java-collections-immutable
order: 44
level: 进阶
tags: [不可变集合, List.of, 防御性拷贝, Collections]
updated: 2026-11-18
mindmap: java-collections-immutable.mindmap.json
terms: ["reference-type", "null", "in-place"]
sources:
  - title: Oracle Java 教程 · Unmodifiable Collections
    url: https://docs.oracle.com/javase/tutorial/collections/interfaces/unmodif.html
    note: 不可变集合与 unmodifiable 视图区别的依据。
  - title: List.of javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html#of(E...)
    note: of 工厂的不可变性与 null 禁止的官方描述。
---

集合默认是可变的,任何持有引用的代码都能改它。当集合要被共享、缓存或作为对象内部状态返回时,可变性就是隐患。这一篇讲不可变集合的几种创建方式,以及"真不可变"与"只读视图"的关键区别。

## List.of / Set.of / Map.of:真不可变

JDK9 起的 of 工厂创建**结构不可变**的集合:任何 add/remove/set 都抛 UnsupportedOperationException;且**禁止 null 元素**(of 时传 null 抛 NullPointerException)。

```java
List<String> list = List.of("a", "b", "c");
// list.add("d");        // UnsupportedOperationException
// List.of("a", null);   // NullPointerException

Map<String, Integer> m = Map.of("a", 1, "b", 2);
Set<Integer> s = Set.of(1, 2, 3);   // 重复元素抛 IllegalArgumentException
```

特点:迭代顺序不保证(除 List.of 按给定顺序);内部紧凑存储,比可变实现更省内存;天然线程安全(无可变状态)。

JDK10 起另有 `copyOf(coll)`:把已有集合复制为不可变集合;若传入的已是不可变 of 集合则直接返回,不复制。

## Collections.unmodifiableXxx:只读视图

`Collections.unmodifiableList(list)` 返回一个**视图**(view):包装原集合,拦截修改操作抛异常,但**读操作转发到原集合**。因此:

```java
List<String> base = new ArrayList<>(List.of("a"));
List<String> view = Collections.unmodifiableList(base);
// view.add("b");      // UnsupportedOperationException
base.add("b");         // 原集合仍可改
System.out.println(view);   // [a, b] —— 视图跟着变!
```

视图不是不可变集合:只要底层 base 可变且被别人持有,视图内容就会变。它只保证"通过这个引用不能改",不保证"内容不变"。

## 真不可变 vs 视图:怎么选

| 方式 | 内容是否恒定 | 底层依赖 | 适用 |
| --- | --- | --- | --- |
| List.of / copyOf | 是 | 无(自有存储) | 常量、共享、返回内部状态 |
| unmodifiableXxx | 否(随底层) | 包装原集合 | 临时只读暴露、底层已受控 |

要"内容恒定"用 of/copyOf;要"仅限制某引用修改"且底层受控用 unmodifiable 视图。

## 防御性拷贝

对象内部持有可变集合时,getter 直接返回内部引用会让外部绕过封装修改状态。两种防御:

- 返回不可变副本:`return List.of(internal.toArray(...))` 或 `List.copyOf(internal)`;
- 返回视图但确保内部引用不外泄:`return Collections.unmodifiableList(internal)`(内部不再被别处修改)。

构造器接收外部集合时同理:拷贝一份再持有,避免外部后续修改影响对象状态。

```java
public class Group {
    private final List<String> members;
    public Group(List<String> members) {
        this.members = List.copyOf(members);   // 防御性拷贝 + 不可变
    }
    public List<String> getMembers() {
        return members;   // 已不可变,可直接返回
    }
}
```

## Collections 其它常用工具

- `sort(list, comparator)`、`reverse`、`shuffle`;
- `emptyList()/singletonList(x)`:不可变的空/单元素集合;
- `synchronizedList(list)`:包装为方法级同步(迭代仍需手动加锁,不如并发集合);
- `checkedList(list, type)`:运行时类型检查包装(泛型擦除后的补充防线)。

## 小结

- of/copyOf 真不可变:修改抛异常、禁 null、线程安全;
- unmodifiableXxx 是只读视图,内容随底层可变集合变化;
- 要内容恒定用 of/copyOf,要限制引用修改用视图;
- 内部集合对外返回用不可变副本或受控视图,构造器做防御性拷贝;
- Collections 提供 sort/empty/singleton/synchronized/checked 等工具。

下一章进入函数式编程与 Stream:Lambda、函数式接口与集合的流水线处理。