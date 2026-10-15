// Java 面试题库。
//
// 顺序按"语言基础 → 怎么组织代码 → 怎么跑起来"排:先是相等性与基本类型这条
// 最容易答错的线,再是 String、集合、面向对象,最后是异常、泛型、并发与 JVM。
// 第一关和站内 java/equals-and-identity 讲的是同一条线,题目里能挂 link 的都挂上了。

import type { Level } from './types'

export const javaLevels: Level[] = [
  // ------------------------------------------------------------------
  {
    id: 'java-equality',
    name: '相等性与哈希',
    intro: '== 与 equals 的分工,以及常量池、装箱缓存把这条规则变绕的地方。',
    questions: [
      {
        id: 'j-eq-1',
        kind: 'term2def',
        prompt: 'Java 里 `==` 对两个引用类型变量比较的是:',
        choices: [
          { text: '两个引用是否指向同一个对象(身份)', correct: true },
          { text: '两个对象的内容是否相等', correct: false },
          { text: '两个对象的类型是否相同', correct: false },
          { text: '两个对象的哈希值是否相同', correct: false },
        ],
        explain:
          '引用类型的 `==` 比身份。要比内容得用 equals,而 equals 的默认实现恰恰就是 `==`,不重写就白用。',
        link: { term: 'reference-type', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-2',
        kind: 'judge',
        prompt: '对象不重写 equals 时,`a.equals(b)` 与 `a == b` 结果一致。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'Object.equals 的默认实现就是 `this == obj`。所以"equals 天生比内容"是最常见的误解。',
        link: { term: 'equals', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-3',
        kind: 'scenario',
        prompt: '`Integer a = 127; Integer b = 127; a == b` 与把 127 换成 200 的结果分别是:',
        choices: [
          { text: '127 时 true,200 时 false', correct: true },
          { text: '两者都 true', correct: false },
          { text: '两者都 false', correct: false },
          { text: '127 时 false,200 时 true', correct: false },
        ],
        explain:
          'Integer.valueOf 缓存 -128 到 127,区间内复用同一实例;区间外每次新建。所以包装类型的 `==` 结果没有保证,要比内容一律用 equals。',
        link: { term: 'autoboxing', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-4',
        kind: 'judge',
        prompt: '`String s1 = "ab"; String s2 = "a" + "b";` 之后 s1 == s2 成立。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '两边都是编译期常量,折叠成同一个字面量 "ab",共同驻留常量池。把 "a" 换成运行期得到的字符串,折叠就不成立了。',
        link: { term: 'string-pool', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-5',
        kind: 'scenario',
        prompt: '`new String("ab") == new String("ab")` 的结果是:',
        choices: [
          { text: 'false,new 强制新建两个对象', correct: true },
          { text: 'true,内容相同常量池会复用', correct: false },
          { text: '编译报错', correct: false },
          { text: '取决于 JVM 版本', correct: false },
        ],
        explain:
          'new String(...) 明确要求新对象,不走常量池复用。要比内容用 equals,或者显式 intern()。',
        link: { term: 'intern', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-6',
        kind: 'term2def',
        prompt: '只重写 equals 不重写 hashCode 的后果是:',
        choices: [
          { text: '内容相等的对象哈希不同,HashMap / HashSet 去不了重', correct: true },
          { text: '编译报错', correct: false },
          { text: '运行抛 NullPointerException', correct: false },
          { text: '没有后果,equals 优先被调用', correct: false },
        ],
        explain:
          '哈希表先按哈希找桶,再在桶里用 equals 认人。哈希不同就落进不同桶,equals 根本没机会被调用。',
        link: { term: 'hashcode', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-7',
        kind: 'judge',
        prompt: '`new BigDecimal("1.0").equals(new BigDecimal("1.00"))` 返回 true。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'BigDecimal.equals 连 scale(小数位数)一起比,1.0 与 1.00 不相等。按数值比较要用 compareTo(...) == 0。这是金额场景的经典坑。',
        link: { term: 'bigdecimal', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-eq-8',
        kind: 'term2def',
        prompt: '枚举值之间用 `==` 比较是安全的,原因是:',
        choices: [
          { text: '每个常量在类加载时只创建一个实例', correct: true },
          { text: '枚举重写了 equals 和 hashCode', correct: false },
          { text: '编译器把枚举替换成字符串', correct: false },
          { text: '枚举是基本类型', correct: false },
        ],
        explain:
          'enum 常量全局唯一,引用相等与逻辑相等天然一致,所以 `==` 又快又对。Effective Java 也建议这么写。',
        link: { term: 'enum', see: 'java/equals-and-identity' },
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-primitives',
    name: '基本类型与包装',
    intro: '八种基本类型、装箱拆箱的时机,以及默认值那些细节。',
    questions: [
      {
        id: 'j-pri-1',
        kind: 'term2def',
        prompt: 'Java 的基本类型有几种:',
        choices: [
          { text: '8 种', correct: true },
          { text: '4 种', correct: false },
          { text: '16 种', correct: false },
          { text: '数量随 JDK 版本增加', correct: false },
        ],
        explain:
          'byte / short / int / long / float / double / char / boolean。它们直接持有值,`==` 比的就是值。',
        link: { term: 'primitive-type' },
      },
      {
        id: 'j-pri-2',
        kind: 'judge',
        prompt: '自动装箱只发生在赋值给包装类型或集合元素的场景,算术运算一定走基本类型。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '包装类型参与算术会先拆箱,例如 `Integer a = 1; a++;` 实际是拆箱、自增、再装箱。混用容易在拆箱时踩到 NPE。',
        link: { term: 'autoboxing' },
      },
      {
        id: 'j-pri-3',
        kind: 'scenario',
        prompt: '`Integer x = null; int y = x;` 会发生什么:',
        choices: [
          { text: '拆箱时抛 NullPointerException', correct: true },
          { text: 'y 变成 0', correct: false },
          { text: '编译报错', correct: false },
          { text: 'y 变成 null', correct: false },
        ],
        explain:
          '拆箱会调用 xxxValue(),对 null 调用实例方法当场 NPE。包装类型默认值就是 null,别把它当 0 用。',
        link: { term: 'null', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-pri-4',
        kind: 'term2def',
        prompt: '`long` 与 `Long` 的关键差别是:',
        choices: [
          { text: '前者直接存值,后者存引用且可为 null', correct: true },
          { text: '前者精度更高', correct: false },
          { text: '后者取值范围更大', correct: false },
          { text: '前者是对象,后者是值', correct: false },
        ],
        explain:
          '基本类型省掉对象头开销、也没有 null;包装类型能进泛型集合、能表达"没有值"。数据库实体字段常用包装类型就是这个原因。',
        link: { term: 'wrapper-class' },
      },
      {
        id: 'j-pri-5',
        kind: 'judge',
        prompt: '`float a = 0.1f; double b = 0.1;` 两者与十进制的 0.1 都完全相等。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '二进制浮点表示不了大部分十进制小数,0.1 存进去就是近似值。要精确小数用 BigDecimal,比较也要用 compareTo。',
        link: { term: 'bigdecimal', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-pri-6',
        kind: 'scenario',
        prompt: '`byte b = 100; b += 1000;` 的结果是:',
        choices: [
          { text: '溢出回绕,-24', correct: true },
          { text: '编译报错', correct: false },
          { text: '1100', correct: false },
          { text: '抛 ArithmeticException', correct: false },
        ],
        explain:
          'byte 范围 -128~127,超出部分按二进制截断回绕。复合赋值自带隐式强转所以编译能过;写成 `b = b + 1000` 才会因为 int 到 byte 的强转报错。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-string',
    name: 'String 与不可变性',
    intro: '为什么不可变、常量池怎么复用、拼接什么时候会踩性能。',
    questions: [
      {
        id: 'j-str-1',
        kind: 'judge',
        prompt: 'String 对象创建之后内容不能再改,所谓"修改"都是返回新对象。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'String 的 value 字段是 final 的字节数组。这个设计换来了缓存哈希、安全共享、常量池复用,代价是拼接要新建对象。',
      },
      {
        id: 'j-str-2',
        kind: 'term2def',
        prompt: '循环里反复 `s += x` 的主要问题是:',
        choices: [
          { text: '每次都新建字符串并拷贝内容,总体接近 O(n²)', correct: true },
          { text: '会抛 OutOfMemoryError', correct: false },
          { text: '编译器不允许这么写', correct: false },
          { text: '字符串内容会丢失', correct: false },
        ],
        explain:
          '拼接产生新对象并复制旧内容,循环 n 次就是 n² 量级的拷贝。要用 StringBuilder(单线程)或 StringBuffer(多线程)。',
      },
      {
        id: 'j-str-3',
        kind: 'judge',
        prompt: '`"a" + 变量 + "b"` 在编译期会被折叠成一个字面量。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '只有两边都是编译期常量才折叠。掺了变量之后,JVM 多半会优化成 StringBuilder 的链式 append,但不会再回到常量池。',
        link: { term: 'constant-folding', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-str-4',
        kind: 'scenario',
        prompt: '大量短字符串拼接后要当 Map 的键,想省内存。合适的做法是:',
        choices: [
          { text: '拼接结果调一次 intern(),让相同内容共用一份', correct: true },
          { text: '把每个片段都 intern 一遍', correct: false },
          { text: '改用 char[] 自己管', correct: false },
          { text: '用 String.format 拼接', correct: false },
        ],
        explain:
          'intern() 让内容相同的字符串在常量池里只留一份,重复键的内存能省下来。代价是查找开销与驻留,只适合键这种高重复场景。',
        link: { term: 'intern', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-str-5',
        kind: 'judge',
        prompt: 'String 适合当 HashMap 的键,一个原因是它的 hashCode 有缓存。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'String 把算过的哈希存在字段里,重复查找不用重算。不可变性正是这个缓存能成立的前提。',
        link: { term: 'hashcode', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-str-6',
        kind: 'term2def',
        prompt: '`StringBuilder` 与 `StringBuffer` 的差别是:',
        choices: [
          { text: '前者非线程安全但更快,后者方法带 synchronized', correct: true },
          { text: '前者不可变,后者可变', correct: false },
          { text: '前者用于拼接,后者用于拆分', correct: false },
          { text: '前者是新 API,后者已废弃', correct: false },
        ],
        explain:
          '两者都可变,差别只在同步。单线程用 StringBuilder;多线程共享同一个缓冲区才需要 StringBuffer,更常见的做法是每个线程一个。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-collections',
    name: '集合框架',
    intro: 'List / Set / Map 怎么选,以及 HashMap 的底层在问什么。',
    questions: [
      {
        id: 'j-col-1',
        kind: 'scenario',
        prompt: '要在中间位置频繁插入删除、随机访问很少。选哪种 List:',
        choices: [
          { text: 'LinkedList', correct: true },
          { text: 'ArrayList', correct: false },
          { text: 'Vector', correct: false },
          { text: 'CopyOnWriteArrayList', correct: false },
        ],
        explain:
          'LinkedList 改指针就能插删;ArrayList 在中间操作要移动后续元素。反过来随机访问多就用 ArrayList,它按下标直接定位。',
      },
      {
        id: 'j-col-2',
        kind: 'judge',
        prompt: 'HashMap 允许 key 为 null,Hashtable 不允许。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'HashMap 把 null 键放在 0 号桶特殊处理;Hashtable 直接抛 NPE。这也是 HashMap 取代 Hashtable 的原因之一。',
        link: { term: 'hash-table' },
      },
      {
        id: 'j-col-3',
        kind: 'term2def',
        prompt: 'HashMap 在 JDK 8 之后,桶内链表长度超过多少会转成红黑树:',
        choices: [
          { text: '8', correct: true },
          { text: '16', correct: false },
          { text: '4', correct: false },
          { text: '由容量自动决定,没有固定值', correct: false },
        ],
        explain:
          '链表长度到 8 转红黑树,退到 6 再转回链表。转树是为了把极端冲突下的 O(n) 查找压回 O(log n)。',
        link: { term: 'hash-collision', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-col-4',
        kind: 'scenario',
        prompt: '多个线程共享同一个 HashMap 且并发写,可能出现的后果是:',
        choices: [
          { text: '数据错乱,严重时死循环或丢更新', correct: true },
          { text: '抛 ConcurrentModificationException', correct: false },
          { text: '自动加锁,行为正确但变慢', correct: false },
          { text: '写操作被静默丢弃', correct: false },
        ],
        explain:
          'HashMap 没有同步。并发写要用 ConcurrentHashMap,它用分段锁 / synchronized 桶,读大多无锁。',
      },
      {
        id: 'j-col-5',
        kind: 'term2def',
        prompt: '`HashSet` 的去重依赖的是:',
        choices: [
          { text: '元素的 hashCode 与 equals', correct: true },
          { text: '元素的 compareTo', correct: false },
          { text: '插入顺序的先后', correct: false },
          { text: '元素的 toString', correct: false },
        ],
        explain:
          'HashSet 内部就是个 HashMap,值放进 key。自定义对象要正确去重,equals 和 hashCode 必须成对重写。',
        link: { term: 'hashcode', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-col-6',
        kind: 'judge',
        prompt: '`TreeMap` 的键按自然顺序或比较器排序,因此不允许 null 键。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '排序要调用 compareTo,拿 null 去比就 NPE。HashMap 不排序,所以能收 null 键。',
      },
      {
        id: 'j-col-7',
        kind: 'scenario',
        prompt: '要一个"读多写极少"的集合,读不能被写阻塞。合适的选择是:',
        choices: [
          { text: 'CopyOnWriteArrayList', correct: true },
          { text: 'Collections.synchronizedList', correct: false },
          { text: 'ArrayList 加 synchronized 块', correct: false },
          { text: 'LinkedList', correct: false },
        ],
        explain:
          'CopyOnWrite 在读的时候不加锁,写的时候复制底层数组。读几乎零成本,写是 O(n),正好对上"读多写少"。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-oop',
    name: '面向对象',
    intro: '重载与重写的区别、抽象类与接口的分工、多态靠什么实现。',
    questions: [
      {
        id: 'j-oop-1',
        kind: 'term2def',
        prompt: '重载(overload)与重写(override)的关键区别是:',
        choices: [
          { text: '重载看参数列表,发生在编译期;重写看方法签名一致,发生在运行期', correct: true },
          { text: '重载发生在运行期,重写发生在编译期', correct: false },
          { text: '两者都发生在编译期', correct: false },
          { text: '重载只能用于静态方法', correct: false },
        ],
        explain:
          '重载是同一个类里名字相同、参数不同,按调用时的实参类型静态选定;重写是子类提供不同实现,运行期按实际对象类型动态分派。',
      },
      {
        id: 'j-oop-2',
        kind: 'judge',
        prompt: '重写方法时,返回值类型可以是父类方法的子类型。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '这叫协变返回类型(JDK 5 起支持)。访问修饰符只能放宽不能收紧,抛出的受检异常也只能更少或更窄。',
      },
      {
        id: 'j-oop-3',
        kind: 'term2def',
        prompt: 'Java 的多态运行时依赖:',
        choices: [
          { text: '虚方法表(vtable)与动态分派', correct: true },
          { text: '泛型擦除后的强制转换', correct: false },
          { text: '编译期的方法重载决策', correct: false },
          { text: '接口的默认方法', correct: false },
        ],
        explain:
          '非 private / static / final 的方法是虚方法,调用时按对象的实际类查虚方法表。这也是"父类引用指向子类对象"能工作的原因。',
      },
      {
        id: 'j-oop-4',
        kind: 'scenario',
        prompt: '有一组实现要共用字段和部分逻辑,同时要被 extends 继承。选:',
        choices: [
          { text: '抽象类', correct: true },
          { text: '接口', correct: false },
          { text: '枚举', correct: false },
          { text: 'final 类', correct: false },
        ],
        explain:
          '要带状态和实现就选抽象类。接口只定义契约(JDK 8 起可以有 default 方法),一个类能实现多个接口但只能继承一个类。',
      },
      {
        id: 'j-oop-5',
        kind: 'judge',
        prompt: '接口里的 default 方法被子类继承后,子类可以覆盖它。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'default 方法就是给老接口加新能力用的,子类可以覆盖,也可以用 `Interface.super.method()` 显式调用接口版本。',
      },
      {
        id: 'j-oop-6',
        kind: 'term2def',
        prompt: '`final` 关键字用在这三处的含义分别是:',
        choices: [
          { text: '类不可继承、方法不可重写、变量不可重新赋值', correct: true },
          { text: '类不可实例化、方法不可调用、变量不可读', correct: false },
          { text: '三者含义相同', correct: false },
          { text: '类不可序列化、方法不可同步、变量不可比较', correct: false },
        ],
        explain:
          'final 变量只是引用不能再指,对象内部照样能改。String 的不可变性正是靠 final 类加 final 字段共同保证的。',
      },
      {
        id: 'j-oop-7',
        kind: 'scenario',
        prompt: '`Object o = new ArrayList<>(); List l = o;` 的问题在于:',
        choices: [
          { text: '编译不过,Object 到 List 需要显式强转', correct: true },
          { text: '运行抛 ClassCastException', correct: false },
          { text: '运行抛 NullPointerException', correct: false },
          { text: '没问题,会自动向下转型', correct: false },
        ],
        explain:
          '向下转型必须显式写 `(List) o`。更稳的写法是直接用泛型声明变量,把强转留给编译器检查。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-exceptions',
    name: '异常体系',
    intro: '受检与非受检的分界、finally 的行为、常见处理手法。',
    questions: [
      {
        id: 'j-ex-1',
        kind: 'term2def',
        prompt: '受检异常(checked exception)的特点是:',
        choices: [
          { text: '编译器强制处理,不 catch 也不 throws 就编译不过', correct: true },
          { text: '一定来自程序 bug', correct: false },
          { text: '只能由 JVM 抛出', correct: false },
          { text: '不能用 try-catch 捕获', correct: false },
        ],
        explain:
          'IOException、SQLException 这类外部可恢复问题属于受检。RuntimeException 及其子类是非受检,通常是代码缺陷。',
      },
      {
        id: 'j-ex-2',
        kind: 'judge',
        prompt: '`NullPointerException` 与 `ArrayIndexOutOfBoundsException` 都是非受检异常。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '它们继承自 RuntimeException。按规范,非受检异常表示"本来可以避免的程序错误",该修代码而不是到处 catch。',
      },
      {
        id: 'j-ex-3',
        kind: 'scenario',
        prompt: 'try 块里 return,同时 finally 块里也 return,最终返回的是:',
        choices: [
          { text: 'finally 里的值,try 的返回值被丢掉', correct: true },
          { text: 'try 里的值,finally 的 return 被忽略', correct: false },
          { text: '编译报错', correct: false },
          { text: '抛 IllegalStateException', correct: false },
        ],
        explain:
          'finally 的 return 会覆盖 try 的返回路径,异常也会被冲掉。清理逻辑放 finally,返回值只写一处。',
      },
      {
        id: 'j-ex-4',
        kind: 'judge',
        prompt: 'try-with-resources 会在代码块结束后自动调用资源的 close()。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '资源实现 AutoCloseable 即可。它按声明相反顺序关闭,且关闭抛的异常会被压制成"被抑制异常",主异常不丢。',
      },
      {
        id: 'j-ex-5',
        kind: 'term2def',
        prompt: 'catch 块里 `throw new AppException("...", e)` 这种写法的好处是:',
        choices: [
          { text: '保留原始堆栈,定位时能看出根因', correct: true },
          { text: '让异常变成受检异常', correct: false },
          { text: '避免重复抛异常', correct: false },
          { text: '提高序列化性能', correct: false },
        ],
        explain:
          '把 cause 传进去,堆栈里会留下 "Caused by"。丢掉原始异常只留一句自定义消息,排查时最难的就是这种。',
      },
      {
        id: 'j-ex-6',
        kind: 'scenario',
        prompt: '`catch (Exception e)` 一把梭的问题主要是:',
        choices: [
          { text: '把编程错误也吞了,问题被藏起来', correct: true },
          { text: '性能明显下降', correct: false },
          { text: '会导致内存泄漏', correct: false },
          { text: '会让方法变成受检异常', correct: false },
        ],
        explain:
          '该修的空指针被吞掉,现场全丢。按异常类型分别处理,处理不了就往上抛,别在最外层统一吃干净。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-generics',
    name: '泛型',
    intro: '类型擦除是什么、通配符怎么用、以及它带来的限制。',
    questions: [
      {
        id: 'j-gen-1',
        kind: 'term2def',
        prompt: 'Java 的泛型在运行期的实际形态是:',
        choices: [
          { text: '类型擦除,运行期只剩原始类型', correct: true },
          { text: '每种实例化生成独立类', correct: false },
          { text: '编译期完全展开成具体类型', correct: false },
          { text: '运行期保留完整类型信息', correct: false },
        ],
        explain:
          '`List<String>` 运行期就是 List。这是为了兼容老代码,代价是拿不到具体类型参数,也不能 new T()。',
      },
      {
        id: 'j-gen-2',
        kind: 'judge',
        prompt: '`List<String>` 与 `List<Integer>` 在运行期是同一个类型。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '擦除之后都是 List。所以不能靠泛型做方法重载,`void f(List<String>)` 与 `void f(List<Integer>)` 会编译冲突。',
      },
      {
        id: 'j-gen-3',
        kind: 'term2def',
        prompt: '`List<? extends Number>` 表示:',
        choices: [
          { text: '元素是 Number 或它的子类,具体哪个未知', correct: true },
          { text: '元素只能是 Number', correct: false },
          { text: '可以往里 add 任意 Number', correct: false },
          { text: '和 List<Number> 等价', correct: false },
        ],
        explain:
          '上界通配符只能读不能写(除了 null)。要"既能读又能写"就用 `List<Number>` 本身。',
      },
      {
        id: 'j-gen-4',
        kind: 'scenario',
        prompt: '一个方法要同时接受 `List<Integer>` 和 `List<Double>`,签名该写:',
        choices: [
          { text: 'void f(List<? extends Number> list)', correct: true },
          { text: 'void f(List<Number> list)', correct: false },
          { text: 'void f(List<? super Number> list)', correct: false },
          { text: 'void f(List<?> list)', correct: false },
        ],
        explain:
          '`List<Number>` 收不下子类型参数(泛型不可变)。PECS 原则:生产者用 extends,消费者用 super。',
      },
      {
        id: 'j-gen-5',
        kind: 'judge',
        prompt: '泛型类型参数不能是基本类型,只能写包装类型。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '类型参数会被擦除成 Object,基本类型塞不进 Object。写 `List<int>` 编译不过,得用 `List<Integer>`。',
        link: { term: 'wrapper-class' },
      },
      {
        id: 'j-gen-6',
        kind: 'term2def',
        prompt: '`List<Object> lo = new ArrayList<String>();` 的结果是:',
        choices: [
          { text: '编译不过,泛型之间不具有继承关系', correct: true },
          { text: '编译通过,运行抛 ClassCastException', correct: false },
          { text: '编译通过,但 lo 只能读', correct: false },
          { text: '编译通过,String 会自动装箱成 Object', correct: false },
        ],
        explain:
          '`List<String>` 不是 `List<Object>` 的子类。数组是协变的,泛型不是 —— 这也是泛型更安全的原因。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-concurrency',
    name: '并发',
    intro: 'synchronized、volatile、线程池,以及 JUC 里那几个常用类。',
    questions: [
      {
        id: 'j-con-1',
        kind: 'term2def',
        prompt: '`synchronized` 保证的是:',
        choices: [
          { text: '同一时刻只有一个线程进入临界区,且修改互相可见', correct: true },
          { text: '方法执行更快', correct: false },
          { text: '线程一定按申请锁的顺序执行', correct: false },
          { text: '避免死锁', correct: false },
        ],
        explain:
          '它同时提供互斥与可见性:退出同步块前的修改会刷回主存。但它不保证公平性,也不防死锁。',
      },
      {
        id: 'j-con-2',
        kind: 'judge',
        prompt: '`volatile` 能保证复合操作(如 i++)的原子性。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'volatile 只保证可见性与禁止重排序,i++ 是"读-改-写"三步,照样会丢更新。要原子性用 AtomicInteger 或加锁。',
      },
      {
        id: 'j-con-3',
        kind: 'term2def',
        prompt: '`ConcurrentHashMap` 与 Hashtable 的关键差别是:',
        choices: [
          { text: '前者用更细的锁,读操作大多无锁,并发度更高', correct: true },
          { text: '前者允许 null 键值', correct: false },
          { text: '前者是同步的,后者不是', correct: false },
          { text: '前者性能更差但更安全', correct: false },
        ],
        explain:
          'Hashtable 给整个方法加锁,一把大锁全挡住。ConcurrentHashMap 按桶 / 节点加锁,读基本不阻塞,也不允许 null 键值。',
        link: { term: 'hash-table' },
      },
      {
        id: 'j-con-4',
        kind: 'scenario',
        prompt: '线程池的拒绝策略选 CallerRunsPolicy 时的行为是:',
        choices: [
          { text: '由提交任务的线程自己执行该任务', correct: true },
          { text: '直接抛 RejectedExecutionException', correct: false },
          { text: '静默丢弃任务', correct: false },
          { text: '把任务放进无界队列等待', correct: false },
        ],
        explain:
          '调用方自己跑,天然形成背压:提交慢下来,队列就不再涨。适合不能丢任务又不想抛异常的场景。',
      },
      {
        id: 'j-con-5',
        kind: 'judge',
        prompt: '`ThreadLocal` 适合在每个线程保存独立副本,用完后要 remove 避免内存泄漏。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '线程池的线程会复用,ThreadLocal 里存的大对象不清理就一直在。Entry 的 key 是弱引用,value 不是,容易累积。',
      },
      {
        id: 'j-con-6',
        kind: 'term2def',
        prompt: '死锁的四个必要条件里,破坏哪一个就能预防:',
        choices: [
          { text: '任一即可,比如固定加锁顺序破坏"环路等待"', correct: true },
          { text: '只能破坏互斥', correct: false },
          { text: '必须全部破坏', correct: false },
          { text: '死锁无法预防,只能重启', correct: false },
        ],
        explain:
          '互斥、占有且等待、不可抢占、环路等待。实践中最可控的是统一加锁顺序,或者用 tryLock 带超时。',
      },
      {
        id: 'j-con-7',
        kind: 'scenario',
        prompt: '要让多个线程都满足某个条件后再继续执行。合适的工具是:',
        choices: [
          { text: 'CountDownLatch', correct: true },
          { text: 'Semaphore', correct: false },
          { text: 'ReentrantLock', correct: false },
          { text: 'volatile 标志位加自旋', correct: false },
        ],
        explain:
          'CountDownLatch 一次性,倒数到 0 放行;要能重复用就换 CyclicBarrier。控制并发数用 Semaphore。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-jvm',
    name: 'JVM 与内存',
    intro: '堆栈分工、GC 在收什么、类加载与引用层级。',
    questions: [
      {
        id: 'j-jvm-1',
        kind: 'term2def',
        prompt: 'Java 的方法调用栈(stack)与堆(heap)的分工是:',
        choices: [
          { text: '栈存栈帧与局部变量,堆存对象实例', correct: true },
          { text: '栈存对象,堆存基本类型', correct: false },
          { text: '两者都存对象,只是区域不同', correct: false },
          { text: '栈用于多线程,堆用于单线程', correct: false },
        ],
        explain:
          '每个线程一份栈,方法进栈压帧、返回撕帧;对象都分配在堆,被所有线程共享。栈溢出(StackOverflowError)多半是递归太深。',
        link: { term: 'stack-and-heap' },
      },
      {
        id: 'j-jvm-2',
        kind: 'judge',
        prompt: 'GC 回收的对象,是没有任何引用可达的那些。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '从 GC Roots(栈、静态字段、常量等)出发不可达的对象才会被回收。这也是"匿名内部类持有外部类引用"造成泄漏的原因。',
        link: { term: 'garbage-collection' },
      },
      {
        id: 'j-jvm-3',
        kind: 'term2def',
        prompt: '强引用、软引用、弱引用的差别体现在:',
        choices: [
          { text: '内存紧张时是否会被回收,弱引用最容易被收', correct: true },
          { text: '能否被序列化', correct: false },
          { text: '线程安全性不同', correct: false },
          { text: '访问速度不同', correct: false },
        ],
        explain:
          '强引用一直活着;软引用在内存不足前回收(适合缓存);弱引用下次 GC 就没了(适合 ThreadLocal 的 key、WeakHashMap)。',
        link: { term: 'reference' },
      },
      {
        id: 'j-jvm-4',
        kind: 'scenario',
        prompt: '线上偶发 Full GC 频繁、老年代涨得快。最先该查的是:',
        choices: [
          { text: '有没有大对象被长期持有、缓存无上限增长', correct: true },
          { text: '把堆调大', correct: false },
          { text: '换 GC 收集器', correct: false },
          { text: '增加线程数', correct: false },
        ],
        explain:
          '先看堆转储找谁占着不放,再决定调参。盲目加大堆只是把 Full GC 推迟,单次停顿更长。',
      },
      {
        id: 'j-jvm-5',
        kind: 'judge',
        prompt: '`static` 字段随类初始化创建,生命周期与类加载器一致。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '静态字段在类准备阶段分配、初始化阶段赋值。用 static 集合当缓存又不清空,是内存泄漏的常见来源。',
      },
      {
        id: 'j-jvm-6',
        kind: 'term2def',
        prompt: '双亲委派模型的作用是:',
        choices: [
          { text: '先让父加载器尝试加载,保证核心类不被替换', correct: true },
          { text: '同时用两个加载器加快加载', correct: false },
          { text: '让子加载器优先加载自定义类', correct: false },
          { text: '给每个类加锁防止并发加载', correct: false },
        ],
        explain:
          '向上委派、父类先试。这样 java.lang.String 只会由启动类加载器提供,避免被同名类顶替。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'java-modern',
    name: '新特性与工程',
    intro: 'record、Stream、Optional,以及并发包里那些常用工具。',
    questions: [
      {
        id: 'j-mod-1',
        kind: 'term2def',
        prompt: '`record Point(int x, int y) {}` 编译器会自动生成:',
        choices: [
          { text: '构造器、访问器 x()/y()、equals、hashCode、toString', correct: true },
          { text: '只有构造器和 toString', correct: false },
          { text: '只有 equals 和 hashCode', correct: false },
          { text: '什么都不生成,只是语法糖声明', correct: false },
        ],
        explain:
          'record 专为"只装数据"设计,全部字段都隐含 final,因此不可变。要校验参数可以写紧凑构造器。',
        link: { term: 'record', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-mod-2',
        kind: 'judge',
        prompt: 'Stream 的中间操作是惰性的,只有遇到终止操作才真正执行。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'filter / map 只登记变换,collect / forEach 这类终止操作才触发整条流水线,而且是一次遍历跑完,不是一层一轮。',
      },
      {
        id: 'j-mod-3',
        kind: 'scenario',
        prompt: '`Optional` 的推荐用法是:',
        choices: [
          { text: '作为方法返回值,表达"可能没有值",用 map/orElseGet 消费', correct: true },
          { text: '当作类字段类型', correct: false },
          { text: '当作方法参数类型', correct: false },
          { text: '替代所有 null 判断', correct: false },
        ],
        explain:
          'Optional 设计初衷是返回值。当字段会让每个对象多包一层;当参数反而逼着调用方包起来。序列化也不支持它。',
        link: { term: 'null', see: 'java/equals-and-identity' },
      },
      {
        id: 'j-mod-4',
        kind: 'judge',
        prompt: '`CompletableFuture` 可以用链式调用组合多个异步任务,并统一处理异常。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'thenApply / thenCompose / exceptionally 组成流水线,比 FutureTask 手动等结果好用得多。要注意默认跑在公共 ForkJoinPool 上,耗时任务建议自带线程池。',
      },
      {
        id: 'j-mod-5',
        kind: 'term2def',
        prompt: '接口的静态方法与默认方法的差别是:',
        choices: [
          { text: '静态方法只能通过接口名调用,默认方法可被实现类继承或覆盖', correct: true },
          { text: '两者都能被覆盖', correct: false },
          { text: '静态方法可以有实现,默认方法必须抽象', correct: false },
          { text: '默认方法不能访问其他接口成员', correct: false },
        ],
        explain:
          '静态方法是工具方法,不参与多态;默认方法是给老接口平滑加能力,实现类能继承也能覆盖。',
      },
      {
        id: 'j-mod-6',
        kind: 'scenario',
        prompt: '一段代码要兼容新旧 JDK 行为差异,又想少写 if。合适的思路是:',
        choices: [
          { text: '用版本判断或反射探测,把差异收敛到一个小适配层', correct: true },
          { text: '在几十处调用点分别判断', correct: false },
          { text: '直接编译到最低版本,不用新 API', correct: false },
          { text: '用 try-catch 包住所有调用', correct: false },
        ],
        explain:
          '版本差异集中一处,升级时只改适配层。散落各处的判断是这类兼容代码腐化的开始。',
      },
    ],
  },
]
