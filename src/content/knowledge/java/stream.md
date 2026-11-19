---
title: Stream 流水线:map / filter / collect
summary: 'Stream 不存储、不修改源;中间操作惰性、终端操作触发;map/filter/flatMap 加工,collect/reduce/forEach 收尾;Collectors 提供 toList/groupingBy/joining;并行流有适用边界。'
category: java
node: java-functional-stream
order: 47
level: 进阶
tags: [Stream, map, filter, collect, Collectors]
updated: 2026-11-18
mindmap: java-functional-stream.mindmap.json
terms: ["reference-type", "in-place", "runtime"]
sources:
  - title: java.util.stream.Stream javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html
    note: 中间/终端操作、惰性与一次性消费的依据。
  - title: Oracle Java 教程 · Aggregate Operations
    url: https://docs.oracle.com/javase/tutorial/collections/streams/index.html
    note: 流水线与 Collectors 用法的参照。
---

集合解决"存",Stream 解决"算":对一批元素做过滤、转换、归约,声明式地串成流水线。这一篇讲 Stream 的执行模型与常用操作。

## Stream 不是集合

三个关键性质:

- **不存储**:Stream 是元素的视图/管道,不是容器;
- **不修改源**:操作产生新 Stream 或结果,源集合不变(函数式风格);
- **一次性**:终端操作执行后 Stream 即消费完毕,不能再复用。

```java
List<Integer> nums = List.of(1, 2, 3, 4, 5);
List<Integer> evenSquared = nums.stream()
        .filter(n -> n % 2 == 0)
        .map(n -> n * n)
        .collect(Collectors.toList());
System.out.println(evenSquared);   // [4, 16]
System.out.println(nums);          // [1,2,3,4,5] 源不变
```

## 创建

```java
list.stream();                 // 集合
Arrays.stream(arr);            // 数组
Stream.of("a", "b");           // 显式元素
Stream.iterate(0, n -> n + 1); // 无限流,需 limit
IntStream.range(0, 10);        // 基本类型流
```

## 中间操作:惰性

中间操作返回新 Stream,**不立即执行**,直到遇到终端操作才整条流水线一起跑(惰性求值)。这让短路成为可能:

```java
Optional<Integer> first = nums.stream()
        .filter(n -> n > 2)
        .map(n -> n * 10)
        .findFirst();      // 找到第一个即停,后面元素不再处理
```

常用中间操作:

- `map(f)`:逐元素转换;
- `filter(p)`:保留满足谓词的;
- `flatMap(f)`:把每个元素映射成一个 Stream 再摊平(一对多);
- `sorted()` / `sorted(cmp)`:排序(有状态,需缓冲全部元素);
- `distinct()`:去重(依赖 equals/hashCode);
- `limit(n)` / `skip(n)`:截断/跳过;
- `peek(c)`:调试观察(不要用于副作用业务)。

## 终端操作:触发执行

- `collect(collector)`:归约为容器/字符串/分组,最常用;
- `forEach(c)`:逐元素消费;
- `reduce(identity, op)`:归约为单值;
- `count()` / `min(cmp)` / `max(cmp)`;
- `anyMatch / allMatch / noneMatch`:短路布尔;
- `findFirst / findAny`:短路取元素,返回 Optional。

```java
int sum = nums.stream().reduce(0, Integer::sum);
boolean anyEven = nums.stream().anyMatch(n -> n % 2 == 0);
```

## Collectors:收集的形状

```java
.toList()                                  // JDK16+ 直接 toList,不可变
Collectors.toList() / toSet()
Collectors.joining(", ", "[", "]")         // 字符串拼接
Collectors.groupingBy(s -> s.category())   // 分组 Map<K, List<V>>
Collectors.groupingBy(f, Collectors.counting())  // 分组 + 下游计数
Collectors.partitioningBy(p)               // 按布尔二分
Collectors.mapping(f, downstream)          // 分组前先转换
```

groupingBy 是业务里最高频的收集器:按某字段分桶统计。

## 并行流:parallel 的边界

`stream().parallel()` 或 `parallelStream()` 用 ForkJoinPool 分片并行。适用:数据量大、单元素处理重、无共享可变状态、操作可结合(如 reduce 的 op 满足结合律)。不适用:小数据、有副作用、依赖顺序(findFirst/limit 语义变化)、共享可变累加器。

不要默认开并行;先测量,确认收益再开。线程安全与顺序语义是并行的代价。

## 不要在 Stream 里改源

流水线中修改源集合或外部可变状态会破坏语义并可能抛 ConcurrentModificationException。需要副作用时用 forEach 明确表达,而非 map/filter 里偷偷改。

## 小结

- Stream 不存储、不改源、一次性;
- 中间操作惰性,终端操作触发,短路操作提前停;
- map/filter/flatMap/sorted/distinct/limit 加工;collect/reduce/forEach/match 收尾;
- Collectors:toList/joining/groupingBy/partitioningBy/mapping;
- parallel 有适用边界,先测量再开;流水线内不改源。

下一篇讲 Optional:用类型表达"可能为空"的返回值。