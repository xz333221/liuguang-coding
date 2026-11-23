// Python 的章节目录树(14 章)。
//
// 与 javaOutline.ts 同一套约定:
//   · 编号不写进数据,由树位置推导(catalog.outlineNumber);
//   · 节点一律 status: 'active',空不空由子树里的文章数推导;
//   · 文章 frontmatter 的 category 仍是 python,node 指到这里的某个 id,
//     地址保持 /python/<文件名>/。
import type { Category } from './catalog'

interface OutlineNode {
  id: string
  name: string
  /** 章节落地页上的一句话说明;叶子节点省略 */
  intro?: string
  children?: OutlineNode[]
}

const outline: OutlineNode[] = [
  {
    id: 'python-intro',
    name: '简介与准备',
    intro: '先弄清解释器与版本生态,把环境装起来,跑出第一个程序。',
    children: [
      { id: 'python-intro-what', name: 'Python 是什么：解释器、版本与生态' },
      { id: 'python-intro-install', name: '安装 Python 与第一个程序' },
      { id: 'python-intro-repl-ide', name: 'REPL、脚本与 IDE' },
      { id: 'python-intro-how-to-read', name: '这份知识库怎么读（学习路线）' },
    ],
  },
  {
    id: 'python-quickstart',
    name: '快速入门',
    intro: '名字绑定、数字字符串、运算、分支循环与函数 —— 够写出一个能跑的小程序。',
    children: [
      { id: 'python-quickstart-binding', name: '变量与名字绑定：动态类型' },
      { id: 'python-quickstart-numbers-str', name: '数字与字符串' },
      { id: 'python-quickstart-operators', name: '运算符与求值顺序' },
      { id: 'python-quickstart-flow', name: '流程控制：分支与循环' },
      { id: 'python-quickstart-function', name: '函数入门：参数与返回值' },
    ],
  },
  {
    id: 'python-containers',
    name: '容器与拷贝',
    intro: '列表/元组/字典/集合的分工,切片与解包,推导式,以及可变性带来的拷贝问题。',
    children: [
      { id: 'python-containers-list-tuple', name: '列表与元组' },
      { id: 'python-containers-dict-set', name: '字典与集合' },
      { id: 'python-containers-slice-unpack', name: '切片与解包' },
      { id: 'python-containers-comprehension', name: '推导式：列表 / 字典 / 集合' },
      { id: 'python-containers-mutable-copy', name: '可变性、浅拷贝与深拷贝' },
    ],
  },
  {
    id: 'python-function',
    name: '函数进阶',
    intro: '参数体系、LEGB 作用域与闭包、lambda 与高阶函数、装饰器。',
    children: [
      { id: 'python-function-args', name: '参数体系：默认 / 关键字 / *args / **kwargs' },
      { id: 'python-function-scope', name: '作用域与闭包：LEGB' },
      { id: 'python-function-lambda', name: 'lambda 与高阶函数' },
      { id: 'python-function-decorator', name: '装饰器与 functools.wraps' },
    ],
  },
  {
    id: 'python-oop',
    name: '面向对象与数据模型',
    intro: '类与实例、继承与 MRO、魔术方法构成的协议,以及 property、dataclass。',
    children: [
      { id: 'python-oop-class', name: '类与实例：属性与方法' },
      { id: 'python-oop-inheritance', name: '继承与 MRO' },
      { id: 'python-oop-magic', name: '魔术方法与协议' },
      { id: 'python-oop-property', name: '属性控制：property 与描述符' },
      { id: 'python-oop-dataclass', name: 'dataclass 与枚举' },
    ],
  },
  {
    id: 'python-iteration',
    name: '迭代器与生成器',
    intro: '迭代协议是 for 的地基;生成器与惰性求值把"装不下的数据"变成可遍历的流。',
    children: [
      { id: 'python-iteration-protocol', name: '可迭代对象与迭代器' },
      { id: 'python-iteration-generator', name: '生成器与 yield' },
      { id: 'python-iteration-lazy', name: '生成器表达式与惰性求值' },
      { id: 'python-iteration-itertools', name: 'itertools 常用组合' },
    ],
  },
  {
    id: 'python-exception',
    name: '异常与上下文管理',
    intro: '异常体系与抛出时机、try 的四个子句、异常链,以及 with 背后的上下文协议。',
    children: [
      { id: 'python-exception-hierarchy', name: '异常体系与抛出时机' },
      { id: 'python-exception-try', name: 'try / except / else / finally' },
      { id: 'python-exception-custom', name: '自定义异常与异常链' },
      { id: 'python-exception-context', name: 'with 与上下文管理器' },
    ],
  },
  {
    id: 'python-module',
    name: '模块、包与环境',
    intro: 'import 怎么找模块、包怎么组织、虚拟环境怎么隔离,以及类型提示。',
    children: [
      { id: 'python-module-import', name: 'import 机制与搜索路径' },
      { id: 'python-module-package', name: '包、__init__ 与相对导入' },
      { id: 'python-module-main', name: '模块作为脚本：__name__ 与入口' },
      { id: 'python-module-venv', name: '虚拟环境与 pip' },
      { id: 'python-module-typing', name: '类型提示与静态检查' },
    ],
  },
  {
    id: 'python-stdlib',
    name: '标准库常用',
    intro: '文件路径、序列化、日期时间、正则、collections/functools、日志与命令行。',
    children: [
      { id: 'python-stdlib-pathlib', name: '文件与路径：pathlib / os / shutil' },
      { id: 'python-stdlib-json', name: '序列化：json / csv / pickle' },
      { id: 'python-stdlib-datetime', name: '日期时间与时区' },
      { id: 'python-stdlib-re', name: '正则表达式' },
      { id: 'python-stdlib-collections', name: 'collections 与 functools' },
      { id: 'python-stdlib-logging', name: '日志与命令行：logging / argparse' },
    ],
  },
  {
    id: 'python-concurrency',
    name: '并发与异步',
    intro: 'GIL 划清多线程的边界,多进程吃满 CPU,asyncio 处理高并发 IO。',
    children: [
      { id: 'python-concurrency-gil', name: 'GIL 与多线程的边界' },
      { id: 'python-concurrency-process', name: '多进程与进程池' },
      { id: 'python-concurrency-asyncio', name: 'async / await 与事件循环' },
      { id: 'python-concurrency-asyncio-practice', name: '任务编排：gather / 超时 / 取消' },
    ],
  },
  {
    id: 'python-engineering',
    name: '工程化与测试',
    intro: 'pyproject 与依赖管理、pytest、ruff/mypy 质量闸门、打包发布。',
    children: [
      { id: 'python-engineering-pyproject', name: 'pyproject 与依赖管理（uv）' },
      { id: 'python-engineering-pytest', name: 'pytest：fixture 与参数化' },
      { id: 'python-engineering-quality', name: '代码质量：ruff / mypy' },
      { id: 'python-engineering-packaging', name: '打包与发布' },
    ],
  },
  {
    id: 'python-data',
    name: '数值与数据处理',
    intro: 'numpy 向量化、pandas 表格操作,以及视图与副本这类最容易出错的地方。',
    children: [
      { id: 'python-data-numpy', name: 'numpy 数组与向量化' },
      { id: 'python-data-pandas', name: 'pandas DataFrame 入门' },
      { id: 'python-data-view-copy', name: '视图与副本：SettingWithCopy' },
      { id: 'python-data-plot', name: '可视化：matplotlib 速览' },
    ],
  },
  {
    id: 'python-web',
    name: 'Web 与接口',
    intro: 'HTTP 客户端、FastAPI 与 Flask 的分工,以及 SQLAlchemy 数据库访问。',
    children: [
      { id: 'python-web-client', name: 'HTTP 客户端：requests / httpx' },
      { id: 'python-web-fastapi', name: 'FastAPI 入门' },
      { id: 'python-web-flask', name: 'Flask 与框架选型' },
      { id: 'python-web-orm', name: 'SQLAlchemy 与数据库访问' },
    ],
  },
  {
    id: 'python-performance',
    name: '性能与内存',
    intro: '先测量再优化:profile 工具、引用计数与循环 GC、缓存与向量化、运行时选型。',
    children: [
      { id: 'python-performance-profile', name: '测量先行：timeit / cProfile' },
      { id: 'python-performance-memory', name: '引用计数与循环 GC' },
      { id: 'python-performance-optimize', name: '优化手段：缓存 / 向量化 / 算法' },
      { id: 'python-performance-runtime', name: '运行时选型：PyPy / Cython / 扩展' },
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

/** 挂到 catalog 里 python 分类的 children 上 */
export const pythonChapters: Category[] = outline.map(toCategory)