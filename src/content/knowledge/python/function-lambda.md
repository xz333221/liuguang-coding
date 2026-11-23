---
title: lambda 与高阶函数
summary: 'lambda 表达式的边界(只放一个表达式);sorted/map/filter/reduce 的用法与替代写法;operator 模块与 partial;什么时候该写 def 而不是 lambda。'
category: python
node: python-function-lambda
order: 17
level: 进阶
tags: [lambda, 高阶函数, sorted, map, filter, partial]
updated: 2026-11-23
mindmap: python-function-lambda.mindmap.json
terms: ["lambda", "higher-order-function", "lazy-evaluation"]
sources:
  - title: Python 官方教程 · Lambda 表达式
    url: https://docs.python.org/zh-cn/3/tutorial/controlflow.html#lambda-expressions
    note: lambda 的语法与适用边界。
  - title: Python 官方文档 · functools
    url: https://docs.python.org/zh-cn/3/library/functools.html
    note: reduce、partial 与 key 函数相关工具。
---

函数在 Python 里是一等对象:可以赋给名字、作为实参、作为返回值。lambda 是创建函数对象的一种简短写法,高阶函数则是把这种能力用到参数与返回值上的函数。

## lambda 的边界

语法是 `lambda 参数列表: 表达式`,整个 lambda 就是一个表达式,求值结果直接作为返回值:

```python
square = lambda x: x * x
square(4)          # 16

add = lambda a, b=1: a + b
add(2)             # 3
```

函数体只能放一个表达式,不能写语句:没有 `if` 语句、没有循环、没有 `return`。条件表达式可以,因为它是表达式:

```python
classify = lambda n: "even" if n % 2 == 0 else "odd"
```

需要多行逻辑时用 `def`。给 lambda 起名字(`square = lambda ...`)也不推荐:函数对象有 `__name__` 属性,lambda 的这个值是 `<lambda>`,日志、traceback、文档工具里都看不出它叫什么。临时作为参数传进去才是它的主场。

## sorted 与 key

排序、分组的 `key` 参数是 lambda 最常见的用法:

```python
rows = [("Ada", 97), ("Bob", 82), ("Cy", 97)]
sorted(rows, key=lambda r: (-r[1], r[0]))
# 先按分数降序,分数相同按名字升序
```

`key` 接收一个函数,对每个元素算出排序依据,再比较这些依据。它比 `cmp` 风格的比较函数更好用:每个元素只算一次 key,而比较函数会被调用 O(n log n) 次。

`min`/`max`/`sorted` 都接受 `key`。字典按值排序同理:

```python
scores = {"a": 3, "b": 9, "c": 5}
sorted(scores, key=scores.get)     # ['a', 'c', 'b']
```

能直接写成 `dict.get` 的地方就不必包 lambda;`operator.itemgetter(1)` 也比 `lambda r: r[1]` 快一点,因为它在 C 层执行。

## map / filter / reduce

```python
nums = [1, 2, 3, 4]

list(map(lambda x: x * 2, nums))        # [2, 4, 6, 8]
list(filter(lambda x: x % 2 == 0, nums))  # [2, 4]

from functools import reduce
reduce(lambda a, b: a + b, nums)        # 10
```

这三个在 Python 3 里返回迭代器(`reduce` 直接返回结果),所以 `map`/`filter` 外面要 `list()` 才看得到内容。它们都能用更直观的写法替代:

| 旧写法 | 更 Pythonic 的写法 |
| --- | --- |
| `map(f, xs)` | 列表推导 `[f(x) for x in xs]`,或生成器表达式 |
| `filter(p, xs)` | `[x for x in xs if p(x)]` |
| `reduce(f, xs)` | 显式循环、`sum`/`math.prod`/`max` 等内置聚合 |

推导式可读性更好,而且能直接在表达式里做过滤与变换。`map`/`filter` 仍然有用:传的是已经存在的函数(例如 `map(int, lines)`),或者需要惰性求值时,不必包装成推导式。

## 高阶函数的组合

参数化行为、返回函数,是高阶函数的两种形态。前者如 `sorted(..., key=f)`,后者如 `functools.partial`:

```python
from functools import partial

def power(base, exp):
    return base ** exp

square = partial(power, exp=2)     # 固定一个参数,得到新函数
square(5)                          # 25
```

`partial` 返回的是 `functools.partial` 对象,不是普通函数;它会保留原函数的签名信息给 `inspect` 用,但 `__name__` 不会自动变成 `square`。需要可读的函数名时,用 def 包一层。

```mermaid
flowchart LR
  A["数据集合"] --> B["key / 映射函数"]
  B --> C["sorted / map / filter"]
  C --> D["惰性迭代器"]
  D -->|list() 或 for| E["结果"]
  F["已有具名函数"] --> B
  G["lambda 表达式"] --> B
```

## 什么时候写 def

- 逻辑超过一个表达式,或者需要 `try`、循环、多步处理;
- 需要被多处引用、出现在日志或调试信息里;
- 需要文档字符串、类型注解、默认参数以外的高级参数形式;
- 需要被 `functools.wraps`、`inspect.signature` 正确处理时(装饰器那篇展开)。

一句话:lambda 适合"就地传进去、用完即弃"的小函数;其余情况写 def。

## 小结

- lambda 是单表达式匿名函数,不能含语句,`__name__` 固定为 `<lambda>`;
- `sorted`/`min`/`max` 的 key 是最常见用法,能用 `itemgetter`/`attrgetter` 就不写 lambda;
- `map`/`filter` 返回迭代器,推导式通常更清晰;
- `reduce` 用内置聚合或显式循环替代更好读;
- 高阶函数通过参数或返回值组合行为,`partial` 是固定参数的轻量工具。
