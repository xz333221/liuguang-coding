---
title: for 循环背后:可迭代对象与生成器
summary: 'for 只认一套协议:先 iter() 拿到迭代器，再反复 next()，直到 StopIteration。看懂这条链，生成器就是顺理成章的写法。'
category: python
order: 2
level: 进阶
tags: [迭代器, 生成器, 协议, 惰性求值]
updated: 2026-10-13
mindmap: python-iterators.mindmap.json
demo: python-iterators
terms: ["iterable", "iterator", "iteration-protocol", "generator", "yield", "stop-iteration", "lazy-evaluation", "list-comprehension", "generator-expression", "coroutine", "magic-method"]
sources:
  - title: Python 教程 · 迭代器
    url: https://docs.python.org/zh-cn/3/tutorial/classes.html#iterators
    note: 迭代器协议的教学讲法，含用类和用生成器两种实现方式。
  - title: 内置类型 · 迭代器类型
    url: https://docs.python.org/zh-cn/3/library/stdtypes.html#iterator-types
    note: __iter__ 与 __next__ 的准确定义，以及"迭代器必须返回自身"这条要求。
  - title: 语言参考 · yield 语句
    url: https://docs.python.org/zh-cn/3/reference/simple_stmts.html#the-yield-statement
    note: 生成器函数的定义、yield 的求值时机，以及 send / throw / close 的语义。
  - title: PEP 255 · Simple Generators
    url: https://peps.python.org/pep-0255/
    note: 生成器最初的设计文档，解释为什么要给迭代器一种更省事的写法。
  - title: itertools 模块
    url: https://docs.python.org/zh-cn/3/library/itertools.html
    note: 基于迭代协议的常用工具，惰性处理的组合子几乎都能在这里找到。
---

`for` 循环看起来是"遍历一个列表"，实际上它认的是一套协议:先 `iter()` 拿到迭代器，再反复 `next()`，直到 `StopIteration`。只要对象按协议来，不管是列表、文件、字典、还是你自己写的类，`for` 都能走。把这套协议拆开看一遍，生成器就顺理成章了。

```python
nums = [10, 20, 30]

it = iter(nums)   # 拿到迭代器
print(next(it))   # 10
print(next(it))   # 20
print(next(it))   # 30
print(next(it))   # StopIteration
```

`for` 做的就是这个，外加在最后接住 `StopIteration` 当作正常结束。

## 手动把 for 展开

这是全篇最值得记住的一段:

```python
nums = [10, 20, 30]

it = iter(nums)
while True:
    try:
        x = next(it)
    except StopIteration:
        break
    print(x)      # 10 / 20 / 30
```

`for x in nums:` 就是这段的简写。三条线索:

- `iter(obj)` 负责"拿到一个迭代器";
- `next(it)` 每次取出一个值;
- 取完了，`next` 抛 `StopIteration`，循环正常结束(所以**不要在自己的代码里把 `StopIteration` 当成错误到处捕**，它本来就是流程的一部分)。

## 可迭代对象与迭代器是两回事

日常把两个词混着说，但它们在协议里分工不同:

- **可迭代对象(iterable)**:能交给 `iter()` 的对象，要求实现 `__iter__`;
- **迭代器(iterator)**:`next()` 能推进的对象，要求实现 `__next__`，而且它的 `__iter__` 必须**返回它自己**。

```python
from collections.abc import Iterable, Iterator

nums = [1, 2, 3]
print(isinstance(nums, Iterable))   # True
print(isinstance(nums, Iterator))   # False  ← 迭代器是 iter() 拿到的那个

it = iter(nums)
print(isinstance(it, Iterator))     # True
```

一条好记的对应关系:**可迭代对象负责"能被遍历"，迭代器负责"遍历到哪儿了"。** 后者带状态。`iter(nums)` 每次都会给你一个新的迭代器，各自从头数起;而迭代器自己数完就完了。

```python
it = iter([1, 2, 3])
print(list(it))   # [1, 2, 3]
print(list(it))   # []       ← 同一个迭代器已经耗尽
```

