import type { Term } from './types'

/**
 * 通用:不管写哪种语言都会碰到的底层概念。
 * 顺序是刻意的,从"最基本的三样东西"往下排。
 */
export const commonTerms: Term[] = [
  {
    id: 'object',
    term: '对象',
    en: 'object',
    group: 'common',
    plain:
      '程序里一个"有身份、有类型、有内容"的东西。数字 1、字符串 "hi"、一个列表、一个函数，全都是对象。',
    formal:
      '运行期存在的一块数据实体，带三个属性:身份（identity，创建后不变）、类型（type，决定它能参与哪些操作）、值（value，可能变也可能不变）。',
    related: ['identity', 'type', 'value'],
    source: { title: 'Python 语言参考 · 数据模型', url: 'https://docs.python.org/zh-cn/3/reference/datamodel.html' },
  },
  {
    id: 'identity',
    term: '身份',
    en: 'identity',
    group: 'common',
    plain:
      '问的是"是不是同一个东西"。两个人同名同姓长得还像，也可能是两个人 —— 身份管的就是这件事，跟内容像不像无关。',
    formal:
      '对象在内存中的唯一标识，在对象的整个存活期内保持不变。Python 里 id() 返回它、is 比较它;Java 里 == 对引用类型比较它。',
    misread: '以为身份和值是一回事。两个列表内容完全一样，值相等，但仍是两个对象、两个身份。',
    related: ['value', 'reference'],
  },
  {
    id: 'value',
    term: '值',
    en: 'value',
    group: 'common',
    linkable: false,
    plain: '问的是"内容一不一样"。两份内容相同的名单是同一个值，但可以是两张纸。',
    formal: '对象所承载的数据内容。值相等（== / equals）与身份相同（is）是两件独立的事。',
    related: ['identity', 'mutable-immutable'],
  },
  {
    id: 'type',
    term: '类型',
    en: 'type',
    group: 'common',
    linkable: false,
    plain: '这个东西属于哪一类，决定了它能干什么、不能干什么。列表能 append，数字不能。',
    formal: '决定对象支持哪些操作、如何解释其内存表示的元数据。对象一旦创建，类型不会改变。',
    related: ['object', 'mutable-immutable'],
  },
  {
    id: 'variable',
    term: '变量',
    en: 'variable',
    aliases: ['变量盒子'],
    group: 'common',
    plain:
      '一个名字，这个名字贴在某个对象上。赋值就是把这个名字挪到另一个对象上去，原来那个对象一点没动。',
    formal:
      '命名空间中的一个条目，其值为对某个对象的引用。重新赋值只改变这个条目的指向，不修改对象本身。',
    misread: '把变量想成"装东西的盒子"，于是以为 b = a 是"把 a 的内容倒进 b"，进而推不出"改 b 会影响 a"。',
    related: ['binding', 'reference', 'namespace'],
  },
  {
    id: 'binding',
    term: '绑定',
    en: 'binding',
    group: 'common',
    plain: '名字与对象之间的关联。a = [1, 2] 就是让名字 a 指向那个列表对象。',
    formal: '名字与实体之间的关联。绑定可以被重新建立（重新赋值），也可以被作用域限制可见范围。',
    related: ['variable', 'namespace'],
  },
  {
    id: 'reference',
    term: '引用',
    en: 'reference',
    group: 'common',
    plain: '指向对象的引用。复制引用后，两个名字仍指向同一个对象。',
    formal:
      '指向对象的间接值，通过它访问目标对象。复制引用不复制对象，因此经任一引用做的就地修改，对另一方都可见。',
    related: ['identity', 'in-place', 'pass-by-value'],
  },
  {
    id: 'namespace',
    term: '命名空间',
    en: 'namespace',
    group: 'common',
    plain: '名字的存放处。同一个名字出现在两个命名空间里，是两个互不干扰的名字，不会相互覆盖。',
    formal:
      '名字到对象的映射表。Python 里模块级名字在 globals()、函数内名字在 locals();Java 里包名承担类似的分隔作用。',
    related: ['binding', 'variable'],
  },
  {
    id: 'protocol',
    term: '协议',
    en: 'protocol',
    group: 'common',
    plain:
      '一套约定好的方法或行为。对象只要满足约定，就能被其他代码统一调用 —— 双方无需知道彼此的具体类型。',
    formal:
      '由一组方法或行为约定构成的接口规范。实现方满足约定即可被统一调用，调用方无需关心具体类型。Python 的迭代协议、Java 的 equals 约定都属于这一类。',
    related: ['syntax-sugar', 'iteration-protocol'],
  },
  {
    id: 'syntax-sugar',
    term: '语法糖',
    en: 'syntactic sugar',
    group: 'common',
    plain: '更简洁的书写形式。它不带来新能力，只是缩短常见写法，展开后等价于更基础的结构。',
    formal:
      '不引入新语义、只提供更简洁书写的语法形式，展开后等价于更基础的结构。例如 for x in xs 展开为 iter() / next() 循环。',
    misread: '以为语法糖背后有额外机制。它只是简写，理解展开后的形式就够了。',
    related: ['protocol', 'runtime'],
  },
  {
    id: 'runtime',
    term: '运行时',
    en: 'runtime',
    group: 'common',
    plain: '程序实际执行的那段时间，以及支撑执行的环境。很多问题只在运行时才暴露。',
    formal:
      '程序执行期间由语言实现提供的执行环境与支撑系统（内存管理、类型信息、标准库等）。与之相对的是编译期。',
    related: ['compile-time', 'garbage-collection'],
  },
  {
    id: 'compile-time',
    term: '编译期与运行期',
    en: 'compile time / runtime',
    aliases: ['编译期', '运行期'],
    group: 'common',
    plain:
      '源码被翻译为目标代码的阶段叫编译期，程序实际执行的阶段叫运行期。同一句代码在两个阶段的结果可能不同，这是很多反直觉现象的来源。',
    formal:
      '编译期是源码被翻译为目标代码的阶段，常量折叠、类型检查在此发生;运行期是程序执行的阶段，变量取值、动态派发在此发生。',
    related: ['constant-folding', 'runtime'],
  },
  {
    id: 'constant-folding',
    term: '常量折叠',
    en: 'constant folding',
    group: 'common',
    plain:
      '编译器在编译期把能确定的表达式先计算好。写 "hel" + "lo"，编译产物里已经是 "hello" —— 与直接写 "hello" 等价。',
    formal:
      '编译期对由常量构成的表达式求值并替换为结果，属于常量传播的一种。折叠产生的是同一个常量对象，因此可能与运行期拼接的结果身份不同。',
    related: ['compile-time'],
  },
  {
    id: 'literal',
    term: '字面量',
    en: 'literal',
    group: 'common',
    plain: '代码里直接写出来的那个值。42、"hello"、[1, 2, 3] 都是字面量。',
    formal:
      '源码中直接表示固定值的记法。内容相同的字面量在不同语言里可能被复用（驻留）也可能每次新建，这直接决定了 == 的结果。',
    related: ['string-pool', 'constant-folding'],
  },
  {
    id: 'hashing',
    term: '哈希',
    en: 'hashing',
    group: 'common',
    plain:
      '把任意内容映射为一个固定长度的数字，用来快速定位。基本约定:内容相同，算出的数字必须相同。',
    formal:
      '把对象映射为固定长度整数（哈希值）的函数。约定:equals 相等则哈希值必须相等;不同对象哈希值相同称为哈希冲突，是允许的。',
    related: ['hash-table', 'hash-collision'],
  },
  {
    id: 'hash-table',
    term: '哈希表',
    en: 'hash table',
    aliases: ['散列表'],
    group: 'common',
    plain: '用哈希算出的位置直接定位元素，不必逐个遍历。平均情况下一次定位，因此查找很快。',
    formal:
      '通过哈希函数把键映射到桶的字典结构。平均查找 O(1)、最坏 O(n)，需要处理哈希冲突并在装载因子过高时扩容。',
    related: ['hashing', 'hash-collision', 'big-o'],
  },
  {
    id: 'stack-and-heap',
    term: '栈与堆',
    en: 'stack and heap',
    aliases: ['调用栈'],
    group: 'common',
    plain:
      '栈保存当前执行位置与局部变量，随函数调用自动分配与释放;堆存放创建的对象，由垃圾回收器管理。',
    formal:
      '栈是后进先出的调用帧区域，存放局部变量与返回地址，随调用自动分配释放;堆是动态内存区域，对象在此分配，由垃圾回收或手动释放管理。',
    related: ['call-stack', 'garbage-collection'],
  },
  {
    id: 'garbage-collection',
    term: '垃圾回收',
    en: 'garbage collection',
    group: 'common',
    plain: '不再被引用的对象，由运行时自动回收，不需要手动释放。',
    formal:
      '自动识别并回收不再可达的对象所占内存的机制。Python 用引用计数加循环检测，Java 用可达性分析。',
    related: ['reference-counting', 'stack-and-heap'],
  },
  {
    id: 'pass-by-value',
    term: '值传递与引用传递',
    en: 'pass-by-value / pass-by-reference',
    aliases: ['值传递', '引用传递'],
    group: 'common',
    plain:
      '函数调用时参数的传递方式:复制一份传入，还是把原对象直接传入。Python 和 Java 都是复制一份 —— 只不过复制的可能是指向对象的引用。',
    formal:
      '值传递复制实参的值，引用传递传递实参本身。Java 与 Python 均为值传递;对引用类型而言复制的是引用，所以被调方就地修改对象调用方看得见，重新绑定形参则看不见。',
    misread: '看到"函数里改了列表，外面也变了"就以为 Java / Python 是引用传递。修改的始终是对象，引用本身没有改变。',
    related: ['reference', 'in-place'],
  },
  {
    id: 'in-place',
    term: '就地修改',
    en: 'in-place',
    group: 'common',
    plain: '直接在原对象上修改，不创建新对象。因此持有该对象的其他引用也会看到变化。',
    formal:
      '在原对象上直接修改内容的操作，执行完对象还是原来那一个。这类方法通常返回 None / void，以免调用方误以为拿到了新对象。',
    related: ['reference', 'mutable-immutable'],
  },
]
