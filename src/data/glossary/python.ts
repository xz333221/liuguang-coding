import type { Term } from './types'

/** Python:数据模型与迭代这两条线上的名词。 */
export const pythonTerms: Term[] = [
  {
    id: 'mutable-immutable',
    term: '可变与不可变',
    en: 'mutable / immutable',
    aliases: ['可变对象', '不可变对象', '不可变'],
    group: 'python',
    plain:
      '造好之后内容还能不能改。列表、字典、集合能改;数字、字符串、元组不能改 —— 对它们做"修改"，其实是造了个新的。',
    formal:
      '可变类型实现了就地修改操作;不可变对象的一切"修改"都返回新对象。注意不可变容器只保证它直接引用的那些对象不变，元组里装个列表，列表照样能改。',
    misread: '把"不可变"理解成"里面装的东西也冻结了"。元组只保证元素指向不变，不保证元素自身不变。',
    related: ['in-place', 'shallow-copy'],
    see: 'python/variables-are-not-boxes',
  },
  {
    id: 'iterable',
    term: '可迭代对象',
    en: 'iterable',
    group: 'python',
    plain:
      '"能被 for 走一遍的东西"。列表、字符串、字典、文件都是。它自己不记走到哪儿了，每次要遍历都现给一个游标。',
    formal:
      '实现了 __iter__() 并返回一个迭代器的对象，iter() 内置函数接受它。可迭代对象本身不一定是迭代器。',
    misread: '以为"能下标访问就是可迭代"。真正的要求是有 __iter__，而不是 __getitem__。',
    related: ['iterator', 'iteration-protocol'],
    see: 'python/iterators-and-generators',
    source: {
      title: 'Python 教程 · 迭代器',
      url: 'https://docs.python.org/zh-cn/3/tutorial/classes.html#iterators',
    },
  },
  {
    id: 'iterator',
    term: '迭代器',
    en: 'iterator',
    group: 'python',
    plain:
      '一个"记着走到哪儿的游标"。每 next() 一次往前挪一格，挪完就没了，而且不能倒回去。',
    formal:
      '同时实现 __next__() 与 __iter__()（且 __iter__ 必须返回自身）的对象。next() 耗尽后抛 StopIteration，此后保持耗尽状态。',
    related: ['iterable', 'iteration-protocol', 'stop-iteration'],
    see: 'python/iterators-and-generators',
    source: {
      title: '内置类型 · 迭代器类型',
      url: 'https://docs.python.org/zh-cn/3/library/stdtypes.html#iterator-types',
    },
  },
  {
    id: 'iteration-protocol',
    term: '迭代协议',
    en: 'iteration protocol',
    group: 'python',
    plain:
      'for 背后那套约定:先 iter() 拿到游标，再反复 next()，直到对方说"没有了"。for 只认这套约定，不认列表。',
    formal:
      '由 __iter__ 与 __next__ 两个特殊方法构成的协议。for、in、解包、list() 等语法与内置函数都建立在它之上。',
    related: ['iterable', 'iterator', 'stop-iteration'],
    see: 'python/iterators-and-generators',
  },
  {
    id: 'generator',
    term: '生成器',
    en: 'generator',
    group: 'python',
    plain:
      '用函数写的迭代器。函数体里出现 yield，调用它拿到的就不是结果，而是一个能一个一个往外吐值的对象，吐到哪儿就停在哪儿。',
    formal:
      '调用含 yield 的函数所返回的对象，自动实现迭代器协议。函数体在首次 next() 时才执行，yield 处挂起并保留全部局部状态。',
    misread: '以为 g = f() 会执行函数体。只要函数体里有 yield，这一行一行都不会跑。',
    related: ['iterator', 'yield', 'lazy-evaluation'],
    see: 'python/iterators-and-generators',
    source: { title: 'PEP 255 · Simple Generators', url: 'https://peps.python.org/pep-0255/' },
  },
  {
    id: 'yield',
    term: 'yield',
    group: 'python',
    plain:
      '不是"返回"，是"暂停"。暂停的时候把当前进度留在原地，下次从这儿接着跑 —— 这就是生成器"记得自己走到哪"的原因。',
    formal:
      '生成器函数内的表达式，求值后把值交给调用方并挂起当前帧，恢复时从挂起处继续。yield 表达式本身也有值，可由 send() 提供。',
    related: ['generator', 'coroutine'],
    see: 'python/iterators-and-generators',
    source: {
      title: '语言参考 · yield 语句',
      url: 'https://docs.python.org/zh-cn/3/reference/simple_stmts.html#the-yield-statement',
    },
  },
  {
    id: 'lazy-evaluation',
    term: '惰性求值',
    en: 'lazy evaluation',
    group: 'python',
    plain:
      '要一个算一个，不提前把整批算好。数据装不下、或者根本用不完的时候，这不是优化，是唯一可行的做法。',
    formal:
      '把表达式的求值推迟到其值真正被需要时进行。生成器与生成器表达式是 Python 里最常见的惰性结构，能表示无限序列并压低峰值内存。',
    related: ['generator', 'generator-expression'],
    see: 'python/iterators-and-generators',
  },
  {
    id: 'stop-iteration',
    term: 'StopIteration',
    group: 'python',
    plain: '迭代器说"没有了"的那声招呼。它是正常流程的一部分，不是错误。',
    formal:
      '迭代器耗尽时由 __next__ 抛出的内置异常。for 捕获它并正常结束循环;生成器函数里显式 return 也会被转换成它。',
    misread: '把它当异常到处捕。捕掉之后循环不会结束，而是直接跳出去，后面的元素全丢了。',
    related: ['iterator', 'iteration-protocol'],
    see: 'python/iterators-and-generators',
  },
  {
    id: 'list-comprehension',
    term: '列表推导式',
    en: 'list comprehension',
    aliases: ['列表推导', '推导式'],
    group: 'python',
    plain: '一行写出"从一批东西里筛出或变换出另一批"，结果是立刻算好的完整列表。',
    formal:
      '[expr for x in it if cond] 形式，等价于先建空列表再循环 append，立即求值，占用 O(n) 额外内存。',
    related: ['generator-expression', 'lazy-evaluation'],
    see: 'python/iterators-and-generators',
  },
  {
    id: 'generator-expression',
    term: '生成器表达式',
    en: 'generator expression',
    group: 'python',
    plain: '推导式的圆括号版本。不立刻算，而是边取边算，也不占一整块内存。',
    formal:
      '(expr for x in it) 形式，返回生成器而非列表，惰性求值，且只能遍历一次。',
    related: ['list-comprehension', 'generator'],
    see: 'python/iterators-and-generators',
  },
  {
    id: 'shallow-copy',
    term: '浅拷贝',
    en: 'shallow copy',
    group: 'python',
    plain:
      '造了个新外壳，但里面装的还是原来那些东西。改外壳不影响对方，改里面那一层，两边一起变。',
    formal:
      '新建复合对象，并把原对象各项的引用填进去。list(x)、x[:]、x.copy()、copy.copy() 都是浅拷贝。',
    related: ['deep-copy', 'reference'],
    see: 'python/variables-are-not-boxes',
    source: { title: 'copy 模块', url: 'https://docs.python.org/zh-cn/3/library/copy.html' },
  },
  {
    id: 'deep-copy',
    term: '深拷贝',
    en: 'deep copy',
    group: 'python',
    plain: '连里面装的东西一起复制，复制完两边彻底没关系，怎么改都互不影响。',
    formal:
      '递归复制对象及其包含的所有对象，内部用 memo 字典记录已复制过的对象，因此循环引用不会无限递归。copy.deepcopy()。',
    related: ['shallow-copy', 'view-and-copy'],
    see: 'python/variables-are-not-boxes',
    source: { title: 'copy 模块', url: 'https://docs.python.org/zh-cn/3/library/copy.html' },
  },
  {
    id: 'view-and-copy',
    term: '视图与副本',
    en: 'view / copy',
    group: 'python',
    plain:
      '你手里拿到的是原件本身，还是抄的一份？动手改之前一定要先确认，这是数据处理里最常见的一类事故。',
    formal:
      '视图与原对象共享底层存储，互相的修改彼此可见;副本拥有独立存储。pandas 切片、numpy 切片以及 inplace 参数都属于这一类。',
    related: ['shallow-copy', 'deep-copy'],
    see: 'python/variables-are-not-boxes',
  },
  {
    id: 'default-argument',
    term: '默认参数',
    en: 'default argument',
    group: 'python',
    plain:
      '写在参数后面的默认值，只在函数定义那一刻算一次，之后每次调用共用同一个对象 —— 所以它被改脏了会一直脏下去。',
    formal:
      '默认值在函数定义执行时求值一次并保存在 __defaults__ 中，后续调用复用。可变默认值因此在调用间共享状态，惯用写法是用 None 占位。',
    misread: '以为每次调用都会重新创建默认值。只有定义那一次会。',
    related: ['mutable-immutable', 'binding'],
    see: 'python/variables-are-not-boxes',
    source: {
      title: 'Python 官方 FAQ · 程序设计',
      url: 'https://docs.python.org/zh-cn/3/faq/programming.html',
    },
  },
  {
    id: 'reference-counting',
    term: '引用计数',
    en: 'reference counting',
    group: 'python',
    plain: '记录"现在有多少个名字正指着这个对象"，减到 0 就回收掉。',
    formal:
      'CPython 的主要内存管理机制，可用 sys.getrefcount() 读，但该函数自身会多算一次。循环引用需要额外的循环检测器兜底。',
    related: ['garbage-collection', 'reference'],
    see: 'python/variables-are-not-boxes',
  },
  {
    id: 'magic-method',
    term: '魔术方法',
    en: 'magic method / dunder',
    aliases: ['双下方法', 'dunder'],
    group: 'python',
    plain:
      '名字前后各带两条下划线的特殊方法，用来告诉 Python"这个操作该怎么做"。你写 a + b，Python 自己去找 __add__。',
    formal:
      '由语言在特定语法或内置操作下隐式调用的方法，如 __iter__、__next__、__eq__、__iadd__。它们构成对象与语言语法之间的接口。',
    related: ['protocol', 'iteration-protocol'],
    see: 'python/variables-are-not-boxes',
  },
  {
    id: 'augmented-assignment',
    term: '增强赋值',
    en: 'augmented assignment',
    aliases: ['就地运算符'],
    group: 'python',
    plain:
      '+= 这种"又算又赋值"的写法。对象支持就地改就改原件，不支持就退化成算出新的再改绑名字 —— 两种结果差别很大。',
    formal:
      '+=、*= 等先尝试 __iadd__ 等就地方法，不存在时退回 __add__ 再赋值。因此对列表是就地扩展（别名可见），对元组、字符串是新对象（别名不可见）。',
    related: ['in-place', 'magic-method', 'binding'],
    see: 'python/variables-are-not-boxes',
  },
  {
    id: 'coroutine',
    term: '协程',
    en: 'coroutine',
    group: 'python',
    plain: '能暂停、还能被外部反复喂值的函数。生成器是它的雏形，async / await 是它的现代形态。',
    formal:
      '可在执行中挂起并恢复的计算单元。生成器的 send() 提供了最基础的协程能力，asyncio 与 async def 在此之上构建。',
    related: ['yield', 'generator'],
    see: 'python/iterators-and-generators',
  },
]
