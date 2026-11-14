// Java 的章节目录树(17 章)。
//
// 为什么单独一个文件:这棵树有 113 个节点,混进 catalog.ts 会把"有哪些方向"这件事埋掉。
// catalog 只管方向与顺序,这里只管 Java 内部怎么分章。
//
// 两条约定:
//   · **编号不写进数据**,由树位置推导(见 catalog.outlineNumber)。以后插一章不用重排手写编号。
//   · 节点一律 status: 'active' —— 空不空由「子树里有几篇文章」推导,补上内容后
//     「筹备中」自动消失,不用回来改数据。方向级的 soon(前端/后端那些)仍在 catalog 里声明。
//
// 文章靠 frontmatter 的 `node` 指到这里的某个 id;`category` 仍是 java,所以
// /java/<slug>/ 这批老地址一个都不变。
import type { Category } from './catalog'

interface OutlineNode {
  id: string
  name: string
  /** 章节落地页上的一句话说明;叶子节点省略(名字已经说清了) */
  intro?: string
  children?: OutlineNode[]
}

const outline: OutlineNode[] = [
  {
    id: 'java-intro',
    name: '简介与准备',
    intro: '先弄清 JDK / JRE / JVM 各是什么,把环境装起来,跑出第一个程序。',
    children: [
      { id: 'java-intro-what', name: 'Java 是什么：JDK / JRE / JVM 的关系' },
      { id: 'java-intro-install', name: '安装 JDK 与第一个程序' },
      { id: 'java-intro-cli-ide', name: '命令行与 IDE 编译运行' },
      { id: 'java-intro-how-to-read', name: '这份知识库怎么读（学习路线）' },
    ],
  },
  {
    id: 'java-quickstart',
    name: '快速入门',
    intro: '变量、运算、分支循环、数组与方法 —— 够写出一个能跑的小程序。',
    children: [
      { id: 'java-quickstart-variables', name: '变量与基本类型' },
      { id: 'java-quickstart-operators', name: '运算符与求值顺序' },
      { id: 'java-quickstart-flow', name: '流程控制：分支与循环' },
      { id: 'java-quickstart-array', name: '数组' },
      { id: 'java-quickstart-method', name: '方法入门：参数、返回值' },
    ],
  },
  {
    id: 'java-oop',
    name: '面向对象编程',
    intro: 'Java 的主干:类与对象怎么组织,引用怎么比较,核心类怎么用。',
    children: [
      {
        id: 'java-oop-basics',
        name: '面向对象基础',
        intro: '从 class 与 instance 开始,一路到继承、多态、接口与包。',
        children: [
          { id: 'java-oop-class-instance', name: '类与实例：class 和 instance' },
          { id: 'java-oop-method', name: '方法' },
          { id: 'java-oop-constructor', name: '构造方法' },
          { id: 'java-oop-overload', name: '方法重载' },
          { id: 'java-oop-inheritance', name: '继承' },
          { id: 'java-oop-polymorphism', name: '多态' },
          { id: 'java-oop-abstract', name: '抽象类' },
          { id: 'java-oop-interface', name: '接口' },
          { id: 'java-oop-static', name: '静态字段和静态方法' },
          { id: 'java-oop-package', name: '包与作用域' },
          { id: 'java-oop-inner-class', name: '内部类' },
          { id: 'java-oop-classpath-jar', name: 'classpath 和 jar' },
          { id: 'java-oop-module', name: '模块' },
        ],
      },
      {
        id: 'java-oop-compare',
        name: '对象与引用的比较规则',
        intro: '== 比身份、equals 比内容 —— 这条线不清,后面集合与缓存全会踩坑。',
        children: [
          { id: 'java-oop-equals', name: '== 与 equals：比身份还是比内容' },
          { id: 'java-oop-hashcode', name: 'hashCode 与 equals 的契约' },
          { id: 'java-oop-string-pool', name: 'String 常量池与 Integer 缓存' },
          { id: 'java-oop-boxing', name: '自动装箱与拆箱的坑' },
        ],
      },
      {
        id: 'java-oop-core-classes',
        name: 'Java 核心类',
        intro: '字符串、包装类型、枚举与 BigDecimal 这些天天要用的类。',
        children: [
          { id: 'java-core-string', name: '字符串与编码 / StringBuilder' },
          { id: 'java-core-wrapper', name: '包装类型' },
          { id: 'java-core-bean-enum', name: 'JavaBean 与枚举' },
          { id: 'java-core-bigdecimal', name: 'BigInteger / BigDecimal' },
          { id: 'java-core-utils', name: '常用工具类' },
          { id: 'java-core-datetime', name: '日期时间：LocalDate / LocalDateTime 与时区' },
          { id: 'java-core-regex', name: '正则表达式：Pattern / Matcher 与常用写法' },
        ],
      },
    ],
  },
  {
    id: 'java-exception',
    name: '异常处理',
    intro: '异常体系怎么分,什么时候该抛、什么时候该接,资源怎么保证关掉。',
    children: [
      { id: 'java-exception-hierarchy', name: '异常体系：Error / Exception / Checked' },
      { id: 'java-exception-try', name: 'try-catch-finally 与 try-with-resources' },
      { id: 'java-exception-custom', name: '自定义异常与抛出时机' },
    ],
  },
  {
    id: 'java-generics',
    name: '泛型',
    intro: '泛型类与泛型方法、通配符的上下界,以及类型擦除留下的限制。',
    children: [
      { id: 'java-generics-class-method', name: '泛型类与泛型方法' },
      { id: 'java-generics-wildcard', name: '通配符与上下界（PECS）' },
      { id: 'java-generics-erasure', name: '类型擦除' },
    ],
  },
  {
    id: 'java-collections',
    name: '集合框架',
    intro: 'List / Map / Set 各自适合什么场景,以及遍历时改集合为什么会炸。',
    children: [
      { id: 'java-collections-list', name: 'List：ArrayList / LinkedList' },
      { id: 'java-collections-map', name: 'Map：HashMap / TreeMap' },
      { id: 'java-collections-set-queue', name: 'Set 与 Queue / Deque' },
      { id: 'java-collections-fail-fast', name: 'fail-fast 与并发修改' },
      { id: 'java-collections-immutable', name: '不可变集合与 Collections 工具' },
    ],
  },
  {
    id: 'java-functional',
    name: '函数式编程与 Stream',
    intro: 'Lambda 与方法引用、Stream 流水线与收集器 —— 集合之后最常用的一套写法。',
    children: [
      { id: 'java-functional-lambda', name: 'Lambda 与方法引用' },
      { id: 'java-functional-interface', name: '函数式接口：Function / Consumer / Supplier' },
      { id: 'java-functional-stream', name: 'Stream 流水线：map / filter / collect' },
      { id: 'java-functional-optional', name: 'Optional 与空值处理' },
    ],
  },
  {
    id: 'java-reflection',
    name: '反射与注解',
    intro: '框架能在运行时读你的类,靠的就是反射与注解这一套。',
    children: [
      { id: 'java-reflection-class', name: 'Class 对象与反射三件套' },
      { id: 'java-reflection-proxy', name: '动态代理' },
      { id: 'java-reflection-annotation', name: '注解的定义与读取' },
    ],
  },
  {
    id: 'java-io',
    name: 'IO 与 NIO',
    intro: '字节流与字符流的分界、缓冲与序列化,再到 NIO 的三件套。',
    children: [
      { id: 'java-io-stream', name: '字节流与字符流' },
      { id: 'java-io-buffer-serialize', name: '缓冲与序列化' },
      { id: 'java-io-nio', name: 'NIO：Buffer / Channel / Selector' },
      { id: 'java-io-socket', name: '网络编程：Socket 与 HTTP 客户端' },
    ],
  },
  {
    id: 'java-concurrency',
    name: '多线程与并发',
    intro: '线程与锁、可见性与有序性,以及为什么业务里该用线程池而不是裸线程。',
    children: [
      { id: 'java-concurrency-thread', name: '线程的创建与状态' },
      { id: 'java-concurrency-synchronized', name: 'synchronized 与锁' },
      { id: 'java-concurrency-volatile', name: 'volatile 与 JMM 入门' },
      { id: 'java-concurrency-pool', name: '线程池与 Executor' },
      { id: 'java-concurrency-atomic', name: '并发集合与原子类' },
    ],
  },
  {
    id: 'java-jvm',
    name: 'JVM 基础',
    intro: '内存怎么分区、类怎么加载、GC 怎么挑,出问题时用哪些命令看。',
    children: [
      { id: 'java-jvm-memory', name: '内存区域：堆 / 栈 / 方法区' },
      { id: 'java-jvm-classload', name: '类加载机制' },
      { id: 'java-jvm-gc', name: 'GC 与常见收集器' },
      { id: 'java-jvm-tools', name: '排查命令与常用参数' },
    ],
  },
  {
    id: 'java-build',
    name: '工程化与构建',
    intro: 'Maven 把依赖、构建与测试串起来 —— 项目从一个人写变成一群人写的那一步。',
    children: [
      { id: 'java-build-maven', name: 'Maven：一个 pom.xml 说清的三件事' },
      { id: 'java-build-dependency', name: '依赖坐标、scope 与冲突仲裁' },
      { id: 'java-build-multimodule', name: '多模块与生命周期' },
      { id: 'java-build-test', name: '单元测试：JUnit 与 Mockito' },
    ],
  },
  {
    id: 'java-spring',
    name: 'Spring 生态',
    intro: 'Spring Boot 的目录结构、IoC 与自动配置,再到 Web 层与多环境配置。',
    children: [
      { id: 'java-spring-boot', name: 'Spring Boot：一个项目从哪几个文件夹开始' },
      { id: 'java-spring-ioc', name: 'IoC 与依赖注入' },
      { id: 'java-spring-autoconfig', name: '自动配置与 starter' },
      { id: 'java-spring-web', name: 'Web 层：Controller / 参数绑定 / 统一返回' },
      { id: 'java-spring-config', name: '配置管理与多环境' },
      { id: 'java-spring-servlet', name: 'Servlet 与请求生命周期：Boot 底下那层' },
      { id: 'java-spring-cloud', name: '微服务一览：Spring Cloud 与注册 / 配置 / 网关' },
    ],
  },
  {
    id: 'java-persistence',
    name: '持久层',
    intro: 'MyBatis 与 MyBatis-Plus 的分工:谁写 SQL、谁不写,以及事务与连接池。',
    children: [
      { id: 'java-persistence-mybatis', name: 'MyBatis 与 MyBatis-Plus：谁写 SQL，谁不写' },
      { id: 'java-persistence-resultmap', name: 'ResultMap 与动态 SQL' },
      { id: 'java-persistence-wrapper', name: '条件构造器与分页' },
      { id: 'java-persistence-transaction', name: '事务与连接池' },
      { id: 'java-persistence-jdbc', name: 'JDBC 与连接池：SQL 到对象的最短路径' },
      { id: 'java-persistence-jpa', name: 'JPA / Hibernate 一览：与 MyBatis 的分工' },
    ],
  },
  {
    id: 'java-patterns',
    name: '设计模式',
    intro: '挑业务里真会用到的那几个:创建、结构、行为各一组,配 Java 示例。',
    children: [
      { id: 'java-patterns-creational', name: '创建型：工厂 / 单例 / 建造者' },
      { id: 'java-patterns-structural', name: '结构型：代理 / 装饰器 / 适配器' },
      { id: 'java-patterns-behavioral', name: '行为型：策略 / 观察者 / 模板方法' },
    ],
  },
  {
    id: 'java-ddd',
    name: '领域建模与架构',
    intro: '把业务规则关进限界上下文:聚合根、值对象、领域事件与分层依赖方向。',
    children: [
      { id: 'java-ddd-bounded-context', name: 'DDD：先把「下单」关进一个限界上下文里' },
      { id: 'java-ddd-aggregate', name: '聚合根与不变式' },
      { id: 'java-ddd-value-object', name: '值对象与领域事件' },
      { id: 'java-ddd-layering', name: '分层与防腐层' },
    ],
  },
  {
    id: 'java-algorithm',
    name: '数据结构与算法',
    intro: '复杂度、常见结构与排序,再到怎么用力扣 / 洛谷 / Exercism 练。',
    children: [
      { id: 'java-algorithm-complexity', name: '复杂度与 Big-O：怎么估一个写法贵不贵' },
      { id: 'java-algorithm-linear', name: '线性结构：数组 / 链表 / 栈 / 队列' },
      { id: 'java-algorithm-tree-heap', name: '树与堆：二叉树 / BST / 优先队列' },
      { id: 'java-algorithm-hash-sort', name: '哈希与排序：从 HashMap 到快排 / 归并' },
      { id: 'java-algorithm-practice', name: '刷题路线：力扣 / 洛谷 / Exercism 怎么用' },
    ],
  },
]

function toCategory(node: OutlineNode): Category {
  return {
    id: node.id,
    name: node.name,
    intro: node.intro,
    status: 'active',
    children: node.children?.map(toCategory),
  }
}

/** 挂到 catalog 里 java 分类的 children 上 */
export const javaChapters: Category[] = outline.map(toCategory)