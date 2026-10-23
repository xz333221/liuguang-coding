// 工程实战题库。
//
// 前四个题库问的是"这个词是什么、这个场景怎么办",这一条线问的是"这段代码在做什么、
// 这条链路先哪一步"。题型也换了一批:代码阅读、链路排序、多选、代码填空,
// 点一下就有结论的题只占一半。
//
// 代码片段统一用 ____ 表示待填的横线,配合 kind: 'blank'。

import type { Level } from './types'

export const engineeringLevels: Level[] = [
  // ------------------------------------------------------------------
  {
    id: 'eng-read-code',
    name: '读懂代码',
    intro: '给一段代码,判断它会输出什么、错在哪、横线该填什么。',
    questions: [
      {
        id: 'eng-1',
        kind: 'scenario',
        prompt: '这段代码打印出来的顺序是:',
        lang: 'js',
        code: `console.log('A')
setTimeout(() => console.log('B'), 0)
Promise.resolve().then(() => console.log('C'))
console.log('D')`,
        choices: [
          { text: 'A D C B', correct: true },
          { text: 'A B C D', correct: false },
          { text: 'A D B C', correct: false },
          { text: 'A C D B', correct: false },
        ],
        explain:
          '同步代码先跑完(A、D),接着清空微任务队列(C),最后才轮到定时器(B)。Promise 的回调进微任务,setTimeout 进宏任务,每一轮宏任务之前微任务都会清空。',
      },
      {
        id: 'eng-2',
        kind: 'blank',
        prompt: '这个函数要保证每次调用都拿到一个新列表,横线处填:',
        lang: 'python',
        code: `def add(item, bucket=____):
    bucket = bucket if bucket is not None else []
    bucket.append(item)
    return bucket`,
        choices: [
          { text: 'None', correct: true },
          { text: '[]', correct: false },
          { text: 'list()', correct: false },
          { text: '()', correct: false },
        ],
        explain:
          '默认参数只在函数定义时求值一次。写成 [] 的话,所有调用共用同一个列表,第二次进来的元素会接着上次的往后排。填 None 当哨兵,进函数体再新建列表。',
      },
      {
        id: 'eng-3',
        kind: 'multi',
        prompt: '这段代码埋了哪些问题?把成立的都选上:',
        lang: 'python',
        code: `def load(path):
    try:
        f = open(path)
        return json.load(f)
    except:
        pass`,
        choices: [
          { text: '文件没有关闭,出错的那条路径上句柄一直挂着', correct: true },
          { text: '光秃秃的 except 连 Ctrl+C 一起吞掉,出事后什么都看不到', correct: true },
          { text: '出错时函数悄悄返回 None,调用方拿不到失败信号', correct: true },
          { text: 'json.load 只接受字符串,传文件对象必然报错', correct: false },
          { text: 'open 默认没有读权限,得先 chmod', correct: false },
        ],
        explain:
          '三个问题连在一起:资源没释放、异常范围过大、返回值语义含糊。改成 with open(...) 管住句柄,except 收窄到 JSONDecodeError,让异常带着堆栈往外抛。',
      },
      {
        id: 'eng-4',
        kind: 'order',
        prompt: '把这段代码从定义到调用发生的顺序排好:',
        lang: 'python',
        code: `@log
@cache
def f():
    ...`,
        choices: [
          { text: 'f 这个函数对象被创建出来', correct: true },
          { text: 'cache 收下 f,交出一个带缓存的函数', correct: true },
          { text: 'log 收下上一步的结果,再在外面包一层', correct: true },
          { text: '调用 f() 时,先进 log 那一层', correct: true },
          { text: '再往里走到 cache,判断这次要不要真的算', correct: true },
        ],
        explain:
          '装饰器从下往上套:离 def 最近的先包,所以跑起来最外层是 log。读代码时按由内向外的顺序看套了几层,调用时按由外向内一层层剥。',
      },
      {
        id: 'eng-5',
        kind: 'judge',
        prompt: '执行完之后,a 的值也是 [1, 2, 3, 4]。',
        lang: 'python',
        code: `a = [1, 2, 3]
b = a
b.append(4)`,
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          'b = a 让两个名字指向同一个列表对象,谁 append 改的都是它。要一份独立副本得写 a[:] 或 list(a),赋值本身只多了一个名字。',
        link: { see: 'python/variable-is-a-name' },
      },
      {
        id: 'eng-6',
        kind: 'blank',
        prompt: '要拿到"这个 id 在不在数组里"的布尔值,横线处填:',
        lang: 'js',
        code: `const ids = users.map((u) => u.id)
const hit = ids.____((id) => id === target)`,
        choices: [
          { text: 'some', correct: true },
          { text: 'includes', correct: false },
          { text: 'find', correct: false },
          { text: 'filter', correct: false },
        ],
        explain:
          '要布尔值就用 some:命中一项立刻返回 true,后面的不再看。includes 收的是值不是函数;find 返回的是那个元素;filter 会把整个数组跑完再给你一个新数组。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'eng-ship-a-link',
    name: '跑通一条链路',
    intro: '把一件事的步骤排对:检索问答、线上处置、工具调用、首次上线。',
    questions: [
      {
        id: 'eng-7',
        kind: 'order',
        prompt: '一次检索问答,从离线到在线,把链路排好:',
        choices: [
          { text: '把语料按语义切成片段', correct: true },
          { text: '用 embedding 模型把每个片段变成向量', correct: true },
          { text: '向量连同原文一起写进向量库', correct: true },
          { text: '用户提问,先把问题改写成适合检索的样子', correct: true },
          { text: '拿问题向量去库里取回最近的若干片段', correct: true },
          { text: '用重排模型把候选片段按"答不答得上"再排一遍', correct: true },
          { text: '留下的片段拼进提示,交给模型生成答案', correct: true },
        ],
        explain:
          '前三步是离线建索引,后四步每次提问都要走一遍。重排放在检索之后:向量召回看的是"像不像",重排才看"能不能答这个问题"。',
        link: { see: 'ai/rag-pipeline' },
      },
      {
        id: 'eng-8',
        kind: 'multi',
        prompt: '线上检索问答答不到点上,下面哪些属于该先查的环节?',
        choices: [
          { text: '召回的片段里到底有没有那句正确答案', correct: true },
          { text: '切分粒度是不是正好把答案切成了两半', correct: true },
          { text: '重排后留下的前几条,和问题是不是同一件事', correct: true },
          { text: 'temperature 是不是设得太低', correct: false },
          { text: '向量维度是不是 1536', correct: false },
        ],
        explain:
          '先确认材料有没有送到模型手里,再谈模型用得对不对。召回和切分决定效果下限;temperature 只改措辞的随机性,维度则是建索引时定死的常量。',
        link: { see: 'ai/rag-pipeline' },
      },
      {
        id: 'eng-9',
        kind: 'order',
        prompt: '线上开始报 5xx,把处置顺序排好:',
        choices: [
          { text: '看监控和错误日志,定位第一个报错的时间点和接口', correct: true },
          { text: '对照发版记录,确认那段时间有没有上线或改配置', correct: true },
          { text: '回滚到上一个可用版本,先把血止住', correct: true },
          { text: '在预发或本地把同样的请求复现出来', correct: true },
          { text: '沿着复现路径定位根因,补测试,写复盘', correct: true },
        ],
        explain:
          '先止损再定位。最容易被跳过的是第二步:相当一部分故障不在代码里,而在配置、依赖版本和配额上。',
      },
      {
        id: 'eng-10',
        kind: 'order',
        prompt: '一次工具调用回合里,事情发生的先后顺序:',
        choices: [
          { text: '模型判断这次该调工具,给出工具名和参数', correct: true },
          { text: '你的代码按参数真的去执行这个工具', correct: true },
          { text: '把执行结果作为一条工具消息回填给模型', correct: true },
          { text: '模型带着工具结果继续生成回答', correct: true },
        ],
        explain:
          '模型只负责"决定调用"和"读懂结果",真正的执行永远在你这一侧的代码里。工具返回什么,模型下一步就只能看到什么。',
        link: { see: 'ai/tool-calling' },
      },
      {
        id: 'eng-11',
        kind: 'multi',
        prompt: '一次上线前的检查,下面哪些值得做?',
        choices: [
          { text: '新接口在预发环境跑通,失败分支也跑一遍', correct: true },
          { text: '数据库变更能回滚,大表上的耗时也估算过', correct: true },
          { text: '关键路径补上日志和耗时打点', correct: true },
          { text: '日志级别全开到 debug,上线之后再慢慢关', correct: false },
          { text: '先把功能全量放开,用户量小,有问题也看不出来', correct: false },
        ],
        explain:
          '上线前要回答两个问题:出事能不能看见,出事能不能退回去。全量放开和全量 debug 恰好把这两件事都堵死了。',
      },
      {
        id: 'eng-12',
        kind: 'scenario',
        prompt: '一个接口平时 80ms,偶尔飙到 3s,日志里看不出差别。下一步最该做的:',
        choices: [
          { text: '给关键阶段加耗时打点,把 3s 拆到具体哪一段', correct: true },
          { text: '把超时时间从 3s 调到 10s', correct: false },
          { text: '加机器,先扛住', correct: false },
          { text: '把日志量调大,祈祷下次能抓到', correct: false },
        ],
        explain:
          '偶尔出现的长尾,先要能分段计时。拿到"哪一段慢"之前,所有猜测都只能靠运气,而运气通常不在你这边。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'eng-interview-drill',
    name: '面试追问',
    intro: '面试里最容易接着往下问的那几层:微调边界、参数取舍、多智能体的代价。',
    questions: [
      {
        id: 'eng-13',
        kind: 'multi',
        prompt: '业务方想让模型更懂内部的行话,下面哪些属于"该走微调"的信号?',
        choices: [
          { text: '要的是稳定的输出风格和固定格式,提示词已经压不住', correct: true },
          { text: '这类判断只有内部标注数据能教会模型', correct: true },
          { text: '想让模型知道最新一版产品文档', correct: false },
          { text: '想让回答里引用今天的数据', correct: false },
        ],
        explain:
          '微调改的是"怎么说"和"怎么判断",知识更新还是靠检索。文档每天都在变,权重不可能跟着重训,这是两条不同的路。',
        link: { see: 'ai/fine-tuning' },
      },
      {
        id: 'eng-14',
        kind: 'judge',
        prompt: '把知识库文档更新到最新,微调过的模型就自动会说新内容了。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '微调把知识写进了权重,权重不会因为文档更新而变。新知识走检索进上下文,微调负责风格、格式和判断方式。',
        link: { see: 'ai/fine-tuning' },
      },
      {
        id: 'eng-15',
        kind: 'blank',
        prompt: '要让"同一段提示每次输出尽量一致",横线处填:',
        lang: 'python',
        code: `resp = client.chat.completions.create(
    model=MODEL,
    messages=messages,
    temperature=____,
)`,
        choices: [
          { text: '0', correct: true },
          { text: '0.7', correct: false },
          { text: '1', correct: false },
          { text: '2', correct: false },
        ],
        explain:
          'temperature 越低分布越尖,越接近每次都挑概率最高的那个 token。要更稳还得固定模型版本和 seed,温度只是其中一环。',
        link: { term: 'temperature', see: 'ai/temperature-and-sampling' },
      },
      {
        id: 'eng-16',
        kind: 'multi',
        prompt: '多智能体方案里,下面哪些说法成立?',
        choices: [
          { text: '每个角色一套提示和工具,职责边界更清楚', correct: true },
          { text: '角色之间传的是文本,信息在转述里会损耗', correct: true },
          { text: '环节变多,出错的地方和排查成本一起变多', correct: true },
          { text: '角色越多,整体效果一定越好', correct: false },
          { text: '多智能体不需要主控,各自跑各自的就行', correct: false },
        ],
        explain:
          '拆角色的收益是每件事更专注,代价是多几道转述。工程上先问一句:单智能体加几个工具,是不是也能做到?',
        link: { see: 'ai/multi-agent' },
      },
      {
        id: 'eng-17',
        kind: 'order',
        prompt: '第一次跑通一个 AI 功能,把顺序排好:',
        choices: [
          { text: '先用最笨的提示跑一遍,确认模型能做这件事', correct: true },
          { text: '准备一小批真实输入,把输出存下来人工看', correct: true },
          { text: '针对看出来的问题改提示,再跑同一批输入', correct: true },
          { text: '把稳定下来的提示和参数写进代码,补日志', correct: true },
          { text: '上线后按真实流量抽样复查,继续调', correct: true },
        ],
        explain:
          '先花最小成本确认"能不能",再谈"稳不稳"。中间那批固定输入是标尺:同一批输入前后对比,才知道这次改动是变好还是变坏。',
      },
      {
        id: 'eng-18',
        kind: 'scenario',
        prompt: '同事说"这个功能上了大模型,但结果时好时坏"。你最想先要的东西是:',
        choices: [
          { text: '一批带标准答案的真实输入,和当前的输出记录', correct: true },
          { text: '更大的模型和更高的额度', correct: false },
          { text: '一份更长的系统提示', correct: false },
          { text: '一个能自动重试的封装', correct: false },
        ],
        explain:
          '"时好时坏"是症状,不是问题。先有输入和输出的对照,才分得清是召回没给对、提示没说清,还是这个任务本身就没有确定答案。',
      },
    ],
  },
]