常见的内置迭代器:`iter(list)`、`iter(dict)`、`open()` 返回的文件对象、`re.finditer()` 的返回值。它们都**只能用一次**。

## 生成器:用函数写一个迭代器

手写一个迭代器类要定义 `__iter__` 和 `__next__`，还得自己存"走到第几个"的状态，啰嗦。生成器把这件事压到语法层面:

```python
def count_up(n):
    print('开始生成')
    for i in range(1, n + 1):
        yield i

g = count_up(3)      # 注意:这里什么都没打印
print(next(g))       # 打印「开始生成」，然后输出 1
print(next(g))       # 2
print(next(g))       # 3
print(next(g))       # StopIteration
```

两个必须记住的性质:

1. **只要函数体里出现了 `yield`，调用它就得到生成器，函数体一行都不会执行。** 上例里 `开始生成` 是第一次 `next` 时才打印的。
2. **`yield` 的作用是"暂停"。** 暂停时局部变量和执行位置都留在生成器对象里，下次 `next` 从那里接着跑。这就是它"记得自己走到哪"的原因。

因为生成器本身是迭代器，`for` 直接就能用:

```python
for x in count_up(3):
    print(x)         # 1 / 2 / 3
```

**`for` 不在乎你给它的是列表还是生成器。** 它只调 `iter()` 和 `next()`，数据是现成的还是现算的，对它没有区别。

## 惰性:现算，还是先算好

生成器最大的价值是**惰性求值**:要一个算一个，不占内存，也能表示无穷序列。

```python
def naturals():
    i = 1
    while True:
        yield i
        i += 1

import itertools
print(list(itertools.islice(naturals(), 5)))   # [1, 2, 3, 4, 5]
```

换成先算好的列表，`naturals()` 这种写法根本没法存在。读取大文件、遍历数据库游标、处理流水线，都是同一类场景:数据太大装不下，或者根本没必要一次装下。

生成器表达式是它的简写:

```python
squares = (x * x for x in range(5))   # 圆括号，生成器表达式
print(sum(squares))                   # 30
```

注意方括号那个是列表推导，会立刻算出一个完整列表;圆括号这个才是生成器，`sum()` 边取边加。

## 生成器还能接收值

`yield` 这个表达式本身有值，所以生成器除了往外给数据，也能往里收:

```python
def echo():
    while True:
        word = yield          # 暂停在这里，等调用方送一个值进来
        print('收到', word)

g = echo()
next(g)                       # 先推进到第一个 yield
g.send('你好')                # 收到 你好
```

这一层是协程与 `async` 的源头。日常写数据处理用不到，但见到 `yield` 出现在赋值号右边时，要知道它在收值。

## 四个常见的坑

1. **迭代器只能走一次**。`zip(a, b)` 这类返回值也是迭代器;想再遍历一遍，要么重新构造，要么先 `list()` 存下来。
2. **遍历列表时增删元素**。`for x in nums` 背后是按下标推进的迭代器，删掉一个元素会让后面的元素整体前移，从而被跳过一格。要改就先复制:`for x in nums[:]`。
3. **该返回列表时返回了生成器**。生成器是一次性的。调用方如果会多次遍历，或者需要 `len()`、索引，就得返回列表;只有"只遍历一次、数据量大"才适合返回生成器。
4. **生成器里的异常发生在迭代时**。生成器函数的代码直到第一次 `next` 才跑，所以其中抛出的异常会在你取值的那一刻冒出来。调试时别在创建那一行找问题。

## 什么时候用哪个

| 场景 | 选择 |
| --- | --- |
| 数据量小，要多次遍历、要索引 | 列表 |
| 数据量大，或只遍历一次 | 生成器 / 迭代器 |
| 要在遍历中做多次独立处理 | 先 `list()`，或每次都重新构造 |
| 需要组合过滤与变换 | `itertools` 里的工具，配合生成器表达式 |

## 一句话总结

**`for` 只认 `iter()` 和 `next()`，`StopIteration` 表示结束。** 迭代器是"带状态的遍历"，只能用一次;生成器是"用函数写的迭代器"，把状态存在暂停处。想清楚数据要遍历几次、装不装得下，就知道该返回列表还是生成器。
