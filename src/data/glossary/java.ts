import type { Term } from './types'

/** Java:相等性这条线上的名词。 */
export const javaTerms: Term[] = [
  {
    id: 'primitive-type',
    term: '基本类型',
    en: 'primitive type',
    group: 'java',
    plain:
      'Java 里八种直接装着值本身的类型。变量里没有引用可指 —— 所以 == 比的就是值。',
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
      '除那八个之外的一切:类、接口、数组、枚举。变量里装着指向对象的引用。',
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
    plain: '两个不同的东西算出了同一个哈希值。这很正常，集合会在桶里再用 equals 认一遍。',
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
      '"什么都没指"的那个特殊值。对着 null 调方法，会当场抛 NullPointerException。',
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
  {
    id: 'spring-boot',
    term: 'Spring Boot',
    group: 'java',
    plain:
      'Spring 的一套脚手架:依赖版本、配置加载、内嵌服务器、自动装配都替你做好的那种。约定先写好，你只管往里放代码。',
    formal:
      '基于 Spring Framework 的自动配置框架，通过起步依赖与条件化自动配置提供可独立运行的应用，内置服务器，无需部署到外部容器。',
    related: ['starter', 'auto-configuration', 'embedded-server', 'ioc'],
    see: 'java/spring-boot-start',
    source: {
      title: 'Spring Boot 参考文档 · Developing with Spring Boot',
      url: 'https://docs.spring.io/spring-boot/reference/using/index.html',
    },
  },
  {
    id: 'ioc',
    term: 'IoC',
    en: 'Inversion of Control',
    aliases: ['控制反转'],
    group: 'java',
    plain:
      '对象的创建与依赖关系不归你管，交给容器。你只声明"我需要什么"，容器负责造好、组装好再给你。',
    formal:
      '控制反转:对象的实例化、装配与生命周期由 IoC 容器负责，应用代码通过构造器或字段声明依赖，由容器注入。',
    related: ['dependency-injection', 'bean', 'spring-boot'],
    see: 'java/spring-boot-start',
    source: {
      title: 'Spring Framework 文档 · The IoC Container',
      url: 'https://docs.spring.io/spring-framework/reference/core/beans.html',
    },
  },
  {
    id: 'dependency-injection',
    term: '依赖注入',
    en: 'dependency injection',
    aliases: ['构造器注入'],
    group: 'java',
    plain:
      '不在代码里 new 依赖，而是在构造器参数里写"我要个什么"，由容器把它递进来。测试时换一个假的递进去就行。',
    formal:
      'IoC 的具体实现方式:容器在创建 Bean 时按类型解析并传入其构造器参数、setter 或字段。构造器注入因可保持字段 final、依赖显式而首选。',
    related: ['ioc', 'bean'],
    see: 'java/spring-boot-start',
  },
  {
    id: 'bean',
    term: 'Bean',
    group: 'java',
    plain:
      '被 IoC 容器接管的对象。注册成 Bean 之后，别处只要在构造器里声明类型就能拿到它，不用自己 new。',
    formal:
      '由 Spring 容器实例化、装配与管理的对象。来源包括组件扫描到的 @Component 及其派生注解，以及 @Configuration 类中用 @Bean 声明的方法。',
    related: ['ioc', 'dependency-injection'],
    see: 'java/spring-boot-start',
  },
  {
    id: 'starter',
    term: 'starter',
    group: 'java',
    aliases: ['起步依赖'],
    plain:
      '依赖的打包套餐。写 spring-boot-starter-web 一个条目，就把 web 需要的那些库连版本一起带进来。',
    formal:
      'Spring Boot 的依赖聚合模块:一个 starter 引入一组经过版本对齐的依赖，并触发对应的自动配置。',
    related: ['spring-boot', 'auto-configuration'],
    see: 'java/spring-boot-start',
    source: {
      title: 'Spring Boot 参考文档 · Build systems',
      url: 'https://docs.spring.io/spring-boot/reference/using/build-systems.html',
    },
  },
  {
    id: 'auto-configuration',
    term: '自动配置',
    en: 'auto-configuration',
    group: 'java',
    plain:
      'Spring Boot 看你的 classpath 上有什么，就猜你大概想用什么，然后把对应的 Bean 配好。猜错了可以覆盖，不用从头手写。',
    formal:
      '@EnableAutoConfiguration 触发的机制:按 classpath 条件(@ConditionalOnClass / OnMissingBean 等)加载候选配置类，用户自定义的 Bean 优先。',
    related: ['spring-boot', 'starter', 'bean'],
    see: 'java/spring-boot-start',
    source: {
      title: 'Spring Boot 参考文档 · Auto-configuration',
      url: 'https://docs.spring.io/spring-boot/reference/using/auto-configuration.html',
    },
  },
  {
    id: 'embedded-server',
    term: '内嵌服务器',
    en: 'embedded server',
    group: 'java',
    plain:
      '服务器不是外面装好的那一个，而是跟着应用一起打包、跟着应用一起启动的那一个。',
    formal:
      '以依赖形式随应用打包的 Servlet 容器(Tomcat、Jetty、Undertow)，由 Spring Boot 在启动时创建并监听端口，因此产物是可执行 jar 而非 war。',
    related: ['spring-boot'],
    see: 'java/spring-boot-start',
    source: {
      title: 'Spring Boot 参考文档 · Servlet web applications',
      url: 'https://docs.spring.io/spring-boot/reference/web/servlet.html',
    },
  },
  {
    id: 'maven',
    term: 'Maven',
    group: 'java',
    plain:
      'Java 世界里最常见的构建工具:拿一份 pom.xml,按约定找代码、按坐标下依赖、按生命周期跑插件。',
    formal:
      'Apache Maven 是基于 POM(项目对象模型)的项目管理与构建工具,以约定优于配置的方式描述构建、依赖与发布过程。',
    related: ['pom', 'project-coordinates', 'build-lifecycle'],
    see: 'java/maven-build',
    source: {
      title: 'Maven 文档 · Introduction to the POM',
      url: 'https://maven.apache.org/guides/introduction/introduction-to-the-pom.html',
    },
  },
  {
    id: 'pom',
    term: 'pom.xml',
    en: 'Project Object Model',
    group: 'java',
    plain:
      'Maven 的工程描述文件:坐标、依赖、插件、模块都写在这里。它不是配置文件,而是"这个工程是什么、怎么构建"的声明。',
    formal:
      'Project Object Model:以 XML 描述项目坐标、依赖、构建插件、多模块关系与继承关系的模型文件,默认位于工程根目录。',
    related: ['maven', 'project-coordinates'],
    see: 'java/maven-build',
  },
  {
    id: 'project-coordinates',
    term: '坐标',
    en: 'GAV',
    aliases: ['groupId:artifactId:version'],
    group: 'java',
    plain:
      'groupId + artifactId + version 这三项,是工程或依赖的唯一身份证;本地仓库的目录路径也是按它拼出来的。',
    formal:
      'Maven 用 groupId、artifactId、version 三元组唯一标识一个构件,辅以 packaging 与 classifier 区分同版本的不同产物。',
    related: ['pom', 'local-repository'],
    see: 'java/maven-build',
    source: {
      title: 'Maven · POM Reference',
      url: 'https://maven.apache.org/pom.html',
    },
  },
  {
    id: 'build-lifecycle',
    term: '生命周期',
    en: 'build lifecycle',
    group: 'java',
    plain:
      '一串有先后顺序的阶段(phase)。跑后面的阶段时,前面的会全部先跑一遍;阶段本身不干活,插件挂在上面干。',
    formal:
      'Maven 定义了 clean、default、site 三套相互独立的生命周期,每套由有序的阶段组成;执行某阶段时其前的阶段依次执行。',
    related: ['plugin', 'maven'],
    see: 'java/maven-build',
    source: {
      title: 'Maven 文档 · Introduction to the Build Lifecycle',
      url: 'https://maven.apache.org/guides/introduction/introduction-to-the-build-lifecycle.html',
    },
  },
  {
    id: 'plugin',
    term: '插件',
    en: 'plugin',
    aliases: ['goal'],
    group: 'java',
    plain:
      '真正干活的东西。编译、跑测试、打包、发布都是某个插件的某个目标(goal),它被绑在生命周期的某个阶段上。',
    formal:
      'Maven 插件由一组 goal 组成,通过 executions 把 goal 绑定到 phase;packaging 为 jar 时各阶段已有默认绑定。',
    related: ['build-lifecycle', 'pom'],
    see: 'java/maven-build',
  },
  {
    id: 'dependency-scope',
    term: '依赖作用域',
    en: 'dependency scope',
    aliases: ['scope'],
    group: 'java',
    plain:
      '一条依赖在哪些阶段可见、要不要传递给下游。选错了会多打包一份,或者编译时能用、运行时找不到。',
    formal:
      'scope 取值 compile(默认)、provided、runtime、test、system;决定该依赖参与哪些 classpath 以及是否传递。',
    related: ['dependency-management'],
    see: 'java/maven-build',
  },
  {
    id: 'dependency-management',
    term: 'dependencyManagement',
    group: 'java',
    plain:
      '一张版本价目表:子模块写同名依赖时可以不写版本。但它本身不引入依赖 —— 只写在这里,代码里还是 import 不到。',
    formal:
      'POM 中声明依赖版本与作用域供子模块继承的区块,不参与实际依赖解析;子模块需在 dependencies 中声明同名依赖才生效。',
    related: ['dependency-scope', 'pom'],
    see: 'java/maven-build',
  },
  {
    id: 'local-repository',
    term: '本地仓库',
    en: 'local repository',
    group: 'java',
    plain:
      '依赖下载后缓存在本机的地方,默认在 ~/.m2/repository。装进去的包,别的工程才能按坐标引用。',
    formal:
      '默认位于 ~/.m2/repository 的构件缓存目录,由 install:install 写入,按 groupId/artifactId/version 分层存放。',
    related: ['project-coordinates', 'maven'],
    see: 'java/maven-build',
  },
  {
    id: 'aggregation',
    term: '聚合',
    en: 'aggregation',
    aliases: ['reactor'],
    group: 'java',
    plain:
      '父工程用 modules 列出"包含哪些模块",一次构建就把它们按依赖顺序依次构建。和"继承"是两件不同的事。',
    formal:
      '在 packaging=pom 的工程中用 modules 声明子模块,构建时由 reactor 按模块间依赖关系排序并依次执行。',
    related: ['maven', 'pom'],
    see: 'java/maven-build',
  },
  {
    id: 'mybatis',
    term: 'MyBatis',
    group: 'java',
    plain:
      '一个"SQL 归你写"的持久层框架:你给 SQL,它负责把参数塞进去、把结果映射成对象。',
    formal:
      '基于 Java 的持久层框架,以 Mapper 接口 + 映射文件(或注解)声明 SQL,负责参数绑定、结果映射与事务内的 SqlSession 管理,不做自动表结构映射。',
    related: ['mybatis-plus', 'mapper', 'resultmap'],
    see: 'java/mybatis-and-plus',
    source: {
      title: 'MyBatis 3 文档 · XML 映射器',
      url: 'https://mybatis.org/mybatis-3/zh/sqlmap-xml.html',
    },
  },
  {
    id: 'mybatis-plus',
    term: 'MyBatis-Plus',
    group: 'java',
    plain:
      'MyBatis 的增强包,不是另一个框架。单表 CRUD、条件查询、分页这些不用写 SQL 的活它包了,复杂 SQL 还是回 MyBatis。',
    formal:
      '在 MyBatis 之上提供 BaseMapper、IService、条件构造器、分页插件、自动填充、逻辑删除与代码生成等能力的增强工具,不替换 MyBatis 的映射机制。',
    related: ['mybatis', 'wrapper', 'logic-delete'],
    see: 'java/mybatis-and-plus',
    source: {
      title: 'MyBatis-Plus 文档 · 快速开始',
      url: 'https://baomidou.com/getting-started/',
    },
  },
  {
    id: 'mapper',
    term: 'Mapper',
    group: 'java',
    plain:
      '接口 + 映射文件这一对。接口里只写方法签名,SQL 写在 XML 里,靠 namespace 和方法名对上。',
    formal:
      'MyBatis 中与映射文件绑定的 Java 接口:XML 的 namespace 取其全限定名,语句 id 取方法名;MyBatis 为其生成代理实现。',
    related: ['mybatis', 'resultmap', 'dynamic-sql'],
    see: 'java/mybatis-and-plus',
  },
  {
    id: 'resultmap',
    term: 'resultMap',
    group: 'java',
    plain:
      '手动指定"哪一列填哪个字段"。列名和字段名对不上、或者要拼一对多的时候用它。',
    formal:
      'MyBatis 的结果映射定义,逐条声明 column → property,并支持 association / collection 表达嵌套对象与集合。',
    related: ['mapper', 'mybatis'],
    see: 'java/mybatis-and-plus',
  },
  {
    id: 'dynamic-sql',
    term: '动态 SQL',
    group: 'java',
    plain:
      'SQL 按参数变化:条件成立了才拼这一段。if / where / foreach / choose 就是干这个的。',
    formal:
      'MyBatis 映射文件中的条件化语句构件(if、choose、where、foreach、trim 等),在运行时按入参拼出最终 SQL。',
    related: ['mapper', 'mybatis'],
    see: 'java/mybatis-and-plus',
  },
  {
    id: 'wrapper',
    term: '条件构造器',
    en: 'Wrapper',
    group: 'java',
    plain:
      '用方法调用而不是字符串来表达查询条件:eq、like、in、orderBy。拼出来的还是一条 SQL。',
    formal:
      'MyBatis-Plus 中以 QueryWrapper / LambdaQueryWrapper 表达 where、order、group 等条件的构建器,Lambda 形式通过方法引用取得字段名。',
    related: ['mybatis-plus', 'mybatis'],
    see: 'java/mybatis-and-plus',
    source: {
      title: 'MyBatis-Plus 文档 · 核心功能',
      url: 'https://baomidou.com/guides/',
    },
  },
  {
    id: 'logic-delete',
    term: '逻辑删除',
    group: 'java',
    plain:
      '不真删行,只把 deleted 改成 1。查的时候自动带上 deleted = 0 —— 除非这条 SQL 是你自己写的。',
    formal:
      '以标记字段代替物理删除的方案:MyBatis-Plus 通过 @TableLogic 在 delete 时改写为 update,并在查询中附加未删除条件。',
    related: ['mybatis-plus'],
    see: 'java/mybatis-and-plus',
  },
]
