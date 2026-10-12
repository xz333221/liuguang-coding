---
title: 变量不是盒子
summary: 'Python 里没有变量盒子。名字贴在对象上，赋值只改绑定。想通这条，传参、默认参数、深浅拷贝就都能自己推出来。'
category: python
order: 1
level: 入门
tags: [内存模型, 引用, 拷贝, 面试高频]
updated: 2026-10-12
mindmap: python-variables.mindmap.json
demo: python-variables
sources:
  - title: Python 语言参考 · 数据模型
    url: https://docs.python.org/zh-cn/3/reference/datamodel.html
    note: 对象的身份、类型、值与可变性的准确定义，本文术语以此为准。
  - title: Python 官方 FAQ · 程序设计
    url: https://docs.python.org/zh-cn/3/faq/programming.html
    note: 默认值为什么在调用之间共享、元组元素的 += 为什么报错、id() 为什么会重复。
  - title: copy 模块
    url: https://docs.python.org/zh-cn/3/library/copy.html
    note: 浅拷贝与深拷贝的准确区别，memo 参数与 __copy__ / __deepcopy__ 协议。
  - title: PEP 8 · 编程建议
    url: https://peps.python.org/pep-0008/#programming-recommendations
    note: 与 None 这类单例比较要用 is / is not，不要用 ==。
---

先把结论说清楚:**Python 没有"变量盒子"**。变量是名字，对象才是内存里的实体;赋值语句做的事情是"把名字绑定到对象上"。这一条能推出后面所有看起来奇怪的行为。

```python
a = [1, 2, 3]
b = a
b.append(4)

print(a)   # [1, 2, 3, 4]
```

只改了 `b`，`a` 也变了。

## 每个对象都带着三样东西

按语言参考里的说法，对象有**身份**(identity)、**类型**(type)、**值**(value):

- **身份**:对象创建之后就不再变化，可以理解为它在内存里的地址。`is` 比较的是身份，`id()` 返回一个表示身份的整数。
- **类型**:同样不可变。`type(x)` 拿到的是类型对象本身。
- **值**:可能变。值可以变的叫**可变对象**，值创建后不能变的叫**不可变对象**。可变性由类型决定:数字、字符串、元组不可变，列表、字典、集合可变。

这里有一个容易被忽略的细节:不可变容器只保证"它**直接包含的那些对象**"不变。元组里装了一个列表，列表的内容照样能改，元组身份不变，但它看起来变了。

```python
row = (['a'], 'b')
row[0].append('c')
print(row)      # (['a', 'c'], 'b')  ← 元组没变，里面的列表变了
```

## 赋值是绑定，不是复制

```python
a = [1, 2, 3]     # 造出一个列表对象，把名字 a 绑上去
b = a             # 把名字 b 也绑到同一个对象上
c = [1, 2, 3]     # 又造了一个新对象

print(a is b)     # True  ← 身份相同
print(a is c)     # False ← 值相同但是两个对象
print(a == c)     # True  ← 值相等
```

名字住在命名空间里:模块级名字在 `globals()` 里，函数里的名字在 `locals()` 里。`b = a` 只是往命名空间里多加了一个名字，对象本身没有动。

判断用哪个运算符，按 PEP 8 的建议来:**值是否相等用 `==`，只有和 `None`、`True`、`False` 这类单例比较时才用 `is`**。

## 重新绑定不等于就地修改

同一个 `+=`，作用在不同对象上结果完全不同。

```python
a = [1, 2, 3]
b = a

a += [4]          # 列表实现了 __iadd__，这里是就地扩展
print(a, b)       # [1, 2, 3, 4] [1, 2, 3, 4]  ← b 也变了

a = a + [5]       # 加号造出新对象，再把名字 a 改绑过去
print(a, b)       # [1, 2, 3, 4, 5] [1, 2, 3, 4]  ← b 停在原地
```

同一件事还有第二种表现:**就地修改的方法返回 `None`**。

```python
nums = [3, 1, 2]
result = nums.sort()    # 就地排序，返回 None
print(nums, result)     # [1, 2, 3] None

result = sorted(nums)   # 返回新列表
```

`append` / `extend` / `sort` / `update` / `add` 都是这一类。把返回值接给另一个名字，接到的就是 `None`。

## 函数传参传的是对象引用

```python
def add(items, x):
    items.append(x)

nums = [1, 2, 3]
add(nums, 4)
print(nums)   # [1, 2, 3, 4]
```

