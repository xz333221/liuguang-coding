import type { Term } from './types'

/**
 * AI:大模型生成文字这条链上的名词。
 * 顺序按"从输入到输出"排:先 token 和词表,再模型输出,再采样,最后才是结构和训练。
 */
export const aiTerms: Term[] = [
  {
    id: 'token',
    term: 'token',
    aliases: ['词元'],
    group: 'ai',
    plain:
      '模型眼里的"最小一块文字"。常见的词可能占一块，不常见的长词会被切成好几块 —— 切法跟着词表走，与汉字或单词的边界无关。',
    formal:
      '文本经分词器切分后得到的最小输入输出单位，在词表中对应一个整数 id。上下文长度、生成步数与计费都以 token 计。',
    related: ['vocabulary', 'context-window'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'vocabulary',
    term: '词表',
    en: 'vocabulary',
    group: 'ai',
    plain: '模型认识的所有 token 的清单。它每一步做的事，就是在这张清单里挑下一个。',
    formal:
      '分词器定义的 token 到整数 id 的映射集合，规模通常在三万到二十万之间。模型输出层的维度等于词表大小。',
    related: ['token', 'logit'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'language-model',
    term: '语言模型',
    en: 'language model',
    aliases: ['大模型', '大语言模型', 'LLM'],
    group: 'ai',
    plain:
      '一个"猜下一个词"的程序。给它前文，它给词表里每个词打一个分。所有看起来聪明的行为，都是从这个动作里长出来的。',
    formal:
      '对 token 序列建模条件概率 P(x_t | x_<t) 的模型。大语言模型通常指基于 Transformer、参数量在十亿以上的自回归语言模型。',
    related: ['autoregressive', 'logit'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'logit',
    term: 'logit',
    aliases: ['分数'],
    group: 'ai',
    plain:
      '模型给每个候选打的"原始分"。可以是 4.2，也可以是 -7.3，越大表示模型越觉得下一个词应该是它。',
    formal:
      '神经网络最后一层输出的未归一化实数分数。经 softmax（可含温度缩放）后成为概率分布。',
    misread: '把 logit 当概率。它描述的是相对偏好，要经 softmax 之后才成为概率。',
    related: ['softmax', 'probability-distribution', 'vocabulary'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'probability-distribution',
    term: '概率分布',
    en: 'probability distribution',
    group: 'ai',
    plain: '每个候选各占多少可能性，所有候选加起来正好是 1。模型最后交出来的就是这么一个东西。',
    formal:
      '定义在离散候选集上、各分量非负且和为 1 的函数。softmax 的输出即词表上的一个离散概率分布。',
    related: ['softmax', 'sampling'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'softmax',
    term: 'softmax',
    group: 'ai',
    plain:
      '把一组"随便什么实数"变成"一组加起来等于 1 的概率"。做法是各自取指数，再除以总和。指数会把差距放大。',
    formal:
      'softmax(z)_i = exp(z_i) / Σ exp(z_j)，把实数向量映射为概率分布。实现上先减去最大值再取指数以防溢出，结果不变。',
    related: ['logit', 'temperature', 'normalization'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'sampling',
    term: '采样',
    en: 'sampling',
    aliases: ['抽样'],
    group: 'ai',
    plain:
      '按概率"抽签"决定这一步到底输出哪个词。概率大的更容易被抽中，概率小的也留着机会 —— 所以同一个问题问两遍，答案可能不一样。',
    formal:
      '依概率分布随机抽取一个候选作为输出。它引入随机性，因此同一输入两次结果可能不同;固定随机种子可复现。',
    misread: '以为模型输出的就是概率最高那个词。贪心解码下确实如此;开了采样，抽中的是随机的一个。',
    related: ['temperature', 'decoding', 'seed'],
    see: 'ai/temperature-and-sampling',
    source: {
      title: 'Hugging Face · How to generate text',
      url: 'https://huggingface.co/blog/how-to-generate',
    },
  },
  {
    id: 'temperature',
    term: '温度',
    en: 'temperature',
    group: 'ai',
    plain:
      '采样时的一个"胆子旋钮"。调低更保守，调高更发散。它调的是"怎么从模型的判断里抽签"。',
    formal:
      'softmax 中的缩放因子 T:p_i ∝ exp(z_i / T)。T 趋近 0 退化为贪心，T = 1 使用原始分布，T > 1 使分布更平坦。仅在采样时生效。',
    misread: '以为温度高等于更有创造力。它只是把长尾抬起来，"有创意"和"跑题"会一起被抬高。',
    related: ['sampling', 'softmax', 'top-p'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'decoding',
    term: '解码',
    en: 'decoding',
    aliases: ['解码策略'],
    group: 'ai',
    plain:
      '从模型给出的那组分数里，决定这一步到底吐出哪个 token 的那套规则。贪心、beam search、采样都是规则之一。',
    formal:
      '把每步的输出分布转换成具体 token 的策略集合，包括贪心、beam search、采样，以及 top-k / top-p 等截断手段。',
    related: ['sampling', 'greedy-decoding', 'beam-search'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'greedy-decoding',
    term: '贪心解码',
    en: 'greedy decoding',
    aliases: ['贪心'],
    group: 'ai',
    plain: '每一步都直接选分最高的那个，不抽签。结果最稳，但也最容易死板，而且温度对它毫无作用。',
    formal:
      '每步取 argmax 的确定性解码策略，不涉及随机性，因此 temperature、top-k、top-p 都不参与。',
    related: ['decoding', 'sampling'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'beam-search',
    term: 'beam search',
    group: 'ai',
    plain:
      '同时养着好几条候选句子往前推，最后挑整体概率最高的那条。它也不抽签，所以温度同样不起作用。',
    formal:
      '维护 k 条候选序列（beam），每步扩展并按累计对数概率剪枝的确定性搜索策略。质量常优于贪心，代价是 k 倍计算量。',
    related: ['decoding', 'greedy-decoding'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'top-k',
    term: 'top-k',
    group: 'ai',
    plain: '只在分最高的 k 个候选里抽签，剩下的直接扔掉。简单直接，但 k 是写死的，不随情况变。',
    formal:
      '保留概率最高的 k 个候选，其余置零后重新归一化再采样。k 为固定值，分布很尖时保留了不必要的噪音，很平时又砍得太狠。',
    related: ['sampling', 'top-p'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'top-p',
    term: 'top-p',
    aliases: ['核采样'],
    group: 'ai',
    plain:
      '把候选按概率从高到低累加，加到 p 就截断，只在留下的一小撮里抽签。留几个由分布自己决定，不用你拍脑袋定。',
    formal:
      '又称 nucleus sampling，取累计概率达到 p 的最小候选集合，重新归一化后采样。分布尖时可能只留两三个，平时能留几十个。',
    related: ['top-k', 'sampling'],
    see: 'ai/temperature-and-sampling',
    source: {
      title: 'The Curious Case of Neural Text Degeneration',
      url: 'https://arxiv.org/abs/1904.09751',
    },
  },
  {
    id: 'seed',
    term: '随机种子',
    en: 'seed',
    group: 'ai',
    plain: '随机数的起点。种子一样，抽签的顺序就一样 —— 想让结果可复现，就把它固定下来。',
    formal:
      '伪随机数生成器的初始状态。固定种子可使采样可复现，但线上批处理与浮点累加顺序仍可能带来残余不确定性。',
    related: ['sampling'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'autoregressive',
    term: '自回归',
    en: 'autoregressive',
    group: 'ai',
    plain:
      '"一个一个往外吐"的生成方式。每吐一个词，就把它接到前文后面，再预测下一个。所以生成必须一步一步来。',
    formal:
      '把已生成序列作为条件逐步生成下一个 token 的建模方式，P(x) = Π P(x_t | x_<t)。因依赖自身输出，解码无法并行。',
    related: ['language-model', 'causal-mask'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'prompt',
    term: '提示词',
    en: 'prompt',
    aliases: ['提示'],
    group: 'ai',
    plain: '你给模型的输入。它决定了模型是在什么前提下开始猜下一个词，模型的参数保持原样。',
    formal:
      '送入模型的输入文本（含 system 等角色划分）。提示词不改变模型参数，只改变条件分布。',
    related: ['context-window', 'language-model'],
    see: 'ai/temperature-and-sampling',
  },
  {
    id: 'context-window',
    term: '上下文窗口',
    en: 'context window',
    group: 'ai',
    plain: '模型一次能"看见"的文字总量上限。超出去的部分它根本看不到。',
    formal:
      '单次前向计算可处理的 token 上限，由位置编码与注意力开销决定。注意力对序列长度是 O(n²)，这是窗口有限且昂贵的根源。',
    related: ['token', 'attention'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'embedding',
    term: '嵌入',
    en: 'embedding',
    aliases: ['词向量'],
    group: 'ai',
    plain:
      '把词变成一串数字，让"意思相近的词"在这串数字上也靠得近。模型内部的一切运算，都是在这些数字上做的。',
    formal:
      '把离散符号映射为稠密实数向量的表示。语义相近的符号在向量空间中距离更近，是模型处理文本的基础表示。',
    related: ['token', 'weight'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'attention',
    term: '注意力',
    en: 'attention',
    group: 'ai',
    plain:
      '"按相关度加权求和"。每个词先发出一个提问，去和上下文里每个词比对，越对得上，就越取用那个词的信息。',
    formal:
      '由 query 与 key 的点积经缩放、softmax 得到权重，再对 value 加权求和的机制，即 softmax(QKᵀ/√d_k)V。可并行、无距离衰减，代价 O(n²)。',
    related: ['query-key-value', 'softmax', 'multi-head-attention'],
    see: 'ai/attention-mechanism',
    source: { title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
  },
  {
    id: 'query-key-value',
    term: 'Query / Key / Value',
    aliases: ['Q/K/V'],
    group: 'ai',
    plain:
      '注意力里的三个角色:我要找什么（Q）、每份资料的标签（K）、资料的内容（V）。Q 和 K 决定"该看多重"，V 是被取走的内容。',
    formal:
      '由同一输入分别乘三个可学习权重矩阵得到的投影。query 与 key 的点积决定权重，value 是按权重被混合的内容。',
    misread: '把 Q/K/V 当成人工设定的字段。它们是训练出来的投影，"相关性"未必对应人类语义。',
    related: ['attention', 'weight'],
    see: 'ai/attention-mechanism',
    source: {
      title: 'The Illustrated Transformer（Jay Alammar）',
      url: 'https://jalammar.github.io/illustrated-transformer/',
    },
  },
  {
    id: 'multi-head-attention',
    term: '多头注意力',
    en: 'multi-head attention',
    group: 'ai',
    plain: '同时从几个不同角度看相关性，各自算完再拼起来。总计算量没怎么涨，能表达的关系却多了。',
    formal:
      '并行运行多组独立的 Q/K/V 投影（每个头维度更低），拼接输出后过线性层。头之间参数独立，学到不同的关注模式。',
    related: ['attention', 'transformer'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'transformer',
    term: 'Transformer',
    group: 'ai',
    plain: '现在几乎所有大模型都在用的那套结构。核心是注意力，最大好处是不用按顺序算，能把显卡喂满。',
    formal:
      '完全基于注意力与前馈网络、不含循环结构的序列建模架构。支持并行训练，是当代大语言模型的基础。',
    related: ['attention', 'multi-head-attention'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'positional-encoding',
    term: '位置编码',
    en: 'positional encoding',
    group: 'ai',
    plain: '注意力本身分不出词的先后，得额外把"这是第几个"告诉模型，否则"猫追狗"和"狗追猫"在它眼里一样。',
    formal:
      '向输入注入序列位置信息的机制。早期用正弦函数编码，现在主流是旋转位置编码（RoPE），让点积天然带上相对距离。',
    related: ['attention', 'context-window'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'causal-mask',
    term: '因果掩码',
    en: 'causal mask',
    group: 'ai',
    plain: '生成时不许偷看后面的词，于是在算注意力之前，把"未来"那些位置的分数压成负无穷。',
    formal:
      '在 softmax 之前把未来位置的注意力分数置为 −∞ 的上三角掩码，使每个位置只能关注自身及之前的位置。',
    related: ['attention', 'autoregressive'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'dot-product',
    term: '点积',
    en: 'dot product',
    group: 'ai',
    plain: '两个向量对应位置相乘再相加。结果越大，说明两个向量方向越一致，也就是越"相关"。',
    formal:
      'a·b = Σ a_i b_i。注意力用 query 与 key 的点积作为相关性分数;维度越高点积方差越大，因此要除以 √d_k 压住数值。',
    related: ['attention', 'normalization'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'normalization',
    term: '归一化',
    en: 'normalization',
    group: 'ai',
    plain: '把一组数按比例缩放，让它们落在统一的尺度里 —— 比如加起来正好等于 1。',
    formal:
      '把数值映射到统一尺度或使其满足特定约束的操作。softmax 是其中一种:把实数向量变成和为 1 的概率分布。',
    related: ['softmax', 'dot-product'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'weight',
    term: '权重',
    en: 'weight',
    group: 'ai',
    aliases: ['参数量'],
    plain:
      '模型"学"出来的那些数字。训练就是在不断微调它们;一旦训练完，推理时它们固定不动。说"参数量多少亿"说的就是它们。',
    formal:
      '网络中可学习的参数张量，如 W_q / W_k / W_v 与线性层矩阵。参数量是模型规模的主要度量。',
    related: ['training-vs-inference', 'attention'],
    see: 'ai/attention-mechanism',
  },
  {
    id: 'training-vs-inference',
    term: '训练与推理',
    en: 'training / inference',
    group: 'ai',
    plain:
      '训练是"学习阶段"，参数会变;推理是"使用阶段"，参数冻结，只是拿输入跑一遍。温度这类参数只管推理，跟训练无关。',
    formal:
      '训练通过反向传播与优化器更新参数;推理只做前向计算。解码策略（温度、top-p 等）只作用于推理阶段。',
    related: ['weight', 'decoding'],
    see: 'ai/temperature-and-sampling',
  },

  // ----------------------------------------------------------------------
  // 以下按"把模型接进应用"的顺序排:先提示词,再上下文,再检索、工具、
  // 规划、协作,最后是框架、微调、演进与运维。
  // ----------------------------------------------------------------------

  // —— 提示词工程 ——
  {
    id: 'system-prompt',
    term: '系统提示',
    en: 'system prompt',
    group: 'ai',
    plain:
      '对话里那个"定规矩"的角色段:告诉模型它是谁、能做什么、底线在哪。它和用户消息一样是输入的一部分，模型参数并不会因此改变。',
    formal:
      '以 system 角色送入模型的指令段，在推理时作为上下文前缀生效，约束回答的口吻、范围与边界，不更新模型参数。',
    related: ['prompt', 'few-shot'],
    see: 'ai/prompt-engineering',
  },
  {
    id: 'few-shot',
    term: '少样本提示',
    en: 'few-shot prompting',
    aliases: ['few-shot'],
    group: 'ai',
    plain:
      '在提示里放几组"输入 → 输出"的示例，让模型照着样子做。示例给的是任务的形状:格式、粒度、边界。',
    formal:
      '在提示中附少量标注示例，使模型按示例的输入输出模式作答的提示技术。示例不改变模型参数，只改变条件分布。',
    related: ['zero-shot', 'prompt'],
    see: 'ai/prompt-engineering',
  },
  {
    id: 'zero-shot',
    term: '零样本提示',
    en: 'zero-shot',
    aliases: ['zero-shot'],
    group: 'ai',
    plain: '一个示例都不给，直接用自然语言把任务描述清楚，让模型按描述做。',
    formal: '不附任何示例、仅凭任务描述 instruct 模型完成任务的提示方式，依赖模型在预训练中获得的能力。',
    related: ['few-shot', 'prompt'],
    see: 'ai/prompt-engineering',
  },
  {
    id: 'chain-of-thought',
    term: '思维链',
    en: 'chain-of-thought',
    aliases: ['CoT', '思维链提示'],
    group: 'ai',
    plain:
      '让模型把推理步骤一步步写出来，再给结论。步骤摊开之后，算术、多步推理这类任务明显更稳。',
    formal:
      '引导模型显式生成中间推理步骤再给出答案的提示技术，用更多输出 token 换取更可靠的多步推理，属于提示层手段。',
    related: ['reasoning-model', 'prompt'],
    see: 'ai/prompt-engineering',
  },
  {
    id: 'structured-output',
    term: '结构化输出',
    en: 'structured output',
    group: 'ai',
    plain: '让模型按固定格式交结果，比如一段 JSON。做法是给示例、说清字段，必要时用接口的格式约束兜底。',
    formal:
      '约束模型输出符合预定义 schema（如 JSON）的生成方式，实现手段包括示例提示、JSON mode 与工具调用参数 schema 强约束。',
    related: ['function-calling', 'few-shot'],
    see: 'ai/prompt-engineering',
  },
  {
    id: 'hallucination',
    term: '幻觉',
    en: 'hallucination',
    group: 'ai',
    plain:
      '模型把没依据的内容说得跟真的一样。根源在生成机制:它按概率续写，保证的是"通顺"，不是"属实"。',
    formal:
      '语言模型生成与输入或事实不符的内容的现象。缓解手段包括检索增强、要求引用来源、提示中给出"不知道"的出口与结果校验。',
    related: ['rag', 'prompt'],
    see: 'ai/rag-pipeline',
  },

  // —— 上下文与记忆 ——
  {
    id: 'context-engineering',
    term: '上下文工程',
    en: 'context engineering',
    group: 'ai',
    plain:
      '决定"这一次请求的窗口里到底放什么":历史怎么压、资料怎么挑、工具结果怎么裁，把有限的窗口留给最相关的信息。',
    formal:
      '对送入模型的上下文做检索、重排、摘要、裁剪与组织的工程实践。窗口由注意力的 O(n²) 开销限制，上下文质量直接决定输出质量。',
    related: ['context-window', 'rolling-summary', 'rag'],
    see: 'ai/context-and-memory',
  },
  {
    id: 'rolling-summary',
    term: '滚动摘要',
    en: 'rolling summary',
    group: 'ai',
    plain:
      '长对话的省钱做法:把老历史压成几条要点，保留最近几轮原文，一起送进窗口。既省 token，又把关键结论留住。',
    formal:
      '在会话变长时，用模型把早期历史压缩为摘要、与近期原文拼接后送入上下文的管理策略，是上下文工程的常用手段。',
    related: ['context-engineering', 'context-window'],
    see: 'ai/context-and-memory',
  },
  {
    id: 'agent-memory',
    term: '记忆机制',
    en: 'agent memory',
    aliases: ['长期记忆', '短期记忆'],
    group: 'ai',
    plain:
      '把"该记住的东西"存到模型外面:当前会话的内容放在上下文窗口里，跨会话的事实与偏好落到外部存储，用到时再检索回来。',
    formal:
      'Agent 跨请求保持信息的机制总称。短期记忆指当前会话上下文，长期记忆指持久化存储中的事实、偏好与历史，按需检索注入。',
    related: ['context-engineering', 'vector-database'],
    see: 'ai/context-and-memory',
  },

  // —— 检索增强生成 ——
  {
    id: 'rag',
    term: '检索增强生成',
    en: 'RAG',
    aliases: ['检索增强'],
    group: 'ai',
    plain:
      '先查资料，再让模型照着资料答。模型没见过私有或最新内容时，把检索回来的片段拼进提示，答案就有了依据。',
    formal:
      'Retrieval-Augmented Generation:检索与生成结合的架构。查询经嵌入检索召回相关文档片段，作为上下文注入提示，使模型基于给定资料作答。',
    related: ['embedding', 'vector-search', 'chunking', 'hallucination'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'chunking',
    term: '切分',
    en: 'chunking',
    aliases: ['文档切分', '切块'],
    group: 'ai',
    plain:
      '把长文档切成便于检索的小块。切太大，相似度被稀释;切太小，关键句被拦腰切断。常见做法是按标题与语义切，并留一段重叠。',
    formal:
      'RAG 入库前将文档分割为检索单元的策略，决定最小检索单位。切分粒度直接影响召回精度与上下文完整性，常按结构、语义或固定窗口切分并保留重叠区。',
    related: ['rag', 'vector-search'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'vector-search',
    term: '向量检索',
    en: 'vector search',
    aliases: ['语义检索'],
    group: 'ai',
    plain:
      '把查询和文档都变成向量，按空间距离找"意思相近"的片段。擅长意会，编号、型号这类精确匹配是它的短板。',
    formal:
      '基于嵌入向量相似度（余弦、点积等）的检索方式，通常用近似最近邻索引加速。语义泛化能力强，对专有名词、编号的精确匹配偏弱。',
    related: ['embedding', 'vector-database', 'hybrid-search'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'vector-database',
    term: '向量数据库',
    en: 'vector database',
    aliases: ['向量库'],
    group: 'ai',
    plain: '专门存向量、按相似度检索的数据库。文档 embedding 之后入库，查询来了现场算相似度。',
    formal:
      '为高维向量存储与近似最近邻检索优化的数据库，如 Milvus、pgvector、Qdrant 等，是 RAG 链路召回侧的基础设施。',
    related: ['vector-search', 'embedding'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'hybrid-search',
    term: '混合检索',
    en: 'hybrid search',
    group: 'ai',
    plain:
      '向量检索和关键词检索一起用，两路结果合起来排。意思相近的活向量干，编号、型号这种精确匹配关键词干。',
    formal:
      '融合向量检索与关键词检索（如 BM25）的召回策略，两路结果按加权或 RRF 等方式合并，兼顾语义泛化与精确匹配。',
    related: ['vector-search', 'rerank'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'rerank',
    term: '重排',
    en: 'rerank',
    aliases: ['精排'],
    group: 'ai',
    plain:
      '召回几十条候选后，再用一个更准的模型逐条打分排序，只把前几名送给模型。粗排求快，精排求准。',
    formal:
      '对初步召回结果用交叉编码器等模型精细打分、重排后截断的检索环节，用于弥补近似最近邻排序粗、精度不足的问题。',
    related: ['vector-search', 'hybrid-search'],
    see: 'ai/rag-pipeline',
  },
  {
    id: 'ocr',
    term: 'OCR',
    en: 'optical character recognition',
    aliases: ['文字识别'],
    group: 'ai',
    plain: '把图片、扫描件里的文字识别成可检索的文本。扫描资料不过这一关，后面的检索做得再好也召不回内容。',
    formal: '光学字符识别:将图像中的印刷或手写文字转换为机器可读文本的技术，是扫描件、图片类语料进入 RAG 链路的前置步骤。',
    related: ['rag'],
    see: 'ai/rag-pipeline',
  },

  // —— 工具调用 ——
  {
    id: 'function-calling',
    term: '工具调用',
    en: 'function calling',
    group: 'ai',
    plain:
      '模型按约定格式说出"要调哪个工具、参数是什么"，真正去执行的是业务代码。模型只产出调用意图，鉴权和密钥都留在业务侧。',
    formal:
      '模型依据工具 schema 生成结构化调用意图（工具名与参数），由外部程序执行并回传结果的机制。执行、鉴权、容错均在应用侧完成。',
    related: ['mcp', 'idempotent', 'agent'],
    see: 'ai/tool-calling',
  },
  {
    id: 'mcp',
    term: 'MCP',
    en: 'Model Context Protocol',
    group: 'ai',
    plain:
      '一套把"工具怎么描述、怎么发现、怎么调用"标准化的协议。工具按协议暴露一次，各个模型客户端都能接。',
    formal:
      'Anthropic 发起的开放协议，定义模型客户端与外部工具、数据源之间的接口规范，使工具接入与客户端解耦、多方复用。',
    related: ['function-calling'],
    see: 'ai/tool-calling',
    source: { title: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/' },
  },
  {
    id: 'idempotent',
    term: '幂等',
    en: 'idempotency',
    aliases: ['幂等性'],
    group: 'ai',
    plain:
      '同一个操作重复执行多次，结果和执行一次一样。创建类接口超时重试前，必须靠幂等键保证不重复生效。',
    formal:
      '操作重复执行产生相同结果的性质。工程上以幂等键（业务单号）去重，是超时重试、消息重投场景下数据一致性的基础。',
    related: ['function-calling'],
    see: 'ai/tool-calling',
  },

  // —— 任务规划与 Agent ——
  {
    id: 'agent',
    term: '智能体',
    en: 'agent',
    aliases: ['AI Agent'],
    group: 'ai',
    plain:
      '能自己拆解任务、调工具、看结果再决定下一步的程序。模型负责想和说，代码负责做和兜底，两边拼起来才是一个 Agent。',
    formal:
      '以大模型为决策核心，自主完成"规划—调用工具—观察—修正"循环的软件系统。可靠性依赖终止条件、检查点与人工兜底等工程约束。',
    related: ['react', 'function-calling', 'planning'],
    see: 'ai/task-planning',
  },
  {
    id: 'react',
    term: 'ReAct',
    en: 'reasoning + acting',
    group: 'ai',
    plain:
      '想一步、做一步的循环:先推理下一步该干什么，调工具，拿观察结果再推理。适合需要边查边做的任务。',
    formal:
      'Thought-Action-Observation 交替进行的 Agent 范式:每步的观察成为下一步推理的输入，把推理与工具使用交织成循环。',
    related: ['agent', 'reflection', 'planning'],
    see: 'ai/task-planning',
  },
  {
    id: 'reflection',
    term: '反思',
    en: 'reflection',
    group: 'ai',
    plain: '让模型检查自己上一步的输出，再决定修正还是继续。评估也变成一次模型调用，换来更稳的链路。',
    formal:
      'Agent 流程中由模型对中间结果自评并驱动修正的机制，以额外调用量换取输出质量，常与重试上限配合使用。',
    related: ['react', 'agent'],
    see: 'ai/task-planning',
  },
  {
    id: 'planning',
    term: '任务规划',
    en: 'task planning',
    aliases: ['任务分解'],
    group: 'ai',
    plain:
      '把大目标拆成有序的步骤。拆的粗细看信息依赖:需要查资料的单独成步，能本地算完的合并处理。',
    formal:
      'Agent 将目标分解为可执行步骤序列的过程，分为先出完整计划再执行与边观察边规划两类。粒度过细会带来上下文增长与误差累积。',
    related: ['agent', 'react'],
    see: 'ai/task-planning',
  },

  // —— 多智能体 ——
  {
    id: 'multi-agent',
    term: '多智能体',
    en: 'multi-agent',
    aliases: ['多智能体协作'],
    group: 'ai',
    plain:
      '把一个任务分给多个有角色的 Agent 做，各自带合适的提示与工具。价值在分工与上下文隔离，代价是通信开销与编排复杂度。',
    formal:
      '由多个各司其职的 Agent 通过消息传递协作完成任务的系统。常见模式有中心编排与自主协商两类，需要终止条件与责任边界防失控。',
    related: ['agent', 'orchestration'],
    see: 'ai/multi-agent',
  },
  {
    id: 'orchestration',
    term: '编排',
    en: 'orchestration',
    group: 'ai',
    plain:
      '有一个中心角色负责分派与汇总，其他角色只干自己的事。谁接手、何时收尾都由它决定，流程因此收得住。',
    formal:
      '多 Agent 系统中由中枢统一调度任务分派、结果汇总与流程终止的协作模式，与各角色自主协商的去中心化模式相对。',
    related: ['multi-agent'],
    see: 'ai/multi-agent',
  },

  // —— 技术框架 ——
  {
    id: 'langchain',
    term: 'LangChain',
    group: 'ai',
    plain: '一套把模型调用、提示、工具、检索拼成链路的开发框架，组件全，抽象层数也多。',
    formal: '用于构建大模型应用的开发框架，提供模型 I/O、链、代理与检索等组件抽象，生态庞大，复杂流程的可控性依赖上层封装。',
    related: ['langgraph', 'llamaindex'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'langgraph',
    term: 'LangGraph',
    group: 'ai',
    plain: '把流程画成节点和边的图，支持状态与循环。有条件分支、要回退的 Agent 流程，用它表达最直接。',
    formal:
      'LangChain 生态的图编排框架，以节点、边与共享状态描述流程，支持循环与条件分支，适合需要持久化与人工介入的 Agent。',
    related: ['langchain'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'llamaindex',
    term: 'LlamaIndex',
    group: 'ai',
    plain: '主战场在数据侧:加载、切分、建索引、做检索，把私有资料变成模型能查的知识。',
    formal: '面向 RAG 的数据框架，提供文档加载、索引构建、检索与查询引擎能力，常与 LangChain 等编排框架配合使用。',
    related: ['rag', 'langchain'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'autogpt',
    term: 'AutoGPT',
    group: 'ai',
    plain: '早期把"自主循环"跑起来的开源项目:定个目标，它自己拆解、自己调工具。证明了潜力，也暴露了目标漂移和成本失控。',
    formal:
      '基于 GPT 的自主 Agent 实验项目，以目标驱动循环调用工具完成任务。其可靠性问题推动了生产环境对检查点、约束与人工兜底的重视。',
    related: ['agent'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'autogen',
    term: 'AutoGen',
    group: 'ai',
    plain: '微软的多 Agent 框架，核心抽象是"多个角色之间怎么对话"，用对话协议把分工协作跑起来。',
    formal: '以多 Agent 对话为核心抽象的开源框架，通过可定制的对话协议协调多个模型实例分工完成任务。',
    related: ['metagpt', 'multi-agent'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'metagpt',
    term: 'MetaGPT',
    group: 'ai',
    plain: '把软件公司的角色分工搬进多 Agent:产品经理写文档，架构师出设计，工程师写代码，按流程交接。',
    formal: '以角色化软件流程为抽象的多 Agent 框架，将需求文档、设计、编码等环节分配给不同角色的 Agent 顺序协作完成。',
    related: ['autogen', 'multi-agent'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'dify',
    term: 'Dify',
    group: 'ai',
    plain: '低代码搭 AI 应用的平台:提示、知识库、工具、工作流都能可视化配置，适合快速验证。',
    formal: '开源 LLM 应用开发平台，提供提示编排、知识库、工具与工作流的可视化配置与部署能力，深度定制仍需写代码。',
    related: ['coze'],
    see: 'ai/ai-frameworks',
  },
  {
    id: 'coze',
    term: 'Coze',
    group: 'ai',
    plain: '扣子，字节的低代码 Agent 搭建平台，插件与发布渠道多，适合做对话机器人的快速验证。',
    formal: '低代码 AI 应用搭建平台，以插件、知识库与工作流配置对话机器人，可一键发布到多个渠道。',
    related: ['dify'],
    see: 'ai/ai-frameworks',
  },

  // —— 微调 ——
  {
    id: 'sft',
    term: '监督微调',
    en: 'SFT',
    aliases: ['supervised fine-tuning'],
    group: 'ai',
    plain:
      '用"问题 → 标准答案"的样本教模型按要求的格式与风格回答。它教的是怎么答，注入大量新知识是它的短板。',
    formal:
      'Supervised Fine-Tuning:在预训练模型上用标注的指令-回复样本继续训练，使模型遵循特定格式、口吻与行为边界。',
    related: ['lora', 'full-fine-tuning', 'training-vs-inference'],
    see: 'ai/fine-tuning',
  },
  {
    id: 'full-fine-tuning',
    term: '全量微调',
    en: 'full fine-tuning',
    group: 'ai',
    plain: '模型所有参数都参与训练。上限高，显存和存储代价也大，回滚得整份模型一起换。',
    formal: '更新模型全部参数的微调方式，效果上限高但需要完整的优化器状态与副本显存，迭代与回滚成本高。',
    related: ['sft', 'lora'],
    see: 'ai/fine-tuning',
  },
  {
    id: 'lora',
    term: 'LoRA',
    en: 'low-rank adaptation',
    aliases: ['低秩适配'],
    group: 'ai',
    plain:
      '冻结原权重，只训练一组低秩增量。显存和存储都省，原始权重不动，可插拔、易回滚。',
    formal:
      '低秩适配:以低秩矩阵近似权重更新量 ΔW，仅训练增量部分的高效微调方法，多个任务可共享同一基座各自挂载。',
    related: ['sft', 'full-fine-tuning'],
    see: 'ai/fine-tuning',
  },
  {
    id: 'catastrophic-forgetting',
    term: '灾难性遗忘',
    en: 'catastrophic forgetting',
    group: 'ai',
    plain: '模型在新数据上训练之后，把原来会的东西忘了。注入频繁变化的知识时，微调尤其容易踩这个坑。',
    formal:
      '继续训练导致模型在原有分布上性能显著下降的现象。微调注入易变知识时需混入通用数据缓解，这也是知识优先放检索层的原因之一。',
    related: ['sft', 'rag'],
    see: 'ai/fine-tuning',
  },

  // —— 能力演进与运维 ——
  {
    id: 'long-context',
    term: '长上下文',
    en: 'long context',
    group: 'ai',
    plain: '把一次能看的 token 上限从几千拉到几十万。贵，而且窗口里信息一多，模型对该看的段落反而没那么敏感。',
    formal:
      '通过稀疏/线性注意力、RoPE 外推与 KV 缓存压缩等架构与工程优化扩展的上下文窗口能力，成本随长度超线性增长。',
    related: ['context-window', 'kv-cache'],
    see: 'ai/model-capability-evolution',
  },
  {
    id: 'reasoning-model',
    term: '推理模型',
    en: 'reasoning model',
    group: 'ai',
    plain:
      '训练时就学会"把中间步骤想一遍再答"的模型。它的行为是训练塑造的，把采样参数关掉它也照样展开推理。',
    formal:
      '经训练获得显式中间推理能力（长思维链）的模型，在推理阶段生成思考 token 后再作答，与仅调节采样参数的普通模型有本质区别。',
    related: ['chain-of-thought'],
    see: 'ai/model-capability-evolution',
  },
  {
    id: 'multimodal',
    term: '多模态',
    en: 'multimodal',
    group: 'ai',
    plain: '模型能处理文本之外的输入:图片、音频、视频。不同输入被编码到同一个表示空间里，统一做理解与生成。',
    formal: '支持文本以外模态（图像、音频等）输入或输出的模型能力，通过跨模态编码器将不同输入映射到统一表示空间。',
    related: ['embedding'],
    see: 'ai/model-capability-evolution',
  },
  {
    id: 'quantization',
    term: '量化',
    en: 'quantization',
    group: 'ai',
    plain: '把权重从高精度压到低比特，显存和带宽都省，多数场景精度损失可控。部署降本最常用的一招。',
    formal: '以更低比特（如 INT8、INT4）表示模型权重与激活的压缩技术，降低显存占用与推理成本，常与推理引擎配合使用。',
    related: ['weight'],
    see: 'ai/model-capability-evolution',
  },
  {
    id: 'kv-cache',
    term: 'KV 缓存',
    en: 'KV cache',
    group: 'ai',
    plain:
      '把已经算过的 key 和 value 存下来，每生成一个新 token 只算增量。自回归生成的提速靠它，长上下文的显存大头也是它。',
    formal:
      '推理时缓存历史 token 的 key/value 投影以避免重复计算的优化，将每步注意力计算从 O(n²) 降为 O(n)，代价是显存随长度线性增长。',
    related: ['attention', 'long-context'],
    see: 'ai/model-capability-evolution',
  },
  {
    id: 'docker',
    term: 'Docker',
    group: 'ai',
    plain: '把应用连同依赖打成一个镜像，环境一致、随时拉起来。部署与扩容都从它开始。',
    formal: '基于容器镜像的打包与运行标准，使应用及其依赖在任意环境一致运行，是服务化部署与横向扩容的前提。',
    related: ['kubernetes'],
    see: 'ai/ai-serving-ops',
  },
  {
    id: 'kubernetes',
    term: 'Kubernetes',
    aliases: ['K8s'],
    group: 'ai',
    plain: '容器编排系统:副本扩缩、故障自愈、滚动发布都归它管。资源请求与上限要显式声明，它不替你做决定。',
    formal: '容器编排平台，负责调度、扩缩容、服务发现与故障恢复。推理部署需显式声明资源请求、GPU 分配与健康检查策略。',
    related: ['docker'],
    see: 'ai/ai-serving-ops',
  },
  {
    id: 'observability',
    term: '可观测性',
    en: 'observability',
    group: 'ai',
    plain:
      '线上出了事能查:日志、指标、链路追踪三件套。推理服务重点看延迟分位数、吞吐、显存、错误率和单请求成本。',
    formal:
      '通过日志、指标与追踪理解系统内部状态的能力。推理服务的关键指标包括首 token 延迟、吐字速率、P99 延迟、错误率与资源利用率。',
    related: ['kubernetes'],
    see: 'ai/ai-serving-ops',
  },
]
