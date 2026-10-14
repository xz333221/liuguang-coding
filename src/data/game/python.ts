// Python 面试题库。
//
// 顺序顺着"数据模型 → 怎么写 → 怎么跑"排:先变量与对象,再相等性、迭代、函数、
// 装饰器、类、异常,最后是并发、内存与工程习惯。
// 前两关和站内两篇文章(python/variable-is-a-name、python/iterators-and-generators)
// 讲的是同一条线,题目里能挂 link 的都挂上了,答完可以顺着回去看讲解。

import type { Level } from './types'

export const pythonLevels: Level[] = [
  // ------------------------------------------------------------------
  {
    id: 'py-variables',
    name: '变量与对象',
    intro: '变量是名字,赋值只改绑定。这一条推出后面所有"奇怪"的行为。',
    questions: [
      {
        id: 'py-var-1',
        kind: 'term2def',
        prompt: 'Python 里 `a = [1, 2]` 这句话实际发生的事情是:',
        choices: [
          { text: '先造出列表对象,再把名字 a 绑定到它上面', correct: true },
          { text: '在内存里给 a 分配一块空间,把 [1, 2] 放进去', correct: false },
          { text: '把 [1, 2] 复制一份存到 a 中', correct: false },
          { text: 'a 成为 [1, 2] 的别名,两者始终同步变化', correct: false },
        ],
        explain:
          '对象是实体,变量是贴在对象上的名字。赋值语句只做"绑定"这一件事,不理解这条,传参和深浅拷贝都推不出来。',
        link: { term: 'variable', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-var-2',
        kind: 'judge',
        prompt: '`b = a` 之后,b 是 a 的一份独立副本,改 b 不会影响 a。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '`b = a` 让 b 和 a 指向同一个对象,两个名字指着同一份数据。要副本得显式拷贝。',
        link: { term: 'binding', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-var-3',
        kind: 'scenario',
        prompt: '`a = [1, 2, 3]; b = a; b.append(4)`,此时 a 的值是:',
        choices: [
          { text: '[1, 2, 3, 4]', correct: true },
          { text: '[1, 2, 3]', correct: false },
          { text: '[1, 2, 3, 4] 和 b 一样,但 a 是只读视图', correct: false },
          { text: '报错,因为 a 还没被复制', correct: false },
        ],
        explain:
          'a 和 b 是同一个列表的两个名字,append 改的是对象本身,两个名字都看得见。',
      },
      {
        id: 'py-var-4',
        kind: 'term2def',
        prompt: '「不可变对象」指的是:',
        choices: [
          { text: '造好之后内容不能再改,一切"修改"都会返回新对象', correct: true },
          { text: '不能给它起第二个名字', correct: false },
          { text: '不能作为函数参数传递', correct: false },
          { text: '存在只读内存段里', correct: false },
        ],
        explain:
          '数字、字符串、元组都不可变。注意元组只保证元素指向不变,元组里装个列表,列表照样能改。',
        link: { term: 'mutable-immutable', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-var-5',
        kind: 'judge',
        prompt: '`a = (1, [2, 3]); a[1].append(4)` 会报错,因为元组不可变。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '元组管的是"元素指向谁",不管元素自身能不能改。`a[1]` 还是那个列表,改它完全合法,元组照样不变。',
      },
      {
        id: 'py-var-6',
        kind: 'term2def',
        prompt: '`is` 比较的是:',
        choices: [
          { text: '两个名字是否指向同一个对象(身份)', correct: true },
          { text: '两个对象的内容是否相等', correct: false },
          { text: '两个对象的类型是否相同', correct: false },
          { text: '两个对象的哈希是否相同', correct: false },
        ],
        explain:
          '`is` 比身份,`==` 比内容。判断 None 要用 `is None`,这是 PEP 8 的明确建议。',
        link: { term: 'identity' },
      },
      {
        id: 'py-var-7',
        kind: 'scenario',
        prompt: '`x = 1000; y = 1000; x is y` 的结果在不同运行时机可能不一样,原因是:',
        choices: [
          { text: '小整数有缓存区间,大整数各自新建,是否复用由实现决定', correct: true },
          { text: 'x 和 y 的类型不同', correct: false },
          { text: '1000 超出了 is 能比较的范围', correct: false },
          { text: '这是 Python 的 bug', correct: false },
        ],
        explain:
          'CPython 缓存了 [-5, 256] 的小整数,同一行代码里的相等常量也可能被合并。身份比较的结果不该被依赖,要比内容就用 `==`。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-equality',
    name: '相等性与哈希',
    intro: '== 与 is 的分工、默认相等怎么来的、__eq__ 与 __hash__ 的联动。',
    questions: [
      {
        id: 'py-eq-1',
        kind: 'term2def',
        prompt: '对象没写 `__eq__` 时,`a == b` 实际比较的是:',
        choices: [
          { text: '两个对象是否同一个(身份),和 is 等价', correct: true },
          { text: '两个对象的所有属性是否相等', correct: false },
          { text: '两个对象的类型与长度', correct: false },
          { text: '永远返回 False', correct: false },
        ],
        explain:
          'object 的默认 `__eq__` 就是比身份。所以自定义类想要"内容相等",必须自己写 `__eq__`。',
      },
      {
        id: 'py-eq-2',
        kind: 'judge',
        prompt: '只重写 `__eq__` 不重写 `__hash__`,对象照样能正常放进 set 和 dict 的键。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '定义了 `__eq__` 之后,Python 会把 `__hash__` 置为 None,对象变成不可哈希,放进 set / 当 dict 键会直接 TypeError。要能当键就得把 `__hash__` 一起定义。',
        link: { term: 'hash-table' },
      },
      {
        id: 'py-eq-3',
        kind: 'scenario',
        prompt: '两个内容完全相等的对象放进 set,结果剩下两个。最可能的原因是:',
        choices: [
          { text: '__hash__ 没重写,哈希不同,set 认为它们不是同一个', correct: true },
          { text: 'set 容量不够', correct: false },
          { text: 'set 会自动去重,只保留后放进去的', correct: false },
          { text: '对象的类型不支持哈希', correct: false },
        ],
        explain:
          'set 先按哈希分桶,再在桶内用 `==` 比对。哈希不同就落进不同桶,内容再相等也去不了重。',
      },
      {
        id: 'py-eq-4',
        kind: 'term2def',
        prompt: '`__hash__` 的约定是:',
        choices: [
          { text: '相等的对象必须有相等的哈希;哈希相等不要求对象相等', correct: true },
          { text: '哈希相等就必须对象相等', correct: false },
          { text: '哈希必须全局唯一', correct: false },
          { text: '哈希值必须等于对象长度', correct: false },
        ],
        explain:
          '哈希允许碰撞(所以桶内还要再比一次 `==`),但"相等则哈希必等"这条不能破,破了 dict / set 就会丢数据。',
        link: { term: 'hashing' },
      },
      {
        id: 'py-eq-5',
        kind: 'judge',
        prompt: '`1 == 1.0 == True` 在 Python 里都成立,因此它们可以互相当作 dict 的键复用。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '它们相等且哈希相同,dict 会把它们当成同一个键。这类"跨类型相等"是面试里常见的追问点。',
      },
      {
        id: 'py-eq-6',
        kind: 'scenario',
        prompt: '要按"内容"比较两个自定义类的实例,且能当 dict 键。至少要写:',
        choices: [
          { text: '__eq__ 和 __hash__ 两个都写', correct: true },
          { text: '只写 __eq__ 就够了', correct: false },
          { text: '只写 __hash__ 就够了', correct: false },
          { text: '写 __repr__ 让打印出来一样', correct: false },
        ],
        explain:
          '`__eq__` 定"什么算相等",`__hash__` 定"分到哪个桶"。少任何一个,dict / set 的行为都不对。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-iterators',
    name: '可迭代与生成器',
    intro: 'for 背后那套协议,以及用函数写迭代器的写法。',
    questions: [
      {
        id: 'py-it-1',
        kind: 'term2def',
        prompt: '「可迭代对象」与「迭代器」的区别是:',
        choices: [
          { text: '可迭代对象能给出迭代器,迭代器记着自己走到哪儿', correct: true },
          { text: '两者是同一回事的不同叫法', correct: false },
          { text: '可迭代对象只能用 for,迭代器只能用 next', correct: false },
          { text: '迭代器比可迭代对象多支持下标访问', correct: false },
        ],
        explain:
          '列表是可迭代对象,`iter(列表)` 才拿到迭代器。迭代器每 next() 一次前进一格,耗尽后保持耗尽状态。',
        link: { term: 'iterable', see: 'python/iterators-and-generators' },
      },
      {
        id: 'py-it-2',
        kind: 'judge',
        prompt: '一个对象只要能下标访问(有 `__getitem__`),就一定可以被 for 遍历。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '旧式迭代协议就是靠 `__getitem__` 传递增下标、抛 IndexError 实现的,所以序列类型天然可迭代。新写法推荐实现 `__iter__`。',
        link: { term: 'iteration-protocol', see: 'python/iterators-and-generators' },
      },
      {
        id: 'py-it-3',
        kind: 'term2def',
        prompt: '生成器函数里出现 `yield` 之后,调用 `g = f()` 会发生什么:',
        choices: [
          { text: '函数体一行都不执行,只返回一个生成器对象', correct: true },
          { text: '函数体从头跑到第一个 yield,然后停下', correct: false },
          { text: '函数体完整跑完,返回最后一个 yield 的值', correct: false },
          { text: '报错,因为 yield 只能在 for 里用', correct: false },
        ],
        explain:
          '函数体要等第一次 next() 才启动。这是生成器最容易被答错的一点。',
        link: { term: 'generator', see: 'python/iterators-and-generators' },
      },
      {
        id: 'py-it-4',
        kind: 'judge',
        prompt: '同一个生成器对象可以遍历多次,每次从头开始。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '生成器是一次性的,耗尽就没了。要重新走一遍,得再调用一次函数拿新的生成器。',
      },
      {
        id: 'py-it-5',
        kind: 'term2def',
        prompt: '`(x * x for x in range(10**8))` 相比列表推导式的优势是:',
        choices: [
          { text: '惰性求值,不一次性占一整块内存', correct: true },
          { text: '计算速度一定更快', correct: false },
          { text: '结果可以直接下标访问', correct: false },
          { text: '可以无限次重复遍历', correct: false },
        ],
        explain:
          '生成器表达式要一个算一个,峰值内存与数据量脱钩,还能表示无限序列。代价是只能遍历一次、不能下标。',
        link: { term: 'lazy-evaluation', see: 'python/iterators-and-generators' },
      },
      {
        id: 'py-it-6',
        kind: 'scenario',
        prompt: '要处理一个几十 GB 的日志文件,逐行统计。最合适的写法是:',
        choices: [
          { text: 'with open(...) 直接迭代文件对象,一行一行处理', correct: true },
          { text: 'readlines() 一次性读进列表再处理', correct: false },
          { text: 'read() 读成一个大字符串再 split', correct: false },
          { text: '用多线程同时读多个分片', correct: false },
        ],
        explain:
          '文件对象本身就是可迭代的,迭代时按行流式读,内存占用与文件大小无关。另两种写法会把整个文件搬进内存。',
      },
      {
        id: 'py-it-7',
        kind: 'judge',
        prompt: '`for` 循环正常结束时,内部是靠捕获 StopIteration 退出的。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '迭代器耗尽时抛 StopIteration,for 捕获它并正常结束循环。它是正常流程的一部分,不该在业务代码里到处捕。',
        link: { term: 'stop-iteration', see: 'python/iterators-and-generators' },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-functions',
    name: '函数与参数',
    intro: '传参到底传的是什么、默认值的坑、*args 与 **kwargs、闭包。',
    questions: [
      {
        id: 'py-fn-1',
        kind: 'term2def',
        prompt: 'Python 的参数传递方式是:',
        choices: [
          { text: '传对象引用:函数内改对象内容,调用方看得见', correct: true },
          { text: '传值:函数内怎么改都不影响调用方', correct: false },
          { text: '传地址:可以替换调用方的变量本身', correct: false },
          { text: '默认传值,可变类型才传引用', correct: false },
        ],
        explain:
          '传的是引用,但重新绑定参数名只影响函数内的那个名字。改对象内容双方可见,把参数指向新对象则互不影响。',
        link: { term: 'pass-by-value', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-fn-2',
        kind: 'scenario',
        prompt: '`def f(x, cache=[]): cache.append(x); return cache`,连续调用 `f(1); f(2)`,第二次返回:',
        choices: [
          { text: '[1, 2]', correct: true },
          { text: '[2]', correct: false },
          { text: '[]', correct: false },
          { text: '报错', correct: false },
        ],
        explain:
          '默认值在函数定义时求值一次,之后所有调用共用同一个列表。惯用写法是用 None 占位,函数体内再新建。',
        link: { term: 'default-argument', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-fn-3',
        kind: 'judge',
        prompt: '`def f(*args, **kwargs)` 里的 args 是元组,kwargs 是字典。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '`*args` 收多余的位置参数成元组,`**kwargs` 收多余的关键字参数成字典。解包时也可以用 `*` / `**` 把序列和映射展开成参数。',
      },
      {
        id: 'py-fn-4',
        kind: 'term2def',
        prompt: '闭包指的是:',
        choices: [
          { text: '内层函数记住了外层函数的变量,外层返回后仍能访问', correct: true },
          { text: '函数定义在另一个函数里面', correct: false },
          { text: '把函数作为参数传给另一个函数', correct: false },
          { text: '用 lambda 写的函数', correct: false },
        ],
        explain:
          '关键是"带走变量"而不是"嵌套定义"。循环里造闭包要小心:绑定发生在调用时,常见坑是用默认参数或工厂函数把当前值固定下来。',
      },
      {
        id: 'py-fn-5',
        kind: 'scenario',
        prompt: '`funcs = [lambda: i for i in range(3)]`,依次调用三个函数,输出是:',
        choices: [
          { text: '2, 2, 2', correct: true },
          { text: '0, 1, 2', correct: false },
          { text: '0, 0, 0', correct: false },
          { text: '报错', correct: false },
        ],
        explain:
          '三个 lambda 共享同一个 i,调用时循环已经结束,i 停在 2。要分别拿到当时的值得写成 `lambda i=i: i`。',
      },
      {
        id: 'py-fn-6',
        kind: 'term2def',
        prompt: '`global` 与 `nonlocal` 的分工是:',
        choices: [
          { text: 'global 声明模块级变量,nonlocal 声明外层函数变量', correct: true },
          { text: '两者完全一样,只是写法不同', correct: false },
          { text: 'global 用于函数内,nonlocal 用于类内', correct: false },
          { text: 'nonlocal 比 global 作用域更大', correct: false },
        ],
        explain:
          '两者都让赋值语句不去创建局部名字。只读外层变量不需要任何声明,只有要"写"的时候才用。',
      },
      {
        id: 'py-fn-7',
        kind: 'judge',
        prompt: '函数内给一个名字赋值,会让这个名字在整个函数内都变成局部变量。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '编译期就定了:函数体内只要有对某名的赋值,它就是局部的。所以先读后写会报 UnboundLocalError,这不是运行顺序问题。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-decorators',
    name: '装饰器与上下文',
    intro: '装饰器是语法糖、with 背后那两个方法,以及怎么写一个简单的。',
    questions: [
      {
        id: 'py-dec-1',
        kind: 'term2def',
        prompt: '`@deco` 写在函数上,等价于:',
        choices: [
          { text: '定义完之后把函数名重新绑定到 deco(原函数) 的结果', correct: true },
          { text: '在函数每次被调用时先执行 deco', correct: false },
          { text: '把函数体复制进 deco 里', correct: false },
          { text: '给函数加一个 __deco__ 属性', correct: false },
        ],
        explain:
          '装饰在定义时发生一次。`@deco` 就是 `f = deco(f)` 的语法糖,所以 deco 要返回一个可调用对象。',
        link: { term: 'syntax-sugar' },
      },
      {
        id: 'py-dec-2',
        kind: 'scenario',
        prompt: '装饰后函数的 `__name__` 变成了 "wrapper"。修复办法是:',
        choices: [
          { text: '用 functools.wraps 装饰内层 wrapper', correct: true },
          { text: '在 wrapper 里手动 return f.__name__', correct: false },
          { text: '把装饰器改成类', correct: false },
          { text: '给原函数改个短名字', correct: false },
        ],
        explain:
          '`functools.wraps` 会把 `__name__`、`__doc__` 等元数据从原函数拷到 wrapper 上。日志、调试、文档生成都依赖这些属性。',
      },
      {
        id: 'py-dec-3',
        kind: 'term2def',
        prompt: '`with open(...) as f:` 退出代码块时,保证执行的是:',
        choices: [
          { text: 'f.__exit__()', correct: true },
          { text: 'f.close() 直接调用,和 with 无关', correct: false },
          { text: 'f.__del__()', correct: false },
          { text: '垃圾回收器回收 f', correct: false },
        ],
        explain:
          'with 靠 `__enter__` / `__exit__` 这两个魔术方法。即使块内抛异常,`__exit__` 也会被调用,返回 True 还能把异常吞掉。',
        link: { term: 'magic-method' },
      },
      {
        id: 'py-dec-4',
        kind: 'judge',
        prompt: '上下文管理器的 `__exit__` 收到异常信息后,返回 True 表示异常已被处理,不再往外抛。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '`__exit__` 的返回值就是"这个异常我管不管"。管了就返回 True,with 语句正常结束;不管就返回 None / False,异常继续传播。',
      },
      {
        id: 'py-dec-5',
        kind: 'scenario',
        prompt: '要统计一个函数的耗时,又不想改函数体。最 Pythonic 的做法是:',
        choices: [
          { text: '写一个计时装饰器,套在函数上', correct: true },
          { text: '在函数体内手动加 time 计算', correct: false },
          { text: '用多线程监控函数执行', correct: false },
          { text: '把函数改成生成器', correct: false },
        ],
        explain:
          '装饰器正是为这种"横切关注点"准备的:日志、计时、重试、鉴权都可以包一层,业务代码保持干净。',
      },
      {
        id: 'py-dec-6',
        kind: 'term2def',
        prompt: '带参数的装饰器(如 `@retry(3)`)通常写成:',
        choices: [
          { text: '三层嵌套:最外层收装饰器参数,返回真正的装饰器', correct: true },
          { text: '两层嵌套就够了,参数放在 wrapper 上', correct: false },
          { text: '用类装饰器,参数写在 __init__', correct: false },
          { text: '不能带参数,只能写死', correct: false },
        ],
        explain:
          '`retry(3)` 先求值得到一个装饰器,再由它去装饰函数。常见写法是外层函数返回内层装饰器,functools.wraps 别忘。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-classes',
    name: '类与对象模型',
    intro: 'self 是什么、类属性与实例属性、property、继承与 MRO。',
    questions: [
      {
        id: 'py-cls-1',
        kind: 'term2def',
        prompt: '方法定义里第一个参数 self 指的是:',
        choices: [
          { text: '调用这个方法的具体实例', correct: true },
          { text: '类本身', correct: false },
          { text: '方法的返回值占位', correct: false },
          { text: '父类的实例', correct: false },
        ],
        explain:
          '`a.f()` 实际是 `A.f(a)`,self 就是被点出来的那个实例。self 只是约定名字,换成别的名字也能跑,但没人这么干。',
      },
      {
        id: 'py-cls-2',
        kind: 'judge',
        prompt: '类属性和实例属性同名时,通过实例读到的永远是实例属性。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '查找顺序是实例 → 类 → 父类。实例上有就遮蔽掉类的;赋值时会在实例上新建一个,不会去改类属性。',
      },
      {
        id: 'py-cls-3',
        kind: 'scenario',
        prompt: '`class A: items = []`,创建多个实例后 `a.items.append(1)`,另一个实例 b.items 是:',
        choices: [
          { text: '[1],因为 items 是类属性,被所有实例共享', correct: true },
          { text: '[],每个实例各有一份', correct: false },
          { text: '报错,实例不能改类属性', correct: false },
          { text: 'None', correct: false },
        ],
        explain:
          '可变类属性是经典陷阱。要每个实例独立一份,就在 `__init__` 里 `self.items = []`。',
      },
      {
        id: 'py-cls-4',
        kind: 'term2def',
        prompt: '`@property` 的作用是:',
        choices: [
          { text: '把一个方法变成属性访问的写法,内部仍走方法逻辑', correct: true },
          { text: '把属性设为只读且不能赋值', correct: false },
          { text: '给类加一个静态属性', correct: false },
          { text: '缓存方法的返回值', correct: false },
        ],
        explain:
          'property 让 `obj.x` 背后跑一段代码,常配合 `@x.setter` 做校验。它保住了调用方的写法,又留出了改实现的空间。',
      },
      {
        id: 'py-cls-5',
        kind: 'judge',
        prompt: '`__slots__` 声明之后,实例就不能再动态添加未声明的属性。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '`__slots__` 用固定槽位代替 `__dict__`,省内存也禁掉动态加属性。代价是不能再随便往对象上挂东西。',
      },
      {
        id: 'py-cls-6',
        kind: 'term2def',
        prompt: 'Python 的方法解析顺序(MRO)遵循:',
        choices: [
          { text: 'C3 线性化,保证深度优先且每个类只出现一次', correct: true },
          { text: '严格的从左到右深度优先', correct: false },
          { text: '按定义时间倒序', correct: false },
          { text: '按方法名字典序', correct: false },
        ],
        explain:
          '多继承时 `C.mro()` 能打印出来。C3 保证子类排在父类前、同一父类不重复出现,这也是 super() 能正确协作的前提。',
      },
      {
        id: 'py-cls-7',
        kind: 'scenario',
        prompt: '类里同时定义 `__repr__` 和 `__str__`,print(obj) 用的是:',
        choices: [
          { text: '优先 __str__,没有才退回 __repr__', correct: true },
          { text: '优先 __repr__', correct: false },
          { text: '两个都会调用,输出拼在一起', correct: false },
          { text: '只用 __repr__,__str__ 给 str() 用', correct: false },
        ],
        explain:
          '`str()` / print 走 `__str__`,交互式回显和容器内嵌走 `__repr__`。`__repr__` 面向开发者,最好能唯一定位对象。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-exceptions',
    name: '异常处理',
    intro: 'try 的完整结构、EAFP 风格、异常链与自定义异常。',
    questions: [
      {
        id: 'py-exc-1',
        kind: 'term2def',
        prompt: '`try / except / else / finally` 中,else 块执行的时机是:',
        choices: [
          { text: 'try 块没抛异常时执行', correct: true },
          { text: '抛了异常时执行', correct: false },
          { text: '无论有没有异常都执行', correct: false },
          { text: '只在 finally 之后执行', correct: false },
        ],
        explain:
          'else 放"没出岔子才该做的事",finally 放"无论如何都要做的清理"。两者分工不同,别混。',
      },
      {
        id: 'py-exc-2',
        kind: 'judge',
        prompt: '`except Exception:` 会把 KeyboardInterrupt 和 SystemExit 也一并捕获。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'KeyboardInterrupt 和 SystemExit 继承自 BaseException,不在 Exception 分支里。要拦所有异常才显式写 BaseException,平时别这么干。',
      },
      {
        id: 'py-exc-3',
        kind: 'term2def',
        prompt: 'EAFP 风格指的是:',
        choices: [
          { text: '先做再捕异常,出了问题再处理', correct: true },
          { text: '做事之前把所有条件检查一遍', correct: false },
          { text: '把异常记录到日志后继续', correct: false },
          { text: '用 finally 保证清理', correct: false },
        ],
        explain:
          '"请求原谅比许可容易"。字典访问直接 `d[k]` 捕 KeyError,比先 `if k in d` 少一次查找,也更贴合并发场景下的真实状态。',
      },
      {
        id: 'py-exc-4',
        kind: 'scenario',
        prompt: '在 except 块里抛出一个新异常,想看原始堆栈该怎么写:',
        choices: [
          { text: 'raise NewError(...) from err', correct: true },
          { text: 'raise NewError(...) , err', correct: false },
          { text: '先 print(err) 再 raise', correct: false },
          { text: '把 err 存到全局变量', correct: false },
        ],
        explain:
          '`raise ... from err` 会保留异常链,最终 traceback 里能看到"direct cause"。不用 from 也会隐式带上上下文,但显式写法更清楚。',
      },
      {
        id: 'py-exc-5',
        kind: 'judge',
        prompt: '自定义业务异常通常继承自 Exception,并起一个以 Error 结尾的名字。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '继承 Exception 才能被常规的 except 分支接住。自定义异常让你能按业务类型分别处理,而不是靠字符串猜错误原因。',
      },
      {
        id: 'py-exc-6',
        kind: 'term2def',
        prompt: '`finally` 块里的 return 会造成什么结果:',
        choices: [
          { text: '覆盖 try / except 里的 return,最终返回它的值', correct: true },
          { text: '被忽略, finally 的 return 无效', correct: false },
          { text: '抛 SyntaxError', correct: false },
          { text: '让函数变成生成器', correct: false },
        ],
        explain:
          'finally 的 return 会吞掉原本要返回的值,异常也会被冲掉。清理逻辑放 finally,返回值只在一处写。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-concurrency',
    name: '并发与 GIL',
    intro: 'GIL 管什么、线程和多进程怎么选、asyncio 适合什么。',
    questions: [
      {
        id: 'py-con-1',
        kind: 'term2def',
        prompt: 'GIL(全局解释器锁)导致的结果是:',
        choices: [
          { text: '同一时刻只有一个线程在执行 Python 字节码', correct: true },
          { text: '同一进程只能有一个线程', correct: false },
          { text: '多线程无法共享内存', correct: false },
          { text: '多进程无法并行', correct: false },
        ],
        explain:
          'GIL 是 CPython 的实现细节,保护解释器内部状态。它让多线程无法利用多核跑计算,但 I/O 等待时会释放,所以 I/O 密集型仍适合多线程。',
      },
      {
        id: 'py-con-2',
        kind: 'judge',
        prompt: '计算密集型任务想用上多核,优先用多进程而不是多线程。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '每个进程有独立的解释器和 GIL,能真正并行。代价是进程创建开销大、数据要序列化传递。',
      },
      {
        id: 'py-con-3',
        kind: 'term2def',
        prompt: 'asyncio 的协程适合的场景是:',
        choices: [
          { text: '大量 I/O 等待,连接数多但每个都不耗 CPU', correct: true },
          { text: 'CPU 密集的数值计算', correct: false },
          { text: '必须用到多核的并行计算', correct: false },
          { text: '所有需要并发的场景', correct: false },
        ],
        explain:
          '协程在单线程内靠 await 让出执行权,省掉线程上下文切换。遇到 CPU 密集或阻塞的系统调用,它一样帮不上忙。',
        link: { term: 'coroutine', see: 'python/iterators-and-generators' },
      },
      {
        id: 'py-con-4',
        kind: 'judge',
        prompt: '`time.sleep(1)` 在 async 函数里会阻塞整个事件循环。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '它是同步阻塞调用,期间事件循环转不动,其他协程全被卡住。要用 `await asyncio.sleep(1)`。',
      },
      {
        id: 'py-con-5',
        kind: 'scenario',
        prompt: '多个线程同时 `lst.append(x)`,需要加锁吗:',
        choices: [
          { text: 'list.append 本身是原子的,单个操作不用;多步组合就要', correct: true },
          { text: '完全不需要,列表是线程安全的', correct: false },
          { text: '任何情况下都必须加锁', correct: false },
          { text: 'GIL 已经保证了多步操作也安全', correct: false },
        ],
        explain:
          'GIL 让单条字节码级别的操作原子,但"读-改-写"的组合随时可能被切换打断。判断标准是这一步是不是一次原子操作。',
      },
      {
        id: 'py-con-6',
        kind: 'term2def',
        prompt: '`asyncio.gather` 的作用是:',
        choices: [
          { text: '并发跑多个协程,等它们全部结束收结果', correct: true },
          { text: '串行执行多个协程', correct: false },
          { text: '给协程设置超时', correct: false },
          { text: '把同步函数改成协程', correct: false },
        ],
        explain:
          'gather 把一批 awaitable 一起提交给事件循环。要限并发用 semaphore,要超时用 wait_for。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-memory',
    name: '内存与拷贝',
    intro: '引用计数与 gc、深浅拷贝、以及"="和"复制"的区别。',
    questions: [
      {
        id: 'py-mem-1',
        kind: 'term2def',
        prompt: 'CPython 主要的对象回收机制是:',
        choices: [
          { text: '引用计数,归零立即回收', correct: true },
          { text: '分代垃圾回收', correct: false },
          { text: '标记-清除', correct: false },
          { text: '进程退出时统一回收', correct: false },
        ],
        explain:
          '引用计数是主力,所以对象失效即刻释放;分代 gc 只是兜底,专门收拾引用计数搞不定的循环引用。',
        link: { term: 'reference-counting', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-mem-2',
        kind: 'judge',
        prompt: '两个对象互相引用时,引用计数无法把它们降到 0,需要循环检测器处理。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '互相引用让彼此的计数至少为 1,引用计数失效。CPython 的循环检测器会定期扫描这类环并回收。',
        link: { term: 'garbage-collection' },
      },
      {
        id: 'py-mem-3',
        kind: 'scenario',
        prompt: '`b = a[:]` 之后修改 `b[0].append(1)`(a 是列表的列表),a 会变吗:',
        choices: [
          { text: '会,切片是浅拷贝,内层还是同一个对象', correct: true },
          { text: '不会,切片是深拷贝', correct: false },
          { text: '会报错,切片结果不可写', correct: false },
          { text: '不会,a 变成了元组', correct: false },
        ],
        explain:
          '浅拷贝只复制外层容器,内层元素照搬引用。要彻底独立用 `copy.deepcopy`。',
        link: { term: 'shallow-copy', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-mem-4',
        kind: 'term2def',
        prompt: '`copy.deepcopy` 处理循环引用的方式是:',
        choices: [
          { text: '用 memo 字典记录已复制对象,碰到引用直接取', correct: true },
          { text: '递归到一定深度后放弃', correct: false },
          { text: '抛 RecursionError', correct: false },
          { text: '只复制第一层', correct: false },
        ],
        explain:
          'memo 保证每个对象只复制一次,既避免无限递归,也让复制结果里的共享关系与原对象一致。',
        link: { term: 'deep-copy', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-mem-5',
        kind: 'judge',
        prompt: '把大数据帧当参数传给函数,函数内修改它会影响调用方那份。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '传的是引用,函数内的原地修改(inplace)对调用方可见。不想被改就显式传副本,并在文档里写清楚。',
        link: { term: 'in-place', see: 'python/variable-is-a-name' },
      },
      {
        id: 'py-mem-6',
        kind: 'scenario',
        prompt: '函数要返回多个大对象,又不想调用方误改。合适的做法是:',
        choices: [
          { text: '返回前显式拷贝,并在 docstring 里说明所有权', correct: true },
          { text: '什么都不做,靠调用方自觉', correct: false },
          { text: '把对象设为只读属性', correct: false },
          { text: '返回对象的 repr 字符串', correct: false },
        ],
        explain:
          'Python 没有所有权机制,边界上的契约靠文档和显式拷贝建立。这也是"视图与副本"那类事故的根源。',
        link: { term: 'view-and-copy', see: 'python/variable-is-a-name' },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'py-engineering',
    name: '工程与标准库',
    intro: '虚拟环境、常用内置模块、类型标注与打包,面试里的工程题。',
    questions: [
      {
        id: 'py-eng-1',
        kind: 'term2def',
        prompt: '虚拟环境(venv)解决的是:',
        choices: [
          { text: '同一台机器上不同项目各用一套依赖,互不覆盖', correct: true },
          { text: '让 Python 跑得更快', correct: false },
          { text: '把项目打包成可执行文件', correct: false },
          { text: '隔离系统文件,防止误删', correct: false },
        ],
        explain:
          '每个 venv 有独立的 site-packages 和解释器符号链接。依赖版本冲突是它的核心战场。',
      },
      {
        id: 'py-eng-2',
        kind: 'scenario',
        prompt: '要按键统计一堆单词出现次数,最合适的结构是:',
        choices: [
          { text: 'collections.Counter', correct: true },
          { text: 'list + 每次 count()', correct: false },
          { text: '嵌套 for 循环逐对比较', correct: false },
          { text: '用 set 去重后数长度', correct: false },
        ],
        explain:
          'Counter 就是 dict 的计数专用封装,还带 most_common 排序。标准库里这类"正好够用"的容器先想一圈再自己写。',
      },
      {
        id: 'py-eng-3',
        kind: 'judge',
        prompt: '`dataclass` 装饰器会根据字段声明自动生成 `__init__`、`__repr__` 和 `__eq__`。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'dataclass 专为"装数据的类"准备,省掉一堆样板方法。需要不可变可以 `frozen=True`,要默认值用 `field(default_factory=...)`。',
      },
      {
        id: 'py-eng-4',
        kind: 'term2def',
        prompt: '`pathlib.Path` 相对 `os.path` 的主要改进是:',
        choices: [
          { text: '路径是对象,能用 / 运算拼接,方法链式调用', correct: true },
          { text: '读写文件更快', correct: false },
          { text: '支持更长的路径', correct: false },
          { text: '自动处理权限', correct: false },
        ],
        explain:
          'Path 把路径从字符串变成对象,`Path("a") / "b"` 就能拼,读文读字节都有现成方法,跨平台也更稳。',
      },
      {
        id: 'py-eng-5',
        kind: 'judge',
        prompt: '函数标注 `def f(x: int) -> str` 在运行时会强制检查参数类型。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '注解默认只是元数据,存在 `__annotations__` 里,解释器不拿它做校验。要检查得靠 mypy 这类静态工具,或运行时库。',
      },
      {
        id: 'py-eng-6',
        kind: 'scenario',
        prompt: '要给一个内部工具写依赖和入口,让人 `pip install` 后得到命令。该准备的声明位置是:',
        choices: [
          { text: 'pyproject.toml 里的 dependencies 与 [project.scripts]', correct: true },
          { text: 'requirements.txt 与 README', correct: false },
          { text: 'setup.py 里的 sys.argv 判断', correct: false },
          { text: '随便放,安装时会自动扫描', correct: false },
        ],
        explain:
          'pyproject.toml 是现在的标准。`dependencies` 声明依赖,`[project.scripts]` 把函数名映射成命令行入口。',
      },
      {
        id: 'py-eng-7',
        kind: 'term2def',
        prompt: '`if __name__ == "__main__":` 的作用是:',
        choices: [
          { text: '只有直接运行这个文件时才执行下面的代码', correct: true },
          { text: '只有被 import 时才执行', correct: false },
          { text: '标记这是程序的主模块,永远执行', correct: false },
          { text: '给模块起别名', correct: false },
        ],
        explain:
          '被 import 时 `__name__` 是模块名,直接运行时才是 `"__main__"`。它让同一个文件既能当脚本又能当库被复用。',
      },
    ],
  },
]
