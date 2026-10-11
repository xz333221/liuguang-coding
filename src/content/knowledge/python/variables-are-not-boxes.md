---
title: 变量不是盒子
summary: 'Python 的变量只是贴在对象上的名字。想通这一点，赋值、传参、深浅拷贝这些事就都顺了。'
category: python
order: 1
level: 入门
tags: [内存模型, 引用, 拷贝]
updated: 2026-10-11
mindmap: python-variables.mindmap.json
demo: python-variables
---

很多人第一次被 Python 绊住，是在写这三行的时候。

```python
a = [1, 2, 3]
b = a
b.append(4)

print(a)   # [1, 2, 3, 4]
```

明明只改了 `b`，`a` 也跟着变了。在别的语言里，赋值是把值复制一份；在 Python 里，赋值是给对象再贴一个名字。

## 一次反直觉的赋值

先把结论摆出来：**变量是名字，对象才是东西**。

- `[1, 2, 3]` 这行代码先造出一个列表**对象**，它住在内存的某个地址上；
- `a = ...` 做的事是把这个**名字**贴到那个对象上；
- `b = a` 做的事是"**把 b 也贴到同一个对象上**"，而不是"复制一个对象给 b"。

所以 `a` 和 `b` 从来不是两个容器，它们是同一个东西的两个称呼。上面那三行里，`b.append(4)` 改的是对象本身，两个名字当然都看得到。

## 名字贴在哪个对象上

`id()` 返回对象的内存地址（CPython 里的实现细节，但用来观察足够了）。

```python
a = [1, 2, 3]
b = a
c = [1, 2, 3]

print(id(a) == id(b))   # True，同一个对象
print(id(a) == id(c))   # False，内容相同，但是两个对象
print(a is b)           # True
print(a == c)           # True
```

记住这三个运算符的分工：

| 写法 | 比的是什么 | 什么时候用 |
| --- | --- | --- |
| `a is b` | 是不是同一个对象 | 判断 `None`、单例、缓存对象 |
| `a == c` | 值相不相等 | 绝大多数业务判断 |
| `id(a)` | 对象的地址 | 调试时观察绑定关系 |

## 可变与不可变的分界

只有**可变对象**会出现"改一个、另一个也变"的现象。

- 可变：`list`、`dict`、`set`、自定义的普通对象；
- 不可变：`int`、`str`、`tuple`、`frozenset`。

不可变对象不是"不能变"，而是"改不动"：`s = s + "!"` 看起来像在改字符串，实际上是造了一个新字符串，再把 `s` 贴过去。老对象没人引用了，会被垃圾回收。

```python
s = "流"
t = s
s = s + "光"

print(t)   # 流
print(s)   # 流光
```

## 函数传参传的是什么

传的是"名字贴的那个对象"，不是副本。参数是可变对象时，函数里改它会影响到外面。

```python
def add_one(items):
    items.append(4)

nums = [1, 2, 3]
add_one(nums)
print(nums)   # [1, 2, 3, 4]
```

如果不想让调用方受影响，就在函数内部先复制一份：

```python
def add_one(items):
    items = list(items)      # 新建一个列表，跟外面的对象脱钩
    items.append(4)
    return items
```

## 三个常见的坑

### 默认参数写成 []

```python
def collect(item, bucket=[]):     # 这个 [] 只创建一次，被所有调用共享
    bucket.append(item)
    return bucket

collect(1)   # [1]
collect(2)   # [1, 2] ← 不是期望的 [2]
```

默认值在函数定义时求值一次，之后一直复用。要可变默认值就用 `None` 兜底：

```python
def collect(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

### 二维列表的浅拷贝

```python
grid = [[0, 0]] * 3      # 三行其实是同一个列表
grid[0][0] = 1
print(grid)              # [[1, 0], [1, 0], [1, 0]]
```

`* 3` 复制的是引用。要各自独立，得逐行新建：

```python
grid = [[0, 0] for _ in range(3)]
```

### 就地修改与新建对象

```python
a = [3, 1, 2]
b = a.sort()             # sort() 就地排序，返回 None
print(a, b)              # [1, 2, 3] None

c = sorted(a)            # sorted() 返回新列表
```

带 `in place` 的方法改的是对象本身，返回的是 `None`。把返回值接给另一个名字，接到的就是 `None`。

## 什么时候需要复制

要一份独立的数据时，按结构选：

```python
import copy

flat = [1, 2, 3]
shallow = list(flat)          # 浅拷贝：外层新列表，元素还是原来那些对象
exact = flat.copy()           # 同上

nested = [[1, 2], [3, 4]]
deep = copy.deepcopy(nested)  # 深拷贝：连内部的对象一起复制
```

浅拷贝只复制最外面一层容器。嵌套结构里，里层的对象仍然是共享的：

```python
nested = [[1, 2]]
shallow = nested.copy()
shallow[0].append(3)

print(nested)   # [[1, 2, 3]] ← 里层还是同一个对象
```

## 一句话记住

**赋值不改对象，只改名字贴哪儿。**想验证的时候，打印 `id()` 或者用 `is` 比一下，比在脑子里推演快得多。
