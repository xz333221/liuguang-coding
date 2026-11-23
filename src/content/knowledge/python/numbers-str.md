---
title: 数字与字符串
summary: 'int 任意精度、float 双精度有舍入误差(十进制小数用 decimal)、复数内置;字符串不可变,索引/切片/常用方法/f-string 格式化;编码 str 与 bytes 的分界。'
category: python
node: python-quickstart-numbers-str
order: 6
level: 入门
tags: [int, float, decimal, 字符串, f-string, 编码]
updated: 2026-11-23
mindmap: python-quickstart-numbers-str.mindmap.json
terms: ["mutable-immutable", "value", "type"]
sources:
  - title: Python 官方文档 · 内置类型(数值与字符串)
    url: https://docs.python.org/zh-cn/3/library/stdtypes.html
    note: 数值类型与字符串方法的官方依据。
  - title: Python 官方教程 · 字符串
    url: https://docs.python.org/zh-cn/3/tutorial/introduction.html#strings
    note: 索引、切片与格式化的入门参照。
---

数字与字符串是最常用的两类对象。它们的共同点是**不可变**;差别在于数值有精度问题、字符串有编码问题。这一篇把两者的高频操作与易错点一次讲清。

## 三种数值类型

- **int**:任意精度,不会溢出(只受内存限制)。`2 ** 100` 直接算;
- **float**:IEEE 754 双精度,约 15-17 位有效数字。`0.1 + 0.2 == 0.3` 为 **False**,因为 0.1/0.2 无法用二进制精确表示;
- **complex**:内置复数,`3 + 4j`,real/imag 属性。

浮点比较用容差:`math.isclose(a, b)`;金额与十进制精确计算用 `decimal.Decimal`(注意用字符串构造 `Decimal("0.1")`,用 float 构造会把误差带进来)。

整除与取余:`7 // 2 == 3`,`7 % 2 == 1`,`divmod(7, 2) == (3, 1)`。注意负数整除向负无穷取整:`-7 // 2 == -4`。

## 字符串:不可变序列

```python
s = "Hello, Python"
s[0]        # 'H'
s[-1]       # 'n'
s[7:13]     # 'Python'
len(s)      # 13
```

索引从 0 起,负索引从尾起;切片 `[start:stop]` 含头不含尾(第 3 章细讲)。越界索引抛 IndexError,越界切片则截断不报错。

不可变意味着 `s[0] = "h"` 抛 TypeError;"修改"只能产生新串:

```python
s2 = s.replace("Hello", "Hi")   # 新对象,s 不变
```

## 常用方法

| 方法 | 作用 |
| --- | --- |
| strip()/lstrip()/rstrip() | 去首尾空白(或指定字符) |
| split(sep)/join(iter) | 切分 / 连接 |
| upper()/lower()/title() | 大小写 |
| startswith()/endswith() | 前后缀判断 |
| find()/index() | 查找,找不到前者 -1 后者抛异常 |
| replace(old, new) | 替换,返回新串 |
| encode()/bytes.decode() | str ↔ bytes |

join 是连接的正确姿势:`"-".join(["a","b"])` 得 "a-b";不要用循环 += 拼接大量字符串(每次产生新对象,O(n²))。

## f-string 格式化

```python
name, score = "Ada", 97.5
f"{name} 得分 {score:.1f}"        # 'Ada 得分 97.5'
f"{score=}"                       # 'score=97.5'(3.8+,调试利器)
f"{1234567:,}"                    # '1,234,567'
f"{0.25:.0%}"                     # '25%'
```

花括号内是表达式,冒号后是格式说明。多行用三引号;原始串 r"\n" 不转义(正则常用)。

## str 与 bytes

- **str** 是 Unicode 码点序列,面向文本;
- **bytes** 是字节序列,面向 IO/网络/文件。

边界处转换:`s.encode("utf-8")` → bytes;`b.decode("utf-8")` → str。乱码几乎都发生在"用错编码 decode"或"对 bytes 做文本操作"。文件读写显式指定 encoding="utf-8"(第 9 章)。

```mermaid
flowchart LR
  S["str<br/>Unicode 码点序列"] -->|encode('utf-8')| B["bytes<br/>UTF-8 字节序列"]
  B -->|decode('utf-8')| S
  S -->|写文本文件| F["文件 / 网络"]
  F -->|按字节读入| B
```

## 小结

- int 任意精度;float 有舍入误差,比较用 isclose,金额用 Decimal("…");
- 整除向负无穷取整;divmod 一次拿商余;
- 字符串不可变,索引/切片/方法都返回新串;join 拼接优于循环 +=;
- f-string 格式化,:.1f / , / % / = 调试;
- str 面向文本、bytes 面向字节,边界 encode/decode 显式 utf-8。

下一篇讲运算符与求值顺序。
