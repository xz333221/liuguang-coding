// 各分类的权威资料索引。
//
// 这里只做**索引与链接**,不转载内容:各站许可不同(MDN 正文是 CC-BY-SA,官方文档各有条款),
// 正文里的解释都是我们自己写的,依据是每篇末尾列出的参考资料。
//
// 挑选标准:一手文档优先,其次是被广泛认可的教材与课程;每条都写清"适合解决什么问题"。

export interface ResourceItem {
  title: string
  url: string
  note: string
  /** 中文 / 英文 / 中英 */
  lang: '中文' | '英文'
  /** 是否免费可读 */
  free: boolean
}

export interface ResourceGroup {
  /** 对应 catalog.ts 里的分类 id */
  category: string
  intro: string
  items: ResourceItem[]
}

export const resources: ResourceGroup[] = [
  {
    category: 'python',
    intro: '遇到拿不准的地方,先查官方文档;入门看教程,抠细节看语言参考。',
    items: [
      {
        title: 'Python 官方教程',
        url: 'https://docs.python.org/zh-cn/3/tutorial/index.html',
        note: '有官方中文版。适合从头过一遍语法,顺带认识标准库。',
        lang: '中文',
        free: true,
      },
      {
        title: 'Python 语言参考',
        url: 'https://docs.python.org/zh-cn/3/reference/index.html',
        note: '讲"语言怎么定义"而不是"怎么用"。数据模型那一章是理解变量与对象的权威依据。',
        lang: '中文',
        free: true,
      },
      {
        title: 'Python 官方 FAQ:程序设计',
        url: 'https://docs.python.org/zh-cn/3/faq/programming.html',
        note: '"为什么默认值在对象之间共享"这类高频困惑,官方给了标准答案。',
        lang: '中文',
        free: true,
      },
      {
        title: 'copy 模块文档',
        url: 'https://docs.python.org/zh-cn/3/library/copy.html',
        note: '浅拷贝与深拷贝的准确定义、memo 参数与 __copy__ / __deepcopy__ 协议。',
        lang: '中文',
        free: true,
      },
      {
        title: 'PEP 8 代码风格指南',
        url: 'https://peps.python.org/pep-0008/',
        note: '命名、缩进、导入顺序的共识,团队协作前先读一遍。',
        lang: '英文',
        free: true,
      },
      {
        title: 'The Hitchhiker’s Guide to Python',
        url: 'https://docs.python-guide.org/',
        note: '工程实践向:虚拟环境、依赖管理、项目结构、打包与测试。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Fluent Python(第 2 版)',
        url: 'https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/',
        note: '数据模型、协议、迭代器与并发的进阶读物,想写"地道 Python"就靠它。',
        lang: '英文',
        free: false,
      },
    ],
  },
  {
    category: 'java',
    intro: 'Java 的权威性层级很清楚:先语言规范,再 API 文档,最后才是教程。',
    items: [
      {
        title: 'Java 语言规范(JLS)',
        url: 'https://docs.oracle.com/javase/specs/jls/se21/html/index.html',
        note: '最终解释权在这里。求值顺序、类型转换、== 的语义都写得极其精确。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Java SE API 文档',
        url: 'https://docs.oracle.com/en/java/javase/21/docs/api/index.html',
        note: '查方法语义与线程安全说明的第一站,比如 String 的不可变性与集合的 fail-fast。',
        lang: '英文',
        free: true,
      },
      {
        title: 'dev.java 官方教程',
        url: 'https://dev.java/learn/',
        note: 'Oracle 维护的新版学习入口,比老教程更新。',
        lang: '英文',
        free: true,
      },
      {
        title: 'OpenJDK 文档与 JEP 索引',
        url: 'https://openjdk.org/jeps/0',
        note: '想知道某个版本改了什么、为什么改,翻 JEP 的动机与设计决策。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Effective Java(第 3 版)',
        url: 'https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/',
        note: '90 条实践建议,equals/hashCode/不可变类这几条几乎是必修。',
        lang: '英文',
        free: false,
      },
    ],
  },
  {
    category: 'ai',
    intro: '大模型这块变化快,优先看一手文档与有出处的技术文章,少看二手结论。',
    items: [
      {
        title: 'Hugging Face:How to generate text',
        url: 'https://huggingface.co/blog/how-to-generate',
        note: '贪心、beam search、采样、温度、top-k、top-p 的标准讲法,带可运行代码。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Hugging Face LLM 课程',
        url: 'https://huggingface.co/learn/llm-course/',
        note: '从 tokenizer 到微调的系统课程,每章都有 notebook。',
        lang: '英文',
        free: true,
      },
      {
        title: 'OpenAI:文本生成与提示指南',
        url: 'https://platform.openai.com/docs/guides/text-generation',
        note: '工程侧的一手说明:参数语义、消息结构、常见失败模式。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Anthropic:Prompt engineering 概览',
        url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
        note: '把提示工程拆成可操作的技术点,含温度等参数的取舍建议。',
        lang: '英文',
        free: true,
      },
      {
        title: 'The Illustrated Transformer(Jay Alammar)',
        url: 'https://jalammar.github.io/illustrated-transformer/',
        note: '用图讲清注意力机制,读源码前先看这个。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Attention Is All You Need',
        url: 'https://arxiv.org/abs/1706.03762',
        note: 'Transformer 原论文。看结构图与公式即可,细节可以慢慢补。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Lilian Weng 的博客',
        url: 'https://lilianweng.github.io/',
        note: '把大模型各条技术线梳理成体系,参考文献给得很足。',
        lang: '英文',
        free: true,
      },
    ],
  },
  {
    category: 'frontend',
    intro: '浏览器行为以规范与 MDN 为准,框架用法以官方文档为准。',
    items: [
      {
        title: 'MDN Web Docs',
        url: 'https://developer.mozilla.org/zh-CN/',
        note: 'HTML / CSS / JavaScript 的日常查阅首选,有中文版,正文为 CC-BY-SA。',
        lang: '中文',
        free: true,
      },
      {
        title: 'javascript.info',
        url: 'https://zh.javascript.info/',
        note: '从语言内核讲到浏览器 API,例子密、解释细,有中文版。',
        lang: '中文',
        free: true,
      },
      {
        title: 'web.dev(性能与可访问性)',
        url: 'https://web.dev/learn/',
        note: 'Core Web Vitals、图片优化、可访问性的工程指南。',
        lang: '英文',
        free: true,
      },
      {
        title: 'WHATWG HTML 规范',
        url: 'https://html.spec.whatwg.org/',
        note: '解析、表单、事件循环这些问题的最终依据。',
        lang: '英文',
        free: true,
      },
    ],
  },
  {
    category: 'backend',
    intro: '后端的难点在取舍:先把数据结构、一致性、故障这三件事读明白。',
    items: [
      {
        title: 'Designing Data-Intensive Applications',
        url: 'https://dataintensive.net/',
        note: '分布式数据系统的地图:复制、分区、事务、共识。读两遍都值。',
        lang: '英文',
        free: false,
      },
      {
        title: 'PostgreSQL 官方文档',
        url: 'https://www.postgresql.org/docs/current/index.html',
        note: '事务隔离级别、索引类型、查询计划,写得比大多数教程清楚。',
        lang: '英文',
        free: true,
      },
      {
        title: 'System Design Primer',
        url: 'https://github.com/donnemartin/system-design-primer',
        note: '面试向的系统设计索引,可以把不会的词逐个补齐。',
        lang: '英文',
        free: true,
      },
      {
        title: 'MIT 6.824 分布式系统',
        url: 'https://pdos.csail.mit.edu/6.824/',
        note: '有实验要写:Raft、KV 存储。想真懂一致性绕不开这类课。',
        lang: '英文',
        free: true,
      },
    ],
  },
  {
    category: 'ops',
    intro: '运维读一手手册最省时间:出问题时没人能替你查 man page。',
    items: [
      {
        title: 'Google SRE Book(在线免费)',
        url: 'https://sre.google/sre-book/table-of-contents/',
        note: 'SLO、错误预算、值班与故障复盘,把运维从"救火"变成工程。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Docker 官方文档',
        url: 'https://docs.docker.com/',
        note: '镜像分层、网络、存储与 compose,命令语义以这里为准。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Kubernetes 官方文档',
        url: 'https://kubernetes.io/zh-cn/docs/home/',
        note: '有中文版。概念页写得比很多二手教程准确。',
        lang: '中文',
        free: true,
      },
      {
        title: 'Linux man-pages 与 LKML 文档',
        url: 'https://www.kernel.org/doc/man-pages/',
        note: 'sysctl、性能参数、系统调用行为的第一手说明。',
        lang: '英文',
        free: true,
      },
    ],
  },
  {
    category: 'ui',
    intro: '设计规范挑一家读透,再横向看别家怎么解同一道题。',
    items: [
      {
        title: 'Apple Human Interface Guidelines',
        url: 'https://developer.apple.com/design/human-interface-guidelines',
        note: '层级、留白、动效的取舍讲得细,做消费端产品值得逐页读。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Material Design 3',
        url: 'https://m3.material.io/',
        note: '设计令牌、组件状态、无障碍的成体系方案,适合做规范时对照。',
        lang: '英文',
        free: true,
      },
      {
        title: 'WCAG 2.2 快速参考',
        url: 'https://www.w3.org/WAI/WCAG22/quickref/',
        note: '对比度、焦点、语义化这些"及格线"条款,按条目自查。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Refactoring UI',
        url: 'https://www.refactoringui.com/',
        note: '面向开发者的视觉修法:层级、间距、色彩,能立刻用上的具体做法。',
        lang: '英文',
        free: false,
      },
      {
        title: 'Nielsen Norman Group 文章库',
        url: 'https://www.nngroup.com/articles/',
        note: '可用性研究的结论都带实验出处,写方案时引用它比引用感觉更稳。',
        lang: '英文',
        free: true,
      },
    ],
  },
  {
    category: 'product',
    intro: '产品设计最容易被方法论带偏,优先读有真实案例与失败教训的作者。',
    items: [
      {
        title: 'Inspired(启示录)与 SVPG 博客',
        url: 'https://www.svpg.com/articles/',
        note: '产品发现、机会评估、指标设计,作者自己写博客补充案例。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Lenny’s Newsletter',
        url: 'https://www.lennysnewsletter.com/',
        note: '增长、留存、定价的实操拆解,带真实数据与模板。',
        lang: '英文',
        free: false,
      },
      {
        title: 'Julie Zhuo 的文章',
        url: 'https://www.juliezhuo.com/',
        note: '前 Facebook 设计副总裁写的团队与决策问题,篇幅短,后劲长。',
        lang: '英文',
        free: true,
      },
      {
        title: 'Nielsen Norman Group:UX 研究方法',
        url: 'https://www.nngroup.com/articles/which-ux-research-methods/',
        note: '什么时候做访谈、什么时候做可用性测试,别用错方法。',
        lang: '英文',
        free: true,
      },
    ],
  },
]

export function resourcesOf(categoryId: string): ResourceGroup | undefined {
  return resources.find((group) => group.category === categoryId)
}