调用时形参 `items` 是**新名字**，绑到同一个列表对象上，所以函数内的就地修改会影响调用方。但如果函数内是**重新绑定**形参，调用方看不到:

```python
def reset(items):
    items = []          # 只是把本地名字指到新对象上
    items.append(1)
    return items

nums = [1, 2, 3]
reset(nums)
print(nums)              # [1, 2, 3] 没变
```

想在函数里自由改动又不影响调用方，进去就复制一份。

## 默认参数只在函数定义时求值一次

```python
def collect(item, bucket=[]):
    bucket.append(item)
    return bucket

collect(1)   # [1]
collect(2)   # [1, 2]  ← 不是 [2]
```

官方 FAQ 把原因写得很直白:**默认值只在函数定义时创建一次**，之后每次调用都复用那个对象。所以那个空列表被第一次调用改过之后，就一直带着旧内容。

想确认这一点，可以直接看函数本身:

```python
print(collect.__defaults__)   # ([1, 2],)  ← 默认值就是那个被改脏的列表
```

正确写法是用 `None` 占位，需要时再造新对象:

```python
def collect(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

## 元组元素上的 `+=` 会报错，但副作用已经发生

这是官方 FAQ 里单独列出来的一条，也是"赋值是绑定"最反直觉的推论:

```python
row = (['a'], 'b')
row[0] += ['c']
# TypeError: 'tuple' object does not support item assignment

print(row)      # (['a', 'c'], 'b')  ← 报错了，但列表真的被改了
```

`+=` 是**赋值运算符**，它分两步走:先调用 `__iadd__`(列表就地扩展，这一步成功了)，再把返回值赋回 `row[0]`(元组不允许改元素指向，这一步抛异常)。所以异常是真的，副作用也是真的。

## 复制:浅拷贝与深拷贝

按 `copy` 模块文档的定义:

- **浅拷贝**:新建一个复合对象，然后把原对象里各项的**引用**塞进去。
- **深拷贝**:新建一个复合对象，然后**递归地**把里面碰到的对象也复制一遍。

```python
import copy

flat = [1, 2, 3]
shallow_a = list(flat)      # 构造器
shallow_b = flat[:]         # 全切片
shallow_c = flat.copy()     # 类型自带的 copy 方法
shallow_d = copy.copy(flat) # 通用接口

nested = [[1, 2], [3, 4]]
shallow = nested.copy()
deep = copy.deepcopy(nested)

shallow[0].append(9)
print(nested)   # [[1, 2, 9], [3, 4]]  ← 里层还是同一个对象，被一起改了

deep[0].append(9)
print(nested)   # [[1, 2, 9], [3, 4]]  ← 深拷贝那条路不影响原对象
```

两个工程细节:

- `deepcopy` 内部用一个 **memo 字典**记录"这个对象复制过了"，所以循环引用不会无限递归。
- 类可以自己实现 `__copy__()` 和 `__deepcopy__(memo)` 来决定怎么复制。

## 三个可以自己动手的验证方法

```python
import sys

a = [1, 2]
b = a

print(id(a) == id(b))        # True:身份相同
print(sys.getrefcount(a))    # 3:引用计数(a、b、getrefcount 的参数各一次)
print(a is b)                # True
```

`id()` 只在对象的**存活期**内唯一。临时对象被回收之后，地址会被后面创建的对象复用，所以不要把 `id()` 当作长期标识符。官方 FAQ 里"为什么 `id()` 看起来不唯一"讲的就是这件事。

## 这些知识什么时候会真的踩到你

- **共享配置或缓存对象**:两个模块 import 到同一个 dict，一个改了字段，另一个"莫名其妙"也变了。
- **构造表格**:`[[0] * 3] * 3` 造出来的是三行指向同一个列表，改一格三行都变。正确写法是 `[[0] * 3 for _ in range(3)]`。
- **接口返回内部状态**:把内部对象直接返回给调用方，对方就地改一下，你的内部状态就跟着变了。要么返回副本，要么返回不可变视图。
- **数据处理的视图与副本**:pandas 的切片、numpy 的视图，以及 `inplace=True` 这类参数，属于同一类问题。改数据前先确认手里是视图还是副本。

## 一句话总结

**赋值不改对象，只改名字绑在哪儿**。验证方法很便宜:打印 `id()`、看看 `__defaults__`、用 `is` 比一下，比在脑子里推演快得多。
