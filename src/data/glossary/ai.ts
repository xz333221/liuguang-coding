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
]
