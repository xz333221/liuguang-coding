import type { Term } from './types'

/** Java:相等性这条线上的名词。 */
export const javaTerms: Term[] = [
  {
    id: 'primitive-type',
    term: '基本类型',
    en: 'primitive type',
    group: 'java',
    plain:
      'Java 里八个"不是对象"的类型。变量里直接装着值本身，没有引用可指 —— 所以 == 比的就是值。',
    formal:
      'byte / short / int / long / float / double / char / boolean 八种内置类型，直接持有值，== 比较值本身。',
    related: ['reference-type', 'wrapper-class'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'reference-type',
    term: '引用类型',
    en: 'reference type',
    group: 'java',
    plain:
      '除那八个之外的一切:类、接口、数组、枚举。变量里装的不是对象本身，而是指向对象的引用。',
    formal:
      '类、接口、数组、枚举等类型，其变量持有对对象的引用;== 比较两个引用是否指向同一对象，即语言规范 15.21 的引用相等。',
    related: ['primitive-type', 'identity'],
    see: 'java/equals-and-identity',
    source: {
      title: 'Java 语言规范 · 15.21 相等运算符',
      url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.21',
    },
  },
  {
    id: 'autoboxing',
    term: '自动装箱',
    en: 'autoboxing',
    group: 'java',
    plain:
      'Java 看到"基本类型"和"包装类型"对不上时，悄悄帮你转一下。麻烦在于它有时会复用旧对象，有时会造新对象。',
    formal:
      '编译器在基本类型与其包装类型之间自动插入 valueOf / xxxValue 调用的机制。装箱可能命中缓存而复用对象，导致 == 的结果与直觉不符。',
    related: ['wrapper-class', 'identity'],
    see: 'java/equals-and-identity',
    source: {
      title: 'Java 教程 · 自动装箱与拆箱',
      url: 'https://docs.oracle.com/javase/tutorial/java/data/autoboxing.html',
    },
  },
  {
    id: 'wrapper-class',
    term: '包装类型',
    en: 'wrapper class',
    group: 'java',
    plain: '把基本类型包成对象，好放进集合里。包成对象之后，== 就变成比身份了。',
    formal:
      'Integer、Long、Double、Character、Boolean 等基本类型对应的不可变类。Integer.valueOf 缓存 -128 到 127 的实例，区间外每次新建。',
    related: ['autoboxing', 'primitive-type'],
    see: 'java/equals-and-identity',
    source: {
      title: 'Integer.valueOf 的 javadoc',
      url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int)',
    },
  },
  {
    id: 'equals',
    term: 'equals',
    group: 'java',
    plain:
      '一个方法，问的是"内容一样吗"。但 Object 给的默认实现其实是问"是不是同一个对象"，只有子类重写过，它才真的比内容。',
    formal:
      'Object.equals(Object) 的默认实现为 this == obj。重写须满足自反、对称、传递、一致、对 null 返回 false 五条约定，并与 hashCode 保持一致。',
    misread: '以为 equals 天生就是比内容。不重写的话，它和 == 完全等价。',
    related: ['hashcode', 'identity'],
    see: 'java/equals-and-identity',
    source: {
      title: 'Object.equals 的 javadoc',
      url: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#equals(java.lang.Object)',
    },
  },
  {
    id: 'hashcode',
    term: 'hashCode',
    group: 'java',
    plain:
      '对象的哈希值。HashMap、HashSet 先靠它找到"桶"，再在桶里用 equals 挨个认人 —— 所以这两个方法必须配套。',
    formal:
      'Object.hashCode() 返回对象的哈希值。约定:equals 相等则 hashCode 必须相等;反过来不要求，不同对象哈希值相同是允许的。',
    related: ['equals', 'hash-collision', 'hash-table'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'hash-collision',
    term: '哈希冲突',
    en: 'hash collision',
    group: 'java',
    plain: '两个不同的东西算出了同一个哈希值。这很正常，不是错，集合会在桶里再用 equals 认一遍。',
    formal:
      '不同对象产生相同哈希值的现象。哈希表用链地址法或开放寻址法处理，此时再逐个 equals 确认。',
    related: ['hashcode', 'hash-table'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'string-pool',
    term: '字符串常量池',
    en: 'string pool',
    aliases: ['常量池'],
    group: 'java',
    plain:
      'Java 把内容相同的字符串字面量攒在一起共用一份，省内存。所以两个写法一样的字面量，其实是同一个对象。',
    formal:
      '存放字符串字面量与 intern() 结果的驻留区域。内容相同的字面量复用同一对象，new String(...) 强制新建。',
    related: ['intern', 'literal', 'constant-folding'],
    see: 'java/equals-and-identity',
    source: {
      title: 'Java 语言规范 · 3.10.5 字符串字面量',
      url: 'https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.10.5',
    },
  },
  {
    id: 'intern',
    term: 'intern()',
    group: 'java',
    plain: '把一个运行期拼出来的字符串"登记"进常量池，之后内容相同的字面量就会复用它。',
    formal:
      'String.intern() 返回常量池中与该字符串内容相同的对象，必要时先加入。有查找开销与内存驻留代价，日常代码里不常见。',
    related: ['string-pool'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'null',
    term: 'null',
    group: 'java',
    plain:
      '"什么都没指"的那个特殊值。对着 null 调方法不会返回什么，而是当场抛 NullPointerException。',
    formal:
      '引用类型的默认值，表示不指向任何对象。对 null 调用实例方法抛 NullPointerException;Objects.equals / Objects.requireNonNull 用于规避。',
    related: ['reference-type'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'enum',
    term: '枚举',
    en: 'enum',
    group: 'java',
    plain: '一组固定常量的类型。每个常量全局只有一个实例，所以用 == 比就行，还更快。',
    formal:
      '由 enum 声明的特殊类，其常量在类加载时各创建唯一实例，因此引用相等与逻辑相等一致。',
    related: ['identity', 'equals'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'bigdecimal',
    term: 'BigDecimal',
    group: 'java',
    plain:
      '用来精确表示小数的类。但它的 equals 会连"写了几个小数位"一起比，所以 1.0 和 1.00 不算相等。',
    formal:
      '任意精度的十进制数类。equals 同时比较数值与 scale，因此 new BigDecimal("1.0") 与 "1.00" 不相等;按数值比较须用 compareTo(...) == 0。',
    related: ['equals'],
    see: 'java/equals-and-identity',
  },
  {
    id: 'record',
    term: 'record',
    group: 'java',
    plain: 'Java 16 起的一种"只装数据"的类。编译器自动生成 equals、hashCode、toString，不用手写。',
    formal:
      '由 record 声明的不可变数据载体，自动派生规范构造器、访问器，以及基于全部组件的 equals / hashCode / toString。',
    related: ['equals', 'hashcode'],
    see: 'java/equals-and-identity',
  },
]
