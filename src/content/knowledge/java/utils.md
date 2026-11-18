---
title: 常用工具类
summary: 'Math 管数学运算,Random 管伪随机数(给种子可复现),HexFormat 管字节与十六进制互转,Objects 管 null 安全的比较与校验,Arrays 管数组的打印排序填充。都是静态方法,拿来就用。'
category: java
node: java-core-utils
order: 31
level: 入门
tags: [Math, Random, Objects, Arrays, HexFormat]
updated: 2026-11-18
mindmap: java-core-utils.mindmap.json
terms: []
sources:
  - title: 廖雪峰 Java 教程 · 常用工具类
    url: https://liaoxuefeng.com/books/java/oop/core/utils/index.html
    note: Math、Random、HexFormat 等工具类的讲解参照。
  - title: 菜鸟教程 · Java Number 类
    url: https://www.runoob.com/java/java-number.html
    note: Math 与数值工具方法对照。
---

标准库有一批「全是静态方法、不用 new」的工具类,日常代码的边角活它们全包了。这一篇过五个最常用的:Math、Random、HexFormat、Objects、Arrays。

## Math:数学运算

```java
Math.abs(-100);        // 100
Math.max(100, 99);     // 100
Math.min(1.2, 2.3);    // 1.2
Math.pow(2, 10);       // 1024.0,注意返回 double
Math.sqrt(2);          // 1.414...
Math.PI;               // 3.14159...
Math.E;                // 2.71828...
```

三角函数 sin/cos/tan 接收弧度,不是角度,角度先 Math.toRadians 转一下。

随机数 Math.random() 返回 [0, 1) 的 double。要 [min, max) 区间:

```java
double x = Math.random() * (max - min) + min;
```

要整数区间,更推荐下面 Random 的 nextInt(bound),别自己强转,边界容易错。

还有个 StrictMath,方法签名和 Math 一样,区别是它保证所有平台结果逐位一致,Math 允许平台相关的微小误差换速度。除非做跨平台数值一致性验证,用 Math 就够。

## Random:伪随机数

「伪随机」指:给定同一个种子,产生的序列完全一样。不指定种子时用时间戳,所以每次运行不同:

```java
Random r = new Random();
r.nextInt();        // 任意 int
r.nextInt(10);      // [0, 10) 的 int,上界不含
r.nextDouble();     // [0, 1)
r.nextBoolean();
```

指定种子就能复现,测试和模拟里很有用:

```java
Random r = new Random(12345);
// 每次运行,接下来产生的序列都一模一样
```

多线程共享一个 Random 会有竞争,JDK 7 起用 ThreadLocalRandom.current().nextInt(10),每线程一份,无竞争。需要密码学安全的随机数(令牌、密钥)用 SecureRandom,别用 Random——它的序列可预测。

## HexFormat:字节与十六进制互转(JDK 17)

处理字节数组时,经常要转成十六进制字符串看:

```java
byte[] data = "Hello".getBytes(StandardCharsets.UTF_8);
HexFormat.of().formatHex(data);   // "48656c6c6f"
HexFormat.of().parseHex("48656c6c6f");   // 转回 byte[]
```

要格式定制:

```java
HexFormat hf = HexFormat.ofDelimiter(" ").withPrefix("0x").withUpperCase();
hf.formatHex(data);   // "0x48 0x65 0x6C 0x6C 0x6F"
```

JDK 17 之前这需要自己写循环查表,现在标准库已经封装。打印哈希值、调试二进制协议时常用。

## Objects:null 安全的杂活

java.util.Objects 是一组静态小工具:

```java
Objects.equals(a, b);        // 两个都 null 算相等,一个 null 算不等,不抛 NPE
Objects.hash(name, age);     // 组合哈希,覆写 hashCode 用
Objects.requireNonNull(x, "x 不能为 null");   // null 就抛 NPE,带消息
Objects.isNull(x);           // x == null,方法引用场景用
Objects.nonNull(x);
```

requireNonNull 是构造器守门员:

```java
public Student(String name) {
    this.name = Objects.requireNonNull(name, "name 不能为 null");
}
```

参数非法在入口就炸,好过带着 null 跑到深处才炸。equals 和 hash 在 3.2 节已经用过,这里归个队。

## Arrays:数组的杂活

第 2 章数组篇用过几个,这里汇总:

```java
int[] a = {3, 1, 2};
Arrays.toString(a);          // "[3, 1, 2]",打印数组必用
Arrays.sort(a);              // 就地排序 → [1, 2, 3]
Arrays.fill(a, 0);           // 全部填 0
Arrays.copyOf(a, 5);         // 扩容到 5,多的补 0
Arrays.binarySearch(a, 2);   // 二分查找,数组必须先排好序
Arrays.equals(a, b);         // 逐元素比内容
```

直接 println 数组只会打出哈希值,toString 才是可读的内容——这个易错点第 2 章讲过,再强调一次。多维数组用 deepToString。

## 小结

- Math:abs/max/min/pow/sqrt,random 返回 [0,1);三角函数用弧度;
- Random 给种子可复现;多线程用 ThreadLocalRandom;安全场景用 SecureRandom;
- HexFormat(JDK 17)负责 byte[] 与十六进制字符串互转;
- Objects:equals / hash / requireNonNull,null 安全三件套;
- Arrays:toString / sort / fill / copyOf / binarySearch,打印数组记得 toString。