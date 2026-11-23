---
title: 生成器表达式与惰性求值
summary: '生成器表达式与列表推导的语法差异与内存差异;惰性流水线如何组合;只算一次、异常延迟、闭包晚绑定三类陷阱;什么场景该用惰性、什么场景必须物化。'
category: python
node: python-iteration-lazy
order: 26
level: 进阶
tags: [生成器表达式, 惰性求值, 推导式, 流水线]
updated: 2026-11-23
mindmap: python-iteration-lazy.mindmap.json
terms: ["generator-expression", "lazy-evaluation", "generator", "iterable"]
sources:
  - title: Python 官方教程 · 生成器表达式
    url: https://docs.python.org/zh-cn/3/tutorial/classes.html#generator-expressions
    note: 生成器表达式与列表推导的对比。
  - title: Python 官方教程 · 推导式
    url: https://docs.python.org/zh-cn/3/tutorial/datastructures.html#list-comprehensions
    note: 推导式的基本语法与求值时机。
---

列表推导会立刻算出全部结果并放进列表;生成器表达式只记录算法,元素在迭代时才逐个计算。两者语法只差一对括号,内存与时机却完全不同。

## 语法只差括号

```python
squares_list = [x * x for x in range(10)]      # 立刻得到 10 个元素
squares_gen = (x * x for x in range(10))       # 生成器对象,尚未计算
next(squares_gen)      # 0
list(squares_gen)      # [1, 4, 9, ..., 81],从第二个开始
```

圆括号包起来的是生成器表达式。函数调用里可以省略一层括号:

```python
sum(x * x for x in range(10))     # 生成器表达式作为唯一实参
sum([x * x for x in range(10)])   # 列表推导,先建列表再求和
```

两者结果相同,后者多分配一个列表。数据量大时,生成器表达式省内存;需要多次遍历、随机访问或 `len()` 时,必须物化成列表。

## 惰性流水线

生成器表达式可以层层套接,数据像流水线一样逐个流过:

```python
lines = open("access.log", encoding="utf-8")

ips = (
    line.split()[0]
    for line in lines
    if line.strip() and not line.startswith("#")
)
unique = set(ips)          # 到这一步才开始读文件
```

```mermaid
flowchart LR
  A["文件行"] --> B["过滤空行与注释"]
  B --> C["取第一列"]
  C --> D["去重 / 统计"]
  D --> E["输出"]
  A -.->|按需逐个读取| B
```

每一层只在被请求时拉取一个元素,不会把整个文件读进内存。处理大文件、日志、网络流时,这种写法是标准做法。`itertools` 里的工具也是按同样的方式组合,下一篇展开。

## 惰性带来的三类陷阱

**一、只能消费一次。**

```python
gen = (x for x in range(3))
list(gen)     # [0, 1, 2]
list(gen)     # []
```

生成器表达式返回的是生成器对象,遍历一次即耗尽。需要重复使用,就把结果存进列表或元组。

**二、表达式里的异常延迟到迭代时才出现。**

```python
gen = (1 / x for x in [1, 0])
# 创建时不报错
list(gen)     # ZeroDivisionError,此时才爆
```

惰性把出错时机推后了。异常处理要包在**消费端**,而不是创建端:

```python
try:
    list(gen)
except ZeroDivisionError:
    ...
```

**三、闭包晚绑定。**

```python
gens = [(lambda: x) for x in range(3)]
[g() for g in gens]      # [2, 2, 2]
```

生成器表达式内部引用循环变量时同样要小心。表达式在创建时求值的是可迭代对象那一部分,元素表达式里的自由变量仍然按名字晚绑定。

还有一个相邻的坑:生成器表达式里使用的外部变量是在**创建时**求值的。

```python
xs = [1, 2, 3]
gen = (x * factor for x in xs)   # factor 此时尚未定义
factor = 10
list(gen)                        # 30, 60, 90;factor 在迭代时才读
```

或者反过来,`xs` 被重新绑定后,生成器看到的是新对象。把生成器表达式当作"函数体"看待:它在每次迭代时按当前作用域取值。

## 何时用惰性,何时物化

| 场景 | 选择 |
| --- | --- |
| 大文件逐行处理 | 生成器表达式 / 生成器函数 |
| 只做一次聚合(sum、max、any) | 生成器表达式 |
| 需要多次遍历 | 列表推导,物化一次 |
| 需要随机访问或 `len()` | 列表 / 元组 |
| 需要切片、排序、反转 | 物化后再操作 |
| 结果要传给会遍历多次的库 | 物化或明确文档说明 |

`any()`、`all()` 有短路语义,配生成器表达式可以提前结束:

```python
any(line.startswith("ERROR") for line in lines)   # 遇到第一条就停
```

这类"短路 + 惰性"的组合比先物化再判断高效得多。

## 小结

- 列表推导立即求值并占内存,生成器表达式惰性求值、只能消费一次;
- 多层生成器表达式可组成按需拉取的流水线;
- 异常在消费端出现,`try` 要包住真正的迭代动作;
- 自由变量仍然晚绑定,外部变量在迭代时读取;
- 需要多次遍历、随机访问、长度或排序时,先物化。
