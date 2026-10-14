// AI 应用开发面试题库。
//
// 每关对应面试知识地图上的一个分支,题目按"认得出术语 → 分得清概念 → 知道坑在哪"排。
// 题干和解析都写面试口径:能一句话讲清,也接得住追问。
// 解析里能指回站内已有内容的地方,用 link 挂上术语表锚点或知识点地址。

import type { Level } from './types'

export const aiLevels: Level[] = [
  // ------------------------------------------------------------------
  {
    id: 'prompt-engineering',
    name: '提示词工程',
    intro: '提示词怎么改模型的行为:角色、示例、思维链与约束的边界。',
    questions: [
      {
        id: 'pe-1',
        kind: 'term2def',
        prompt: '「少样本提示(few-shot)」指的是:',
        choices: [
          { text: '在提示里放几组「输入 → 输出」的示例,让模型照着样子做', correct: true },
          { text: '每次请求只带少量 token,省费用', correct: false },
          { text: '先用小模型跑一遍,再让大模型复核', correct: false },
          { text: '把提示词写得很短,只留关键词', correct: false },
        ],
        explain:
          '少样本提示给的是任务的形状:格式、粒度、边界。示例让模型推断"我要的是这种东西",它不改变模型参数。',
      },
      {
        id: 'pe-2',
        kind: 'judge',
        prompt: '系统提示(system prompt)在推理时会被写进模型权重,从而改变模型的能力。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '提示词在推理时只是输入的前缀,模型参数不动。它改变的是模型看到的前文,效果上限由模型本身决定。',
      },
      {
        id: 'pe-3',
        kind: 'scenario',
        prompt: '让模型依据给定材料回答,它却经常自己编内容。最省事的一招是:',
        choices: [
          { text: '在提示里写明「只依据给定材料回答,材料里没有就回答不知道」', correct: true },
          { text: '把 temperature 调到 0,并把上下文窗口开到最大', correct: false },
          { text: '换一个参数量更大的模型,其他都不动', correct: false },
          { text: '在提示末尾加一句「你必须答对」', correct: false },
        ],
        explain:
          '先给模型一个"没依据就明说"的出口,是压住无据生成最直接的手段。temperature 只影响采样随机性,窗口大小管的是能看多少。',
      },
      {
        id: 'pe-4',
        kind: 'term2def',
        prompt: '思维链(Chain-of-Thought)提示的做法是:',
        choices: [
          { text: '让模型把推理步骤一步步写出来,再给结论', correct: true },
          { text: '把多个提示串成一条流水线依次调用', correct: false },
          { text: '用多轮对话让模型逐步补充答案', correct: false },
          { text: '让模型先列关键词再组织语言', correct: false },
        ],
        explain:
          'CoT 让模型显式展开中间步骤,在算术、多步推理类任务上收益明显。它是提示层的技巧,不涉及训练。',
      },
      {
        id: 'pe-5',
        kind: 'judge',
        prompt: '同一段提示,把 temperature 从 0.7 调到 0.1,输出会更稳定、重复率更高。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '温度压低后分布更尖,高概率候选更容易被选中,输出更稳定;代价是多样性下降、容易套路化。',
        link: { term: 'temperature', see: 'ai/temperature-and-sampling' },
      },
      {
        id: 'pe-6',
        kind: 'scenario',
        prompt: '要求模型输出 JSON,它老是裹一层废话或者缺字段。最稳的做法是:',
        choices: [
          { text: '给一段期望输出的 JSON 示例,并说明每个字段的含义与缺失时怎么填', correct: true },
          { text: '在提示里反复强调「请务必」', correct: false },
          { text: '把提示词翻译成英文再发一次', correct: false },
          { text: '把 max_tokens 调大,让它有空间写完', correct: false },
        ],
        explain:
          '结构化输出靠「示例 + 字段说明」最稳。多数接口也提供 JSON mode,或用工具调用里的参数 schema 强约束格式。',
      },
      {
        id: 'pe-7',
        kind: 'term2def',
        prompt: '让模型「扮演一位资深后端工程师」,这类角色提示起作用的地方是:',
        choices: [
          { text: '约束回答的口吻、视角与默认取舍', correct: true },
          { text: '给模型加载对应领域的专业知识', correct: false },
          { text: '切换底层模型', correct: false },
          { text: '给模型额外的私有知识', correct: false },
        ],
        explain:
          '角色提示是在上下文里给模型一个立场,影响它选词、深度与侧重点。模型没学过的知识,它不会因此就有。',
      },
      {
        id: 'pe-8',
        kind: 'judge',
        prompt: '提示词工程没有上限,只要写得足够好,小模型能稳定超过大模型。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '提示词改变的是条件与引导,能力上限来自参数与训练。提示词能缩小差距,稳定的能力差距要靠换模型或微调。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'context-memory',
    name: '上下文与记忆',
    intro: '窗口里放什么、放不下怎么办、跨会话怎么记住用户。',
    questions: [
      {
        id: 'cm-1',
        kind: 'term2def',
        prompt: '「上下文窗口」指的是:',
        choices: [
          { text: '模型一次能处理的 token 总量上限,超出的部分它看不到', correct: true },
          { text: '系统提示可以占用的最大字节数', correct: false },
          { text: '多轮对话能保存的历史条数', correct: false },
          { text: '模型训练时见过的语料规模', correct: false },
        ],
        explain:
          '窗口由位置编码与注意力开销决定。注意力对序列长度是 O(n²),窗口越长成本越高,这是窗口有限的根源。',
        link: { term: 'context-window', see: 'ai/attention-mechanism' },
      },
      {
        id: 'cm-2',
        kind: 'scenario',
        prompt: '长对话聊到后面,模型开始忘掉最早提的需求。最直接的处理是:',
        choices: [
          { text: '把最早的需求与关键结论整理成摘要,替换掉原始长历史', correct: true },
          { text: '把 temperature 调高,让模型更有想象力', correct: false },
          { text: '每轮都把完整历史原样重发一遍,不做任何处理', correct: false },
          { text: '让模型每轮先自我复述一遍', correct: false },
        ],
        explain:
          '窗口有限,滚动摘要(把老历史压成要点、保留近期原文)是常见做法。原样重发既费 token,也未必保得住关键信息。',
      },
      {
        id: 'cm-3',
        kind: 'judge',
        prompt: '把资料塞进上下文窗口,模型就会严格依据这些资料回答。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '长上下文里的信息会被稀释,模型仍可能被训练先验带偏。要它依据资料,还得在提示里明确要求「以给定材料为准」,并做好检索排序。',
      },
      {
        id: 'cm-4',
        kind: 'term2def',
        prompt: '短期记忆与长期记忆在 Agent 里的分工是:',
        choices: [
          { text: '短期记忆是当前会话的上下文,长期记忆是跨会话存下来的事实与偏好', correct: true },
          { text: '短期指模型参数,长期指缓存', correct: false },
          { text: '短期存在 GPU 里,长期存在磁盘里', correct: false },
          { text: '两者是一回事,只是命名不同', correct: false },
        ],
        explain:
          '会话内靠上下文窗口,跨会话要把要点落到外部存储,用到时再检索回来。这是记忆机制最常见的分层。',
      },
      {
        id: 'cm-5',
        kind: 'scenario',
        prompt: '用户偏好「回答控制在三行内」,希望换个会话也生效。该怎么做:',
        choices: [
          { text: '把这条偏好写进长期记忆,每次请求时注入', correct: true },
          { text: '写在当前会话的 system prompt 里,不做持久化', correct: false },
          { text: '调高 temperature,让回答更短', correct: false },
          { text: '把 max_tokens 设成 100', correct: false },
        ],
        explain:
          '跨会话生效的偏好要落到外部存储,并在每次请求时作为上下文注入。max_tokens 只是截断,不是「更短的表达」。',
      },
      {
        id: 'cm-6',
        kind: 'judge',
        prompt: '上下文窗口越长,推理成本按线性比例增长。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '注意力的计算量随序列长度平方增长,成本是超线性的。长上下文贵,这是它要被节约使用的根本原因。',
      },
      {
        id: 'cm-7',
        kind: 'term2def',
        prompt: '「上下文工程」的常见手段是:',
        choices: [
          { text: '检索、摘要、裁剪与重排,把有限的窗口留给最相关的信息', correct: true },
          { text: '把提示词写成更长的英文长句', correct: false },
          { text: '关掉历史记录以节省 token', correct: false },
          { text: '提高 temperature 让模型更聚焦', correct: false },
        ],
        explain:
          '上下文工程的核心问题是「窗口里放什么」。检索召回、重排、摘要、裁剪,都是为这一件事服务的。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'rag',
    name: '检索增强生成',
    intro: 'RAG 的链路、切分与召回排序,以及最常见的翻车点。',
    questions: [
      {
        id: 'rag-1',
        kind: 'term2def',
        prompt: 'RAG 解决的主要问题是:',
        choices: [
          { text: '模型没见过私有或最新资料时,靠检索把资料喂进上下文', correct: true },
          { text: '让模型训练速度更快', correct: false },
          { text: '把模型压缩成更小的体积', correct: false },
          { text: '替代模型微调,成为唯一的知识注入方案', correct: false },
        ],
        explain:
          'RAG = 检索 + 生成:先检索相关资料,拼进提示,再让模型基于这些资料回答。适合知识更新快、有私有语料的场景。',
        link: { term: 'embedding' },
      },
      {
        id: 'rag-2',
        kind: 'term2def',
        prompt: '文档切分(chunking)的目的是:',
        choices: [
          { text: '把长文档切成可检索的小块,让召回更精准', correct: true },
          { text: '减少磁盘占用', correct: false },
          { text: '让模型训练更稳定', correct: false },
          { text: '把文档翻译成向量', correct: false },
        ],
        explain:
          '切块决定检索的最小单位。切太大稀释相似度,切太小丢上下文;常见做法是按语义或标题切,并保留重叠区。',
      },
      {
        id: 'rag-3',
        kind: 'judge',
        prompt: '向量检索召回的结果一定按相关度从高到低排好,直接送给模型即可。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '向量召回是近似最近邻,排序粗;后面常接重排模型(rerank)做精排,再截断送给模型。',
      },
      {
        id: 'rag-4',
        kind: 'scenario',
        prompt: '检索回来的片段看起来相关,模型的回答却漏了关键数字。最先该查:',
        choices: [
          { text: '片段是否被截断、关键数字是否断在切块边界上', correct: true },
          { text: '模型参数量是否够大', correct: false },
          { text: 'temperature 是否过高', correct: false },
          { text: '要不要给模型加思维链提示', correct: false },
        ],
        explain:
          'RAG 答非所问常出在检索侧:切块把关键句切断、召回排序把关键片段挤出前几条。先看真正喂进去的上下文,再调模型。',
      },
      {
        id: 'rag-5',
        kind: 'term2def',
        prompt: '混合检索(向量 + 关键词)的动机是:',
        choices: [
          { text: '向量擅长语义相近,关键词擅长编号、型号这类精确匹配', correct: true },
          { text: '两种索引互相备份,防止故障', correct: false },
          { text: '向量索引太占内存', correct: false },
          { text: '为了支持中文', correct: false },
        ],
        explain:
          '编号、型号、专有名词这类查询,关键词检索(如 BM25)往往比向量更准;两者融合能互补召回。',
      },
      {
        id: 'rag-6',
        kind: 'judge',
        prompt: 'RAG 和微调都能注入新知识,两者可以互相替代。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'RAG 注入的是「可检索的资料」,改知识不用动参数;微调改变的是模型的行为风格与格式。频繁更新的知识优先 RAG。',
      },
      {
        id: 'rag-7',
        kind: 'scenario',
        prompt: '用户问「去年我们厂的报废率是多少」,语料在 PDF 扫描件里。最可能卡住的一环是:',
        choices: [
          { text: '扫描件没做 OCR,检索不到文字', correct: true },
          { text: '模型上下文窗口不够', correct: false },
          { text: '没有开思维链', correct: false },
          { text: '温度太高', correct: false },
        ],
        explain:
          'RAG 的起点是「资料变成可检索的文本」。扫描件不做 OCR,后面每个环节做得再好也召不回内容。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'tool-calling',
    name: '工具调用与协议',
    intro: '模型只产出调用意图,执行、鉴权与容错都在业务侧。',
    questions: [
      {
        id: 'tc-1',
        kind: 'term2def',
        prompt: '「工具调用(function calling）」里模型负责的事情是:',
        choices: [
          { text: '按约定的 schema 输出「要调哪个工具、参数是什么」', correct: true },
          { text: '直接连数据库执行 SQL', correct: false },
          { text: '在后台自动联网搜索', correct: false },
          { text: '保管第三方 API 的密钥', correct: false },
        ],
        explain:
          '模型只负责产出结构化的调用意图,真正的执行、鉴权、拿结果都在外部完成。密钥与权限留在业务侧。',
      },
      {
        id: 'tc-2',
        kind: 'judge',
        prompt: '工具调用的参数格式写错时,模型会自己重试直到成功。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '模型不会自动重试。参数校验失败要把错误信息回给模型,让它修正后重新产出;这一轮重试由业务代码控制。',
      },
      {
        id: 'tc-3',
        kind: 'term2def',
        prompt: 'MCP(Model Context Protocol)的定位是:',
        choices: [
          { text: '让模型客户端与工具、数据源对接的标准协议,工具接入一次多方可用', correct: true },
          { text: '一种新的模型训练方法', correct: false },
          { text: '模型厂商之间的推理速度标准', correct: false },
          { text: '向量数据库的存储格式', correct: false },
        ],
        explain:
          'MCP 把「工具怎么描述、怎么发现、怎么调用」标准化:客户端按协议接,工具方按协议暴露,省掉两边各写一遍适配。',
      },
      {
        id: 'tc-4',
        kind: 'scenario',
        prompt: '工具调用偶发超时,重试后发现订单被创建了两次。根因和处理是:',
        choices: [
          { text: '创建类接口没做幂等,重试前要用同一业务号去重', correct: true },
          { text: 'temperature 太高导致模型重复调用', correct: false },
          { text: '网络带宽不够', correct: false },
          { text: '上下文窗口太小', correct: false },
        ],
        explain:
          '超时后重试是常态,写操作必须幂等:同一请求号重复提交只生效一次。这是工具调用容错的基本功。',
      },
      {
        id: 'tc-5',
        kind: 'term2def',
        prompt: '工具调用的容错机制通常包括:',
        choices: [
          { text: '参数校验、超时与重试、幂等、失败信息回传让模型修正', correct: true },
          { text: '提高 max_tokens 与降低 temperature', correct: false },
          { text: '把工具列表缩短到只剩一个', correct: false },
          { text: '换一个更大的模型', correct: false },
        ],
        explain:
          '工具链的稳定性靠工程手段:超时、退避重试、幂等键、错误回传。这些是业务代码的责任,不是模型的责任。',
      },
      {
        id: 'tc-6',
        kind: 'judge',
        prompt: '外部工具链里,数据库和业务系统应该让模型直连,少一层中转更快。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '模型只应产出调用意图。直连数据库会把权限、注入风险、审计全部交给不可控的一层;正确做法是业务侧封装受控接口。',
      },
      {
        id: 'tc-7',
        kind: 'scenario',
        prompt: '某个工具一次返回三万行 JSON,模型开始胡言乱语。该处理的是:',
        choices: [
          { text: '在工具侧做字段裁剪或分页,只把必要字段回给模型', correct: true },
          { text: '把结果原样塞满上下文窗口', correct: false },
          { text: '让模型先复述一遍再回答', correct: false },
          { text: '换一个 temperature', correct: false },
        ],
        explain:
          '工具结果也要做上下文工程:裁剪字段、分页、摘要。塞太多原始数据会稀释关键信息,还把成本推上去。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'planning',
    name: '任务规划',
    intro: '怎么分解、怎么边看边走、什么时候该停。',
    questions: [
      {
        id: 'plan-1',
        kind: 'term2def',
        prompt: 'ReAct 的做法是:',
        choices: [
          { text: '思考与行动交替:先推理下一步,再调工具,根据观察继续', correct: true },
          { text: '一次性把整段答案写完', correct: false },
          { text: '多个模型同时回答再投票', correct: false },
          { text: '先训练再推理', correct: false },
        ],
        explain:
          'ReAct 让「想」和「做」交替进行,每一步的观察成为下一步推理的输入,适合需要查资料的逐步任务。',
      },
      {
        id: 'plan-2',
        kind: 'judge',
        prompt: '任务分解得越细,完成质量一定越高。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '分解带来上下文增长与误差累积,每多一层传递就多一次信息损耗。能整体做的步骤硬拆开,反而更难收尾。',
      },
      {
        id: 'plan-3',
        kind: 'scenario',
        prompt: 'Agent 第一步就跑偏,后面全错还停不下来。最该补的机制是:',
        choices: [
          { text: '给每步设检查点与终止条件,跑偏就回退或收尾', correct: true },
          { text: '把 temperature 调到 0', correct: false },
          { text: '增加工具数量', correct: false },
          { text: '换更大的上下文窗口', correct: false },
        ],
        explain:
          '规划类任务要能「停下来」:步数上限、每步自检、失败回退。没有终止条件,误差会一路放大。',
      },
      {
        id: 'plan-4',
        kind: 'term2def',
        prompt: '「反思(reflection)」在 Agent 流程里指的是:',
        choices: [
          { text: '让模型检查自己上一步的输出,再决定修正还是继续', correct: true },
          { text: '把历史记录打印出来给人看', correct: false },
          { text: '训练时回传梯度', correct: false },
          { text: '降低 temperature', correct: false },
        ],
        explain:
          '反思是把「评估」也变成一次模型调用,用它的判断驱动修正循环。代价是更多轮调用与更长的链路。',
      },
      {
        id: 'plan-5',
        kind: 'judge',
        prompt: '「先出完整计划、再逐步执行」适合步骤会随中间结果变化的开放式任务。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '步骤强依赖中间结果时,先定死计划容易失效;这类任务更适合边观察边规划的交互式流程。计划-执行适合步骤相对确定的任务。',
      },
      {
        id: 'plan-6',
        kind: 'scenario',
        prompt: '任务是「先查库存,有货才下单,没货给替代建议」。怎么表达最稳:',
        choices: [
          { text: '写成带条件分支的流程:查询 → 判断 → 分支处理', correct: true },
          { text: '让模型自由发挥,它很聪明', correct: false },
          { text: '把三步合成一次调用以减少延迟', correct: false },
          { text: '全部用硬编码 if-else,完全不用模型', correct: false },
        ],
        explain:
          '有条件依赖的任务要把分支写清楚(或用图状流程表达)。依赖判断结果的步骤,不能提前拍死顺序。',
      },
      {
        id: 'plan-7',
        kind: 'term2def',
        prompt: '计划该切多细,判断依据是:',
        choices: [
          { text: '按「是否需要外部信息、是否可独立验证」来切,能合并的合并', correct: true },
          { text: '越细越好', correct: false },
          { text: '越粗越好', correct: false },
          { text: '固定分成五步', correct: false },
        ],
        explain:
          '粒度的判断标准是信息依赖与可验证性:需要查资料的单独成步,能本地算完的合并处理。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'multi-agent',
    name: '多智能体协作',
    intro: '什么时候该拆成多个 Agent,以及拆了之后怎么收得住。',
    questions: [
      {
        id: 'ma-1',
        kind: 'term2def',
        prompt: '多智能体协作的典型收益是:',
        choices: [
          { text: '按角色拆分职责,各自用合适的提示与工具,复杂任务更好组织', correct: true },
          { text: '一定比单智能体更快', correct: false },
          { text: '能突破上下文窗口的限制', correct: false },
          { text: '可以免掉工具调用', correct: false },
        ],
        explain:
          '多 Agent 的价值在「分工与上下文隔离」:每个 Agent 只带自己那部分上下文,职责清晰。代价是通信开销与编排复杂度。',
      },
      {
        id: 'ma-2',
        kind: 'judge',
        prompt: 'Agent 数量越多,任务完成得越好。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '多一个 Agent 就多一次信息传递损耗、多一个出错面。简单任务上单 Agent 往往更稳,职责与上下文确实需要隔离时才拆。',
      },
      {
        id: 'ma-3',
        kind: 'term2def',
        prompt: '多智能体之间常见的通信方式是:',
        choices: [
          { text: '消息传递:把结构化的结果交给下一个角色', correct: true },
          { text: '共享模型权重', correct: false },
          { text: '共用同一个上下文窗口', correct: false },
          { text: '直接读取对方内存', correct: false },
        ],
        explain:
          'Agent 间靠消息与共享状态交换信息。消息要结构化、带版本,否则口径会在传递中慢慢漂移。',
      },
      {
        id: 'ma-4',
        kind: 'scenario',
        prompt: '两个 Agent 互相请求对方补充信息,循环往复停不下来。根因是:',
        choices: [
          { text: '缺少终止条件与责任边界,任务在两者之间被反复踢皮球', correct: true },
          { text: 'temperature 太低', correct: false },
          { text: '上下文窗口太大', correct: false },
          { text: '工具返回太慢', correct: false },
        ],
        explain:
          '协作流程要有明确的终止条件与仲裁角色。没有边界,互相触发会形成无限循环。',
      },
      {
        id: 'ma-5',
        kind: 'term2def',
        prompt: '「编排(orchestration)」模式指的是:',
        choices: [
          { text: '有一个中心角色负责分派与汇总,其他角色只干自己的事', correct: true },
          { text: '所有 Agent 同时回答,取票数最高的', correct: false },
          { text: '把多个模型并联以提高吞吐', correct: false },
          { text: '用队列缓冲请求', correct: false },
        ],
        explain:
          '编排模式由一个中枢决定谁来做下一步、何时收尾。与之相对的是各角色自主协商的去中心化模式,后者更难控。',
      },
      {
        id: 'ma-6',
        kind: 'judge',
        prompt: 'AutoGen 和 MetaGPT 解决的问题一样,选哪个都行。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '它们都做多 Agent,抽象层次却不同:有的偏对话协议,有的偏角色化流程。选型看团队要的抽象程度与可控性。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'frameworks',
    name: '技术框架',
    intro: '几个常见框架各自的战场,以及选型的判断依据。',
    questions: [
      {
        id: 'fw-1',
        kind: 'term2def',
        prompt: 'LangGraph 相对 LangChain 的定位是:',
        choices: [
          { text: '用图来编排带状态、可循环的流程,适合有条件分支和回退的 Agent', correct: true },
          { text: 'LangGraph 是 LangChain 的旧名字', correct: false },
          { text: '两者互不相关', correct: false },
          { text: 'LangGraph 只能做检索', correct: false },
        ],
        explain:
          'LangGraph 把流程表达成节点与边的图,支持状态与循环,适合需要条件分支、回退的 Agent 编排。',
      },
      {
        id: 'fw-2',
        kind: 'term2def',
        prompt: 'LlamaIndex 的主战场是:',
        choices: [
          { text: '数据接入、索引与检索,把私有资料变成可查询的知识', correct: true },
          { text: '多模态图像生成', correct: false },
          { text: '模型训练与微调', correct: false },
          { text: '前端界面开发', correct: false },
        ],
        explain:
          'LlamaIndex 强在数据侧:加载、切分、索引、检索与查询引擎,RAG 场景常用。',
      },
      {
        id: 'fw-3',
        kind: 'term2def',
        prompt: 'Dify 与 Coze 的定位是:',
        choices: [
          { text: '低代码搭建 AI 应用的平台,含提示管理、知识库与工作流', correct: true },
          { text: '两个模型训练框架', correct: false },
          { text: '两个向量数据库', correct: false },
          { text: '两个推理加速库', correct: false },
        ],
        explain:
          '这类平台把提示、知识库、工具与工作流做成可视化配置,适合快速验证与内部工具;深度定制仍要写代码。',
      },
      {
        id: 'fw-4',
        kind: 'judge',
        prompt: 'AutoGPT 展示了 Agent 自主完成任务的潜力,因此可以直接用于生产环境的核心流程。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'AutoGPT 证明了自主循环的潜力,也暴露了目标漂移、成本失控、可靠性不足的问题。生产环境要加约束、检查点与人工兜底。',
      },
      {
        id: 'fw-5',
        kind: 'term2def',
        prompt: 'AutoGen、MetaGPT 这类多 Agent 框架的核心抽象是:',
        choices: [
          { text: '角色 + 对话/流程协议,让多个 Agent 分工协作', correct: true },
          { text: '模型并行推理', correct: false },
          { text: '分布式训练', correct: false },
          { text: '数据清洗流水线', correct: false },
        ],
        explain:
          '它们把「多个有角色的模型实例如何对话与交接」做成框架能力,开发者写角色与流程,不用从零搭消息机制。',
      },
      {
        id: 'fw-6',
        kind: 'scenario',
        prompt: '需求是两周内上线一个内部知识问答,后期可能要换框架。选型思路是:',
        choices: [
          { text: '先用 Dify/Coze 这类平台验证,把提示与知识库沉淀成可迁移的数据', correct: true },
          { text: '直接选当下最流行的框架,一路写死', correct: false },
          { text: '自己从零搭一套', correct: false },
          { text: '等下一个新框架发布再说', correct: false },
        ],
        explain:
          '平台适合快速验证。把提示词、知识库与评测集整理成与框架无关的数据,后面才换得动。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'finetune',
    name: '大模型微调',
    intro: 'SFT 教的是什么、LoRA 省的是什么、什么时候该微调。',
    questions: [
      {
        id: 'ft-1',
        kind: 'term2def',
        prompt: 'SFT(监督微调)主要在教模型:',
        choices: [
          { text: '按要求的格式与风格回答', correct: true },
          { text: '记住大量新的事实知识', correct: false },
          { text: '提高推理速度', correct: false },
          { text: '获得检索能力', correct: false },
        ],
        explain:
          'SFT 教的是「怎么答」:格式、口吻、边界。要注入新知识,微调的效率低,靠检索与更新语料更可靠。',
        link: { term: 'training-vs-inference' },
      },
      {
        id: 'ft-2',
        kind: 'judge',
        prompt: '要注入经常变化的业务知识,微调比 RAG 更合适。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '知识更新频繁时,微调每次都要重训,成本高还容易灾难性遗忘。知识优先放检索层,微调留给稳定的行为与格式。',
      },
      {
        id: 'ft-3',
        kind: 'term2def',
        prompt: 'LoRA 的思路是:',
        choices: [
          { text: '冻结原权重,训练一组低秩增量,显著降低微调的显存与存储开销', correct: true },
          { text: '把模型层数减少一半', correct: false },
          { text: '用更少的训练数据', correct: false },
          { text: '把模型量化到 4bit', correct: false },
        ],
        explain:
          'LoRA 用低秩矩阵近似权重更新,只训练增量部分。原始权重不动,可插拔、易回滚。',
      },
      {
        id: 'ft-4',
        kind: 'term2def',
        prompt: '全量微调与 LoRA 的取舍是:',
        choices: [
          { text: '全量改全部参数,上限高但显存与存储代价大;LoRA 省资源,多数场景够用', correct: true },
          { text: 'LoRA 的效果一定更好', correct: false },
          { text: '全量微调一定更快', correct: false },
          { text: '两者对训练数据的要求一样', correct: false },
        ],
        explain:
          '资源与可控性优先选 LoRA;追求极限效果且资源充足时上全量。选型看显存、迭代频率与回滚需求。',
      },
      {
        id: 'ft-5',
        kind: 'judge',
        prompt: '微调之后,模型就不会胡说了。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '幻觉是生成机制的固有倾向。微调能降低特定场景的出错率,最终还要靠检索、格式约束与结果校验来兜底。',
      },
      {
        id: 'ft-6',
        kind: 'scenario',
        prompt: '模型能力够用,但输出格式总是不符合内部规范。最直接的路是:',
        choices: [
          { text: '先用提示词加示例压格式,稳不下来再上 SFT', correct: true },
          { text: '立刻做全量微调', correct: false },
          { text: '换一个更大的模型', correct: false },
          { text: '提高 temperature 增加多样性', correct: false },
        ],
        explain:
          '格式问题先在提示层解决:给示例、用 JSON 约束。确实稳不下来,再用少量规范样例做 SFT,成本最低。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'capability',
    name: '大模型能力演进',
    intro: '长上下文、推理模型、多模态与降本,以及面试常问的判断。',
    questions: [
      {
        id: 'cap-1',
        kind: 'term2def',
        prompt: '上下文窗口从几千扩到几十万 token,主要瓶颈是:',
        choices: [
          { text: '注意力的 O(n²) 开销与外推能力', correct: true },
          { text: '磁盘容量', correct: false },
          { text: '模型层数', correct: false },
          { text: '词表大小', correct: false },
        ],
        explain:
          '长上下文靠架构优化(稀疏/线性注意力、RoPE 外推、KV 缓存压缩)与工程优化推进,代价是成本与延迟。',
      },
      {
        id: 'cap-2',
        kind: 'judge',
        prompt: '推理模型(reasoning model)就是 temperature 更低的普通模型。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '推理模型通过训练学会展开中间推理,行为在推理阶段也由训练塑造,不是采样参数的变化。',
      },
      {
        id: 'cap-3',
        kind: 'term2def',
        prompt: '「多模态大模型」指的是:',
        choices: [
          { text: '能处理文本之外的图像、音频等输入的模型', correct: true },
          { text: '同时运行多个模型', correct: false },
          { text: '支持多语言的模型', correct: false },
          { text: '部署在多台机器上的模型', correct: false },
        ],
        explain:
          '多模态把不同输入编码到同一表示空间,统一做理解与生成。',
      },
      {
        id: 'cap-4',
        kind: 'judge',
        prompt: '在特定业务上,模型越大效果一定越好。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '特定业务的表现取决于数据匹配、提示与流程设计。小模型加检索与微调,常在垂直场景比通用大模型更稳也更省。',
      },
      {
        id: 'cap-5',
        kind: 'term2def',
        prompt: '近几年大模型能力演进的主线是:',
        choices: [
          { text: '更长上下文、更强推理、多模态、更低推理成本', correct: true },
          { text: '只堆参数量', correct: false },
          { text: '只提升训练速度', correct: false },
          { text: '只扩大词表', correct: false },
        ],
        explain:
          '行业的重点从「更大」转向「更长、更会推理、更多模态、更便宜」。',
      },
      {
        id: 'cap-6',
        kind: 'term2def',
        prompt: '量化(quantization)的作用是:',
        choices: [
          { text: '把权重压到低比特,降低显存占用与推理成本', correct: true },
          { text: '提高模型参数量', correct: false },
          { text: '让模型学会更多语言', correct: false },
          { text: '加快训练速度', correct: false },
        ],
        explain:
          '量化用更低比特表示权重,显存与带宽开销明显下降,多数场景精度损失可控。',
      },
      {
        id: 'cap-7',
        kind: 'judge',
        prompt: '针对场景做过提示、检索与校验优化的流程,通常比裸调模型收益更大且更可控。',
        choices: [
          { text: '对', correct: true },
          { text: '错', correct: false },
        ],
        explain:
          '工程化的提示、检索与结果校验往往比换模型更快见效,也更容易回滚。先用工程手段逼近上限,再考虑换模型。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'ops',
    name: '运维与部署',
    intro: '容器化、调度、可观测性与发布,面试里的工程判断题。',
    questions: [
      {
        id: 'ops-1',
        kind: 'term2def',
        prompt: '推理服务上容器化的主要收益是:',
        choices: [
          { text: '环境一致、依赖隔离,便于横向扩容与回滚', correct: true },
          { text: '一定能提高模型精度', correct: false },
          { text: '减少模型体积', correct: false },
          { text: '免去鉴权', correct: false },
        ],
        explain:
          '容器化解决「在我机器上能跑」的问题,是标准化部署与弹性伸缩的前提。',
      },
      {
        id: 'ops-2',
        kind: 'judge',
        prompt: 'K8s 会自动判断模型推理该用几张卡,无需配置。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          'K8s 负责调度、扩缩与故障恢复,资源请求与上限要显式声明。它管运行,不管模型该怎么切分。',
      },
      {
        id: 'ops-3',
        kind: 'term2def',
        prompt: '推理服务的可观测性通常看哪些指标:',
        choices: [
          { text: '延迟分位数、吞吐、显存、错误率、单请求成本', correct: true },
          { text: '只有准确率', correct: false },
          { text: '训练 loss', correct: false },
          { text: '模型文件大小', correct: false },
        ],
        explain:
          '线上看的是服务指标:首 token 延迟、吐字速率、P99 延迟、错误率、资源利用率与单请求成本。',
      },
      {
        id: 'ops-4',
        kind: 'scenario',
        prompt: '上线后高峰时段 P99 延迟飙升。最先该做的事是:',
        choices: [
          { text: '看指标定位是排队、显存还是上游超时,再决定扩容或优化', correct: true },
          { text: '直接把副本数扩到最大', correct: false },
          { text: '重启服务', correct: false },
          { text: '把 temperature 调低', correct: false },
        ],
        explain:
          '先定位瓶颈再动手:排队靠扩容,显存靠批处理与缓存优化,上游超时靠容错与降级。盲目扩容只是把成本推高。',
      },
      {
        id: 'ops-5',
        kind: 'term2def',
        prompt: '模型服务灰度发布与回滚的常用手段是:',
        choices: [
          { text: '按流量比例切分版本,指标异常就切回', correct: true },
          { text: '直接全量替换', correct: false },
          { text: '关掉监控再发布', correct: false },
          { text: '只在凌晨发布,不做灰度', correct: false },
        ],
        explain:
          '按比例放量 + 指标门禁 + 一键回滚,是把发布风险控住的基本组合。',
      },
      {
        id: 'ops-6',
        kind: 'judge',
        prompt: '把模型 API 密钥写进前端代码,只要压缩混淆过就是安全的。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '前端代码对所有用户可见,任何写在前端的密钥都会泄露。密钥要留在服务端,浏览器只持有访问自己服务的权限。',
      },
    ],
  },

  // ------------------------------------------------------------------
  {
    id: 'domain',
    name: '行业知识',
    intro: '制造业常见的几套系统,以及 AI 应用怎么接进去。',
    questions: [
      {
        id: 'dom-1',
        kind: 'term2def',
        prompt: 'PLM(产品生命周期管理)管的是:',
        choices: [
          { text: '产品从立项、设计、工艺到退役的全生命周期数据与流程', correct: true },
          { text: '工厂车间的排产', correct: false },
          { text: '仓库库存', correct: false },
          { text: '客户关系', correct: false },
        ],
        explain:
          'PLM 管图纸、BOM、变更与版本,是制造业研发数据的核心系统。',
      },
      {
        id: 'dom-2',
        kind: 'term2def',
        prompt: 'MES(制造执行系统)的职责是:',
        choices: [
          { text: '把生产计划落到车间执行:工单、报工、质量与追溯', correct: true },
          { text: '产品设计图纸管理', correct: false },
          { text: '财务结算', correct: false },
          { text: '供应链寻源', correct: false },
        ],
        explain:
          'MES 位于计划层与设备层之间,负责把工单变成可执行、可追溯的生产记录。',
      },
      {
        id: 'dom-3',
        kind: 'term2def',
        prompt: '供应链管理的核心目标是:',
        choices: [
          { text: '在成本、交付与库存之间找平衡,保证供需匹配', correct: true },
          { text: '只追求最低采购价', correct: false },
          { text: '只追求最大库存', correct: false },
          { text: '只追求最快交付', correct: false },
        ],
        explain:
          '供应链要在服务水准与成本之间权衡,单点最优往往只是把风险推给别的环节。',
      },
      {
        id: 'dom-4',
        kind: 'scenario',
        prompt: '做制造业 AI 问答,用户问「这个零件用什么工艺」,资料散在 PLM 图纸和 MES 报工记录里。做法是:',
        choices: [
          { text: '两个系统都接入检索,答案里标注来源系统与文档', correct: true },
          { text: '只接一个,缺的让模型猜', correct: false },
          { text: '把两边数据导成一份静态文件,之后不再更新', correct: false },
          { text: '让模型直连两个系统的数据库', correct: false },
        ],
        explain:
          '跨系统的问答要把各源都纳入检索,并让答案可追溯。模型只应通过受控接口拿数据。',
      },
      {
        id: 'dom-5',
        kind: 'judge',
        prompt: 'ERP、PLM、MES 都是制造业系统,功能重叠,接哪一个都一样。',
        choices: [
          { text: '对', correct: false },
          { text: '错', correct: true },
        ],
        explain:
          '三者职责不同:ERP 管财务与资源计划,PLM 管研发数据,MES 管车间执行。问答范围不同,要接入的数据源也不同。',
      },
      {
        id: 'dom-6',
        kind: 'term2def',
        prompt: '「BOM(物料清单)」描述的是:',
        choices: [
          { text: '一个产品由哪些零部件、各多少数量组成', correct: true },
          { text: '产品的销售价格构成', correct: false },
          { text: '生产车间的排班表', correct: false },
          { text: '仓库的库位分布', correct: false },
        ],
        explain:
          'BOM 是产品结构的基础数据,设计、工艺、生产都围绕它展开,也是制造业问答的高频问题。',
      },
    ],
  },
]
