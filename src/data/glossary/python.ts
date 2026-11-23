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
      '对象创建后内容能否就地修改。列表、字典、集合可变;数字、字符串、元组不可变 —— 对它们的"修改"实际返回新对象。',
    formal:
      '可变类型实现了就地修改操作;不可变对象的一切"修改"都返回新对象。注意不可变容器只保证它直接持有的引用不变:元组内引用的列表仍可被修改。',
    misread: '把"不可变"理解成"内部引用的对象也被冻结"。元组只保证元素指向不变,不保证元素自身不变。',
    related: ['in-place', 'shallow-copy'],
  },
  {
    id: 'iterable',
    term: '可迭代对象',
    en: 'iterable',
    group: 'python',
    plain:
      '能被 for 遍历的对象。列表、字符串、字典、文件都是。它自身不记录遍历位置,每次遍历由 iter() 返回一个新的迭代器。',
    formal:
      '实现了 __iter__() 并返回一个迭代器的对象,iter() 内置函数接受它。可迭代对象本身不一定是迭代器。',
    misread: '以为"能下标访问就是可迭代"。真正的要求是实现 __iter__。',
    related: ['iterator', 'iteration-protocol'],
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
      '记录遍历位置的对象。每调用一次 next() 前进一步,耗尽后不可重置,也不能回退。',
    formal:
      '同时实现 __next__() 与 __iter__()（且 __iter__ 必须返回自身）的对象。next() 耗尽后抛 StopIteration,此后保持耗尽状态。',
    related: ['iterable', 'iteration-protocol', 'stop-iteration'],
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
      'for 背后的约定:先 iter() 取得迭代器,再反复 next(),直到抛出 StopIteration。for 依赖这套协议,而非具体类型。',
    formal:
      '由 __iter__ 与 __next__ 两个特殊方法构成的协议。for、in、解包、list() 等语法与内置函数都建立在它之上。',
    related: ['iterable', 'iterator', 'stop-iteration'],
  },
  {
    id: 'generator',
    term: '生成器',
    en: 'generator',
    group: 'python',
    plain:
      '用函数实现的迭代器。函数体含 yield 时,调用返回一个逐次产出值的对象,执行到 yield 处挂起并保留局部状态。',
    formal:
      '调用含 yield 的函数所返回的对象,自动实现迭代器协议。函数体在首次 next() 时才执行,yield 处挂起并保留全部局部状态。',
    misread: '以为 g = f() 会执行函数体。只要函数体里有 yield,调用时函数体不会执行。',
    related: ['iterator', 'yield', 'lazy-evaluation'],
    source: { title: 'PEP 255 · Simple Generators', url: 'https://peps.python.org/pep-0255/' },
  },
  {
    id: 'yield',
    term: 'yield',
    group: 'python',
    plain:
      '挂起当前执行并产出一个值,保留局部状态,下次恢复时从挂起处继续 —— 这是生成器能记住遍历位置的原因。',
    formal:
      '生成器函数内的表达式,求值后把值交给调用方并挂起当前帧,恢复时从挂起处继续。yield 表达式本身也有值,可由 send() 提供。',
    related: ['generator', 'coroutine'],
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
      '按需计算,不预先求值整批数据。数据超出内存容量、或只需部分结果时,惰性求值是唯一可行的做法。',
    formal:
      '把表达式的求值推迟到其值真正被需要时进行。生成器与生成器表达式是 Python 里最常见的惰性结构,能表示无限序列并压低峰值内存。',
    related: ['generator', 'generator-expression'],
  },
  {
    id: 'stop-iteration',
    term: 'StopIteration',
    group: 'python',
    plain: '迭代器耗尽时抛出的信号,属于正常流程的一部分。',
    formal:
      '迭代器耗尽时由 __next__ 抛出的内置异常。for 捕获它并正常结束循环;生成器函数里显式 return 也会被转换成它。',
    misread: '把它当普通异常到处捕获。捕获后循环提前结束,剩余元素不再遍历。',
    related: ['iterator', 'iteration-protocol'],
  },
  {
    id: 'list-comprehension',
    term: '列表推导式',
    en: 'list comprehension',
    aliases: ['列表推导', '推导式'],
    group: 'python',
    plain: '一行表达"从一批元素筛选或变换出另一批",结果为立即求值的完整列表。',
    formal:
      '[expr for x in it if cond] 形式,等价于先建空列表再循环 append,立即求值,占用 O(n) 额外内存。',
    related: ['generator-expression', 'lazy-evaluation'],
  },
  {
    id: 'generator-expression',
    term: '生成器表达式',
    en: 'generator expression',
    group: 'python',
    plain: '推导式的圆括号形式。逐次求值,不占用整块内存。',
    formal:
      '(expr for x in it) 形式,返回生成器而非列表,惰性求值,且只能遍历一次。',
    related: ['list-comprehension', 'generator'],
  },
  {
    id: 'shallow-copy',
    term: '浅拷贝',
    en: 'shallow copy',
    group: 'python',
    plain:
      '新建外层容器,内部仍引用原对象。修改外层互不影响;修改内层共享对象,则双方都可见。',
    formal:
      '新建复合对象,并把原对象各项的引用填进去。list(x)、x[:]、x.copy()、copy.copy() 都是浅拷贝。',
    related: ['deep-copy', 'reference'],
    source: { title: 'copy 模块', url: 'https://docs.python.org/zh-cn/3/library/copy.html' },
  },
  {
    id: 'deep-copy',
    term: '深拷贝',
    en: 'deep copy',
    group: 'python',
    plain: '递归复制对象及其包含的全部对象,复制后双方完全独立,修改互不影响。',
    formal:
      '递归复制对象及其包含的所有对象,内部用 memo 字典记录已复制过的对象,因此循环引用不会无限递归。copy.deepcopy()。',
    related: ['shallow-copy', 'view-and-copy'],
    source: { title: 'copy 模块', url: 'https://docs.python.org/zh-cn/3/library/copy.html' },
  },
  {
    id: 'view-and-copy',
    term: '视图与副本',
    en: 'view / copy',
    group: 'python',
    plain:
      '拿到的是原对象本身(视图)还是独立副本?修改前必须确认,这是数据处理中最常见的一类错误。',
    formal:
      '视图与原对象共享底层存储,互相的修改彼此可见;副本拥有独立存储。pandas 切片、numpy 切片以及 inplace 参数都属于这一类。',
    related: ['shallow-copy', 'deep-copy'],
  },
  {
    id: 'default-argument',
    term: '默认参数',
    en: 'default argument',
    group: 'python',
    plain:
      '参数后的默认值只在函数定义时求值一次,之后各次调用共用同一对象 —— 因此可变默认值被修改后会在调用间持续保留。',
    formal:
      '默认值在函数定义执行时求值一次并保存在 __defaults__ 中,后续调用复用。可变默认值因此在调用间共享状态,惯用写法是用 None 占位。',
    misread: '以为每次调用都会重新创建默认值。只有定义那一次会。',
    related: ['mutable-immutable', 'binding'],
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
    plain: '记录当前有多少引用指向该对象,计数归零即回收。',
    formal:
      'CPython 的主要内存管理机制,可用 sys.getrefcount() 读,但该函数自身会多算一次。循环引用需要额外的循环检测器兜底。',
    related: ['garbage-collection', 'reference'],
  },
  {
    id: 'magic-method',
    term: '魔术方法',
    en: 'magic method / dunder',
    aliases: ['双下方法', 'dunder'],
    group: 'python',
    plain:
      '前后各带两条下划线的特殊方法,声明某操作应如何执行。写 a + b 时,Python 调用 __add__。',
    formal:
      '由语言在特定语法或内置操作下隐式调用的方法,如 __iter__、__next__、__eq__、__iadd__。它们构成对象与语言语法之间的接口。',
    related: ['protocol', 'iteration-protocol'],
  },
  {
    id: 'augmented-assignment',
    term: '增强赋值',
    en: 'augmented assignment',
    aliases: ['就地运算符'],
    group: 'python',
    plain:
      '+= 这类"运算并赋值"的写法。对象支持就地修改则改原对象,否则计算新对象再重新绑定名字 —— 两者对别名的影响不同。',
    formal:
      '+=、*= 等先尝试 __iadd__ 等就地方法,不存在时退回 __add__ 再赋值。因此对列表是就地扩展（别名可见）,对元组、字符串是新对象（别名不可见）。',
    related: ['in-place', 'magic-method', 'binding'],
  },
  {
    id: 'coroutine',
    term: '协程',
    en: 'coroutine',
    group: 'python',
    plain: '可挂起并可由外部反复传入值的函数。生成器是其雏形,async / await 是其现代形态。',
    formal:
      '可在执行中挂起并恢复的计算单元。生成器的 send() 提供了最基础的协程能力,asyncio 与 async def 在此之上构建。',
    related: ['yield', 'generator'],
  },
  {
    id: 'keyword-argument',
    term: '关键字参数',
    en: 'keyword argument',
    aliases: ['关键字实参'],
    group: 'python',
    plain:
      '调用时按"名字=值"传入的实参,按参数名匹配,与位置无关。',
    formal:
      '调用侧以 name=value 形式绑定到同名形参,可以出现在位置实参之后。未被形参接收的关键字实参收进 **kwargs 字典;与位置实参重复绑定同一形参会抛 TypeError。',
    related: ['default-argument', 'binding'],
    source: {
      title: 'Python 官方教程 · 特殊参数',
      url: 'https://docs.python.org/zh-cn/3/tutorial/controlflow.html#special-parameters',
    },
  },
  {
    id: 'lexical-scope',
    term: '词法作用域',
    en: 'lexical scope',
    aliases: ['静态作用域'],
    group: 'python',
    plain:
      '名字到哪一层去找,由代码书写的位置决定,与运行时的调用链无关。',
    formal:
      'Python 按定义时的嵌套结构解析名字,顺序为 Local → Enclosing → Global → Built-in(LEGB)。这与按调用链查找的动态作用域相对;闭包因此能稳定捕获定义处的外层变量。',
    related: ['namespace', 'closure', 'binding'],
  },
  {
    id: 'closure',
    term: '闭包',
    en: 'closure',
    group: 'python',
    plain:
      '内层函数连同它引用的外层变量一起构成的对象。外层函数返回后,这些变量仍然存活。',
    formal:
      '在嵌套函数中引用外层作用域的自由变量,且该函数对象被返回或保存时,解释器用 cell 对象持有这些变量,使它们不随栈帧销毁。闭包内重新绑定自由变量需要 nonlocal。',
    misread: '以为闭包捕获的是变量在创建时的值。它捕获的是变量本身,循环中创建的多个闭包会共享同一个变量。',
    related: ['lexical-scope', 'namespace'],
  },
  {
    id: 'higher-order-function',
    term: '高阶函数',
    en: 'higher-order function',
    group: 'python',
    plain:
      '接收函数作为参数、或把函数作为返回值返回的函数。sorted 的 key、map、装饰器都属于这一类。',
    formal:
      '以函数对象为一等值进行传递或返回的函数。Python 中函数是普通对象,高阶函数不需要额外的语法支持。',
    related: ['lambda', 'decorator'],
  },
  {
    id: 'lambda',
    term: 'lambda 表达式',
    en: 'lambda expression',
    aliases: ['匿名函数'],
    group: 'python',
    plain:
      '只包含一个表达式的匿名函数,写法为 lambda 参数: 表达式,表达式的结果就是返回值。',
    formal:
      '用 lambda 表达式创建的函数对象,等价于一个函数体只有 return 的 def。不能包含语句;函数对象的 __name__ 为 <lambda>。',
    related: ['higher-order-function', 'decorator'],
  },
  {
    id: 'decorator',
    term: '装饰器',
    en: 'decorator',
    group: 'python',
    plain:
      '把一个函数交给另一个函数包一层、再返回新函数的写法,@deco 是它的语法糖。',
    formal:
      '接受可调用对象并返回可调用对象的可调用对象。@deco 等价于 f = deco(f)。带参数的装饰器需要三层嵌套;包装函数通常用 functools.wraps 保留原函数的元数据。',
    related: ['higher-order-function', 'syntax-sugar', 'closure'],
    source: {
      title: 'Python 官方术语表 · decorator',
      url: 'https://docs.python.org/zh-cn/3/glossary.html#term-decorator',
    },
  },
  {
    id: 'instance',
    term: '实例',
    en: 'instance',
    group: 'python',
    plain: '由类创建出来的具体对象。同一个类可以创建任意多个实例,各有各的属性。',
    formal:
      '调用类对象时经 __new__ 创建、再由 __init__ 初始化的对象。实例的 __class__ 指向创建它的类,实例属性存放在 __dict__(或 __slots__ 声明的槽)中。',
    related: ['object', 'attribute'],
  },
  {
    id: 'attribute',
    term: '属性',
    en: 'attribute',
    group: 'python',
    plain: '挂在对象上的数据或方法,用点号访问。实例属性归实例,类属性归类。',
    formal:
      '属性访问 obj.name 先查实例 __dict__,再按 MRO 查类及基类;类属性若为数据描述符,则由描述符的 __get__ 接管。赋值默认写入实例 __dict__。',
    misread: '以为修改实例的同名属性会改到类属性。赋值只在实例上新建一条绑定,类属性保持不变。',
    related: ['instance', 'descriptor'],
  },
  {
    id: 'method',
    term: '方法',
    en: 'method',
    group: 'python',
    plain: '定义在类里、第一个参数接收实例或类的函数。通过实例调用时,解释器自动传入实例。',
    formal:
      '普通方法在类上表现为非数据描述符,访问 instance.method 时返回绑定方法对象,把实例作为第一个实参固定下来,等价于 Class.method(instance, ...)。',
    related: ['attribute', 'instance'],
  },
  {
    id: 'mro',
    term: '方法解析顺序',
    en: 'MRO / C3 linearization',
    aliases: ['MRO'],
    group: 'python',
    plain: '多重继承时,查找一个方法该按什么顺序经过各个类。',
    formal:
      '由 C3 线性化算法计算的类序列,记录在 cls.__mro__。规则为子类先于基类、基类按声明顺序、各自内部顺序保持不变;无法满足时类定义阶段抛 TypeError。super() 沿这个序列找下一个类。',
    related: ['method', 'attribute'],
  },
  {
    id: 'descriptor',
    term: '描述符',
    en: 'descriptor',
    group: 'python',
    plain: '定义了属性访问钩子的类。把它的实例放在类属性上,实例的读写就会被它接管。',
    formal:
      '实现了 __get__、__set__、__delete__ 之一的类。含 __set__ 或 __delete__ 的是数据描述符,优先级高于实例 __dict__;只有 __get__ 的是非数据描述符,函数即属此类。property、classmethod、staticmethod 都由描述符实现。',
    related: ['attribute', 'magic-method', 'property'],
  },
  {
    id: 'property',
    term: 'property',
    en: 'property',
    group: 'python',
    plain: '把方法包装成属性访问的内置工具,读、写、删分别走 getter、setter、deleter。',
    formal:
      '内置的数据描述符类型,通过 @property 装饰器创建。fget/fset/fdel 三个函数同名扩展;外部以属性语法访问时由描述符分发到对应方法。',
    related: ['descriptor', 'decorator', 'attribute'],
  },
  {
    id: 'dataclass',
    term: 'dataclass',
    en: 'data class',
    group: 'python',
    plain: '用注解声明字段、自动生成初始化与比较方法的类装饰器。',
    formal:
      'dataclasses.dataclass 根据类中的注解生成 __init__、__repr__、__eq__ 等方法。可变默认值需用 field(default_factory=...);frozen、order、kw_only、slots 等参数控制生成行为;__post_init__ 用于补充校验。',
    related: ['value', 'mutable-immutable'],
    source: {
      title: 'Python 官方文档 · dataclasses',
      url: 'https://docs.python.org/zh-cn/3/library/dataclasses.html',
    },
  },
  {
    id: 'enum',
    term: '枚举',
    en: 'enumeration / Enum',
    group: 'python',
    plain: '把一组命名常量收成一个类型,成员有名字和值,数量固定。',
    formal:
      'enum.Enum 的子类在类创建时把每个赋值转换为成员对象,成员按身份唯一。IntEnum 同时是 int 子类,Flag 支持按位组合,auto() 自动赋值。成员在导入后不可新增。',
    related: ['value', 'dataclass'],
    source: {
      title: 'Python 官方文档 · enum',
      url: 'https://docs.python.org/zh-cn/3/library/enum.html',
    },
  },
  {
    id: 'exception',
    term: '异常',
    en: 'exception',
    group: 'python',
    plain: '程序出错时抛出的对象,沿调用栈向上传递,直到被 except 接住。',
    formal:
      '继承 BaseException 的对象,携带类型、消息、traceback 与 __cause__/__context__。raise 抛出,未被处理的异常在传播到顶层时终止程序并打印堆栈。',
    related: ['exception-hierarchy', 'exception-chaining'],
  },
  {
    id: 'exception-hierarchy',
    term: '异常层级',
    en: 'exception hierarchy',
    group: 'python',
    plain: '异常类之间的继承关系。捕获父类会连同它的子类一起接住。',
    formal:
      '以 BaseException 为根的类树。SystemExit、KeyboardInterrupt、GeneratorExit 直接继承 BaseException;业务异常继承 Exception。except 按类型及其子类匹配,因此子类分支必须写在父类之前。',
    related: ['exception'],
    source: {
      title: 'Python 官方文档 · 内置异常',
      url: 'https://docs.python.org/zh-cn/3/library/exceptions.html',
    },
  },
  {
    id: 'exception-chaining',
    term: '异常链',
    en: 'exception chaining',
    group: 'python',
    plain: '转换错误类型时,把原异常保留下来,避免丢失最初的失败原因与堆栈。',
    formal:
      'raise New from old 把 old 写入新异常的 __cause__;在 except 块中抛出而未写 from 时,原异常写入 __context__。traceback 会依次显示两者;from None 可显式切断。',
    related: ['exception', 'exception-hierarchy'],
  },
  {
    id: 'context-manager',
    term: '上下文管理器',
    en: 'context manager',
    group: 'python',
    plain: '声明"进入时做什么、退出时怎么清理"的对象,配合 with 使用。',
    formal:
      '实现 __enter__ 与 __exit__ 的对象。__enter__ 的返回值绑定给 as 变量,__exit__ 接收异常三元组,返回真值表示压制异常。contextlib.contextmanager 可用生成器实现,ExitStack 用于动态登记多个上下文。',
    related: ['exception', 'decorator'],
    source: {
      title: 'Python 官方文档 · contextlib',
      url: 'https://docs.python.org/zh-cn/3/library/contextlib.html',
    },
  },
  {
    id: 'module',
    term: '模块',
    en: 'module',
    group: 'python',
    plain: '一个 .py 文件就是一个模块,里面的顶层名字构成模块的命名空间。',
    formal:
      '由导入系统加载并执行的 Python 源文件(或其他加载器支持的格式),执行结果是一个模块对象,缓存在 sys.modules。模块的 __name__ 在导入时是模块名,作为脚本运行时是 "__main__"。',
    related: ['package', 'namespace', 'import-system'],
  },
  {
    id: 'package',
    term: '包',
    en: 'package',
    group: 'python',
    plain: '把多个模块组织进目录的结构,用点号分层,如 a.b.c。',
    formal:
      '包含 __init__.py 的目录是常规包,执行导入时先执行 __init__;PEP 420 允许没有 __init__.py 的命名空间包,把多个目录合并到同一包名下。',
    related: ['module', 'import-system', 'namespace'],
  },
  {
    id: 'import-system',
    term: '导入系统',
    en: 'import system',
    group: 'python',
    plain: '找到模块、执行它、把结果缓存起来的整套机制。import 不只是读文件。',
    formal:
      'import 依次经过查找器(sys.meta_path)、加载器与缓存(sys.modules)。查找路径来自 sys.path,由脚本目录、PYTHONPATH 与 site-packages 组成。同一模块只执行一次。',
    related: ['module', 'package'],
    source: {
      title: 'Python 语言参考 · 导入系统',
      url: 'https://docs.python.org/zh-cn/3/reference/import.html',
    },
  },
  {
    id: 'virtual-environment',
    term: '虚拟环境',
    en: 'virtual environment',
    group: 'python',
    plain: '给单个项目使用的独立解释器目录,有自己的 site-packages,包互不干扰。',
    formal:
      '由 venv 模块创建的目录,含独立 site-packages 与 pyvenv.cfg。激活后 python/pip 指向环境内可执行文件,sys.prefix 指向环境根;不复制解释器二进制,仅通过配置引用基础解释器。',
    related: ['import-system', 'module'],
    source: {
      title: 'Python 官方文档 · venv',
      url: 'https://docs.python.org/zh-cn/3/library/venv.html',
    },
  },
  {
    id: 'type-hint',
    term: '类型提示',
    en: 'type hint / annotation',
    group: 'python',
    plain: '写在变量、参数、返回值后面的类型标注,供静态检查器与 IDE 使用,运行时不强制。',
    formal:
      '以注解语法记录的类型信息,保存在函数的 __annotations__ 与类的 __annotations__ 中。PEP 484 起由 mypy、pyright 等工具在运行前检查;延迟求值(PEP 563 / 649)会改变注解的解析时机。',
    misread: '以为写了类型注解,运行时就会拒绝错误类型的实参。注解不会自动校验,校验要靠 isinstance 或 Pydantic 之类的边界库。',
    related: ['protocol', 'value'],
    source: {
      title: 'PEP 484 · 类型提示',
      url: 'https://peps.python.org/pep-0484/',
    },
  },
  {
    id: 'serialization',
    term: '序列化',
    en: 'serialization',
    group: 'python',
    plain: '把内存里的对象转成可存储、可传输的字节流或文本,需要时再还原。',
    formal:
      '序列化把对象图编码为字节或文本,反序列化按同一格式还原。json 面向跨语言交换,csv 面向表格,pickle 面向 Python 内部对象且反序列化会执行代码,不可加载不可信数据。',
    related: ['value', 'mutable-immutable'],
    source: {
      title: 'Python 官方文档 · json',
      url: 'https://docs.python.org/zh-cn/3/library/json.html',
    },
  },
  {
    id: 'timezone',
    term: '时区',
    en: 'timezone',
    group: 'python',
    plain: '同一个时刻在不同地区显示成不同钟点,时区描述的就是这个偏移与夏令时规则。',
    formal:
      'datetime 的 tzinfo 子类。固定偏移用 datetime.timezone,带夏令时规则的时区用 zoneinfo.ZoneInfo 与 IANA 时区名。aware 时间带 tzinfo,naive 时间不带,两者比较会抛 TypeError。',
    related: ['value', 'mutable-immutable'],
    source: {
      title: 'Python 官方文档 · zoneinfo',
      url: 'https://docs.python.org/zh-cn/3/library/zoneinfo.html',
    },
  },
  {
    id: 'regular-expression',
    term: '正则表达式',
    en: 'regular expression',
    aliases: ['正则'],
    group: 'python',
    plain: '用一套元字符描述文本模式,用来查找、校验与替换字符串。',
    formal:
      '由元字符、字符类、量词与分组构成的形式化模式,re 模块提供编译与匹配。它适合线性结构文本,不适合嵌套结构;嵌套量词可能引发灾难性回溯。',
    related: ['module', 'value'],
    source: {
      title: 'Python 官方 howto · 正则表达式',
      url: 'https://docs.python.org/zh-cn/3/howto/regex.html',
    },
  },
  {
    id: 'logging',
    term: '日志',
    en: 'logging',
    group: 'python',
    plain: '按级别记录程序运行信息,可以输出到控制台、文件或远端,替代散落的 print。',
    formal:
      'logging 模块以 logger 树组织记录,级别从 DEBUG 到 CRITICAL;handler 决定输出目标,formatter 决定格式,记录沿父级传播直到 root。库代码只声明 logger,由应用统一配置。',
    related: ['module', 'exception'],
    source: {
      title: 'Python 官方文档 · logging',
      url: 'https://docs.python.org/zh-cn/3/library/logging.html',
    },
  },
  {
    id: 'gil',
    term: '全局解释器锁',
    en: 'GIL / Global Interpreter Lock',
    aliases: ['GIL'],
    group: 'python',
    plain: 'CPython 里的一把全局锁:同一时刻只允许一个线程执行 Python 字节码。',
    formal:
      'CPython 解释器级的互斥锁,用于保护引用计数与解释器状态。线程在阻塞 IO、time.sleep 与部分 C 扩展调用时会释放 GIL;因此 IO 密集多线程有效,CPU 密集的纯 Python 多线程无法并行。PEP 703 的 free-threading 为实验性可选构建。',
    related: ['thread', 'process', 'runtime'],
    source: {
      title: 'Python 官方 wiki · GIL',
      url: 'https://wiki.python.org/moin/GlobalInterpreterLock',
    },
  },
  {
    id: 'thread',
    term: '线程',
    en: 'thread',
    group: 'python',
    plain: '同一进程内共享内存的执行单元,切换开销小,但受 GIL 限制。',
    formal:
      '由 threading 模块创建的执行单元,共享进程地址空间与解释器状态。标准 CPython 下同一时刻只有一个线程执行字节码;共享可变状态仍需 Lock 等同步原语,因为复合操作不是原子的。',
    related: ['gil', 'process'],
    source: {
      title: 'Python 官方文档 · threading',
      url: 'https://docs.python.org/zh-cn/3/library/threading.html',
    },
  },
  {
    id: 'process',
    term: '进程',
    en: 'process',
    group: 'python',
    plain: '拥有独立解释器与内存空间的执行单元,能真正并行,但与其它进程不能直接共享对象。',
    formal:
      '由 multiprocessing 创建,拥有独立的 Python 解释器与地址空间,因此绕过 GIL 实现 CPU 并行。启动需重新导入模块(Windows 为 spawn),跨进程数据需序列化,通过 Queue、Pipe、共享内存等机制通信。',
    related: ['thread', 'gil', 'serialization'],
    source: {
      title: 'Python 官方文档 · multiprocessing',
      url: 'https://docs.python.org/zh-cn/3/library/multiprocessing.html',
    },
  },
  {
    id: 'event-loop',
    term: '事件循环',
    en: 'event loop',
    group: 'python',
    plain: 'asyncio 的单线程调度器:执行就绪协程,等待 IO,完成后再把协程恢复。',
    formal:
      '由 asyncio 管理的调度循环,维护就绪队列与 IO 监听。协程在 await 处让出控制权,循环转而执行其他任务;任何同步阻塞调用都会独占循环线程,使全部协程停摆。asyncio.run 负责创建与关闭循环。',
    related: ['coroutine', 'thread'],
    source: {
      title: 'Python 官方文档 · asyncio',
      url: 'https://docs.python.org/zh-cn/3/library/asyncio.html',
    },
  },
  {
    id: 'pyproject',
    term: 'pyproject.toml',
    en: 'pyproject',
    group: 'python',
    plain: 'Python 项目的统一配置文件,声明元数据、依赖、命令入口与工具配置。',
    formal:
      'PEP 518 引入的项目配置文件。[project] 描述元数据与依赖,[build-system] 指定构建后端,[project.scripts] 生成命令入口,[tool.*] 承载 ruff、mypy、pytest 等配置。依赖声明写版本范围,精确版本由锁文件负责。',
    related: ['module', 'virtual-environment'],
    source: {
      title: 'Python 官方文档 · 编写 pyproject.toml',
      url: 'https://packaging.python.org/zh-cn/latest/guides/writing-pyproject-toml/',
    },
  },
  {
    id: 'pytest',
    term: 'pytest',
    en: 'pytest',
    group: 'python',
    plain: 'Python 最常用的测试框架,用普通 assert 断言,fixture 提供依赖注入,参数化覆盖多组输入。',
    formal:
      '按文件名 test_*.py、函数名 test_* 发现用例;通过 assert 重写显示表达式中间值。fixture 以函数参数名注入并管理准备与清理,parametrize 为每组参数生成独立用例。',
    related: ['fixture', 'exception'],
    source: {
      title: 'pytest 官方文档',
      url: 'https://docs.pytest.org/en/stable/',
    },
  },
  {
    id: 'fixture',
    term: 'fixture',
    en: 'fixture',
    group: 'python',
    plain: 'pytest 里负责准备测试数据与资源的函数,测试函数通过参数名声明使用它。',
    formal:
      '带有 @pytest.fixture 装饰的函数,可按 function/class/module/session 作用域执行。yield 之前为准备、之后为清理,即使测试失败也会执行;可依赖其他 fixture,放在 conftest.py 中可跨目录共享。',
    related: ['pytest', 'exception'],
    source: {
      title: 'pytest 官方文档 · fixture',
      url: 'https://docs.pytest.org/en/stable/how-to/fixtures.html',
    },
  },
  {
    id: 'ndarray',
    term: 'ndarray',
    en: 'N-dimensional array',
    aliases: ['numpy 数组'],
    group: 'python',
    plain: 'numpy 的核心数据结构:连续内存上的一整块同类型元素,带形状与维度信息。',
    formal:
      '由形状(shape)、元素类型(dtype)与步长(strides)描述的连续内存块。基本切片返回视图,布尔与花式索引返回副本;运算按元素进行并支持广播。',
    related: ['vectorization', 'view-and-copy'],
    source: {
      title: 'numpy 官方文档 · 快速入门',
      url: 'https://numpy.org/doc/stable/user/quickstart.html',
    },
  },
  {
    id: 'vectorization',
    term: '向量化',
    en: 'vectorization',
    group: 'python',
    plain: '把逐元素运算写成整体数组运算,让循环在底层 C 代码里执行。',
    formal:
      '对 ndarray 的运算由 numpy 在 C 层按元素循环执行,避免 Python 解释器的逐条开销,并利用连续内存与 SIMD 指令。向量化表达通常比 Python for 循环快一到两个数量级。',
    related: ['ndarray', 'lazy-evaluation'],
    source: {
      title: 'numpy 官方文档 · 广播',
      url: 'https://numpy.org/doc/stable/user/basics.broadcasting.html',
    },
  },
  {
    id: 'dataframe',
    term: 'DataFrame',
    en: 'DataFrame',
    group: 'python',
    plain: 'pandas 的二维表:有行索引与列名,每列可以是不同类型。',
    formal:
      'pandas 的二维带标签数据结构,每列是一个 Series 并共享行索引。选择用 loc(标签)与 iloc(位置);运算按索引对齐;链式赋值可能触发 SettingWithCopyWarning,修改原表应单步 loc 赋值或显式 copy。',
    related: ['ndarray', 'view-and-copy'],
    source: {
      title: 'pandas 官方文档 · 快速入门',
      url: 'https://pandas.pydata.org/docs/user_guide/10min.html',
    },
  },
]
