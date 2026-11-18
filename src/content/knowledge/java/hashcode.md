---
title: hashCode 与 equals 的契约
summary: 'HashMap 先用 hashCode 定位桶,再用 equals 在桶里认人。所以 equals 相等的两个对象,hashCode 必须相等;覆写 equals 不覆写 hashCode,Map 就存得进取不出。两个方法必须用同一组字段。'
category: java
node: java-oop-hashcode
order: 24
level: 入门
tags: [hashCode, equals, HashMap, 哈希冲突]
updated: 2026-11-18
mindmap: java-oop-hashcode.mindmap.json
terms: ["hashcode", "equals", "hash-collision", "hash-table"]
sources:
  - title: 廖雪峰 Java 教程 · 编写hashCode方法
    url: https://liaoxuefeng.com/books/java/collection/hashcode/index.html
    note: HashMap 定位原理、契约两条与 Objects.hash 写法参照。
  - title: Object.hashCode 的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()
    note: hashCode 契约的官方定义。
---

上一篇结尾留了个尾巴:覆写了 equals 必须连带 hashCode。为什么?因为 HashMap、HashSet 这些哈希容器,认人靠的是两个方法配合。这一篇把配合机制讲清。

## HashMap 怎么找东西

HashMap 内部是一个数组,每个格子叫桶。放 key-value 时:

1. 调 key.hashCode() 得到一个 int;
2. 用这个 int 算出桶的下标,把 entry 放进去。

取的时候同样两步:算 hashCode 定位桶,再在桶里用 equals 逐个比对,找到真正相等的 key。

```java
Map<String, Integer> map = new HashMap<>();
String key1 = "a";
map.put(key1, 123);

String key2 = new String("a");
System.out.println(key1 == key2);      // false,不是同一个对象
System.out.println(map.get(key2));     // 123,照样取到
```

key2 和 key1 不是同一个对象,但 String 覆写了 equals 和 hashCode:内容相同 → hashCode 相同 → 定位到同一个桶 → equals 认出相等 → 取出 123。

## 契约:两条

Object 文档对 hashCode 的规定,核心两条:

1. **equals 相等的两个对象,hashCode 必须相等。** 这是正确性要求,违反它 HashMap 直接失灵;
2. equals 不等的对象,hashCode 尽量不等。这是性能要求,违反了只是慢,不会错。

第二条的「尽量」意味着:不同对象算出相同 hashCode 是允许的,叫哈希冲突。冲突了不要紧,桶里再用 equals 认一遍就行。int 只有 42 亿个取值,对象却可以无限多,冲突不可避免,哈希表的设计本来就预设了冲突。

## 只覆写 equals 会怎样

看这个 bug:

```java
class Person {
    String name;
    int age;

    @Override
    public boolean equals(Object o) {
        if (o instanceof Person p) {
            return Objects.equals(name, p.name) && age == p.age;
        }
        return false;
    }
    // hashCode 没覆写,用的是 Object 默认(按身份算)
}

Map<Person, String> map = new HashMap<>();
map.put(new Person("小明", 12), "班长");
System.out.println(map.get(new Person("小明", 12)));   // null!
```

两个 Person equals 相等,但 hashCode 用的是 Object 默认实现,两个不同对象算出不同的值,定位到不同的桶——get 的那个桶里根本没有 entry,返回 null。存得进,取不出,数据像丢了一样。

这就是「覆写 equals 必须连带 hashCode」的原因。IDE 的生成 equals 功能会顺手把 hashCode 一起生成,别只生成一半。

## 正确写 hashCode

原则一句话:**equals 用了哪些字段,hashCode 就用哪些字段,一个不多一个不少。**

```java
@Override
public int hashCode() {
    return Objects.hash(name, age);
}
```

Objects.hash 把各字段的哈希组合成一个 int,内部处理了 null。手写组合的经典写法是反复 `h = 31 * h + 字段哈希`,31 是个奇素数,乘 31 能让结果分布更均匀,且 JVM 会把它优化成移位加减,不亏。日常直接用 Objects.hash,可读性更好。

字段选择的两个反例都违反契约:

- equals 比 name+age,hashCode 只算 name:不相等的对象哈希大量相同,性能退化(不违反正确性,但浪费);
- equals 比 name+age,hashCode 算了 name+age+score:equals 相等的对象可能哈希不同,正确性直接崩。

## 两个延伸提醒

**桶与扩容。** hashCode 范围 ±21 亿,HashMap 初始数组却只有 16 格,靠 `hash & (n-1)` 把下标压进数组范围;元素多了数组翻倍扩容,所有 entry 重新定位。所以能预估容量就 `new HashMap<>(预期容量)`,省得反复扩容。细节第 6 章集合框架再展开。

**别用可变对象当 key。** key 放进 Map 之后改了参与 hashCode 的字段,下次 get 算出的桶就变了,原来的 entry 再也找不到。String、Integer 适合当 key,不只是因为覆写好了两个方法,还因为它们不可变。自定义类当 key,确保字段放进去就不再改。

## 小结

- HashMap 先 hashCode 定位桶,再 equals 桶内认人,两个方法配合工作;
- 契约:equals 相等 → hashCode 必须相等;不等对象哈希尽量不等,冲突允许;
- 只覆写 equals 不覆写 hashCode,Map 存得进取不出;
- hashCode 与 equals 用同一组字段,Objects.hash 一把梭;
- 预估容量减少扩容;可变对象别当 key。