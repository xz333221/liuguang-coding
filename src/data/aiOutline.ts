// AI 的章节目录树。
//
// 与 pythonOutline.ts / opsOutline.ts 同一套约定:编号由树位置推导,
// 节点一律 status: 'active',是否「筹备中」由子树里的文章数推导;
// 文章靠 frontmatter 的 `node` 指到这里的叶子节点,`category` 仍是 ai。
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
    id: 'ai-foundation',
    name: '基础与模型',
    intro: '先理解模型怎么生成文字、上下文与成本怎么算,再谈提示与工程。',
    children: [
      { id: 'ai-llm-basics', name: '大模型如何生成文字' },
      { id: 'ai-token-context', name: 'Token、上下文与成本' },
      { id: 'ai-model-selection', name: '模型选型与能力边界' },
    ],
  },
  {
    id: 'ai-prompt',
    name: '提示工程',
    intro: '把任务、约束与输出格式讲清楚,比堆叠技巧更重要。',
    children: [
      { id: 'ai-prompt-structure', name: '提示结构与约束' },
      { id: 'ai-prompt-few-shot', name: '示例、格式与结构化输出' },
    ],
  },
  {
    id: 'ai-rag',
    name: '检索增强',
    intro: '让模型基于自己的数据回答:切分、检索、重排与评估。',
    children: [
      { id: 'ai-embedding', name: 'Embedding 与向量检索' },
      { id: 'ai-rag-pipeline', name: 'RAG 链路与切分策略' },
      { id: 'ai-rag-eval', name: '召回评估与失败排查' },
    ],
  },
  {
    id: 'ai-agent',
    name: '工具与智能体',
    intro: '让模型调用工具、执行多步任务,并能在该停的时候停下来。',
    children: [
      { id: 'ai-function-calling', name: '工具调用与参数约束' },
      { id: 'ai-mcp', name: 'MCP 与外部能力接入' },
      { id: 'ai-agent-loop', name: 'Agent 循环与停止条件' },
    ],
  },
  {
    id: 'ai-model-ops',
    name: '微调与部署',
    intro: '从推理服务到微调与成本控制,把模型变成可运维的服务。',
    children: [
      { id: 'ai-finetune', name: '微调与 LoRA' },
      { id: 'ai-inference', name: '推理服务与吞吐' },
      { id: 'ai-model-cost', name: '缓存、限流与成本' },
    ],
  },
  {
    id: 'ai-quality',
    name: '质量与安全',
    intro: '评测集、幻觉、提示注入与合规,决定应用能不能上线。',
    children: [
      { id: 'ai-eval', name: '评测集与指标' },
      { id: 'ai-hallucination', name: '幻觉与事实性' },
      { id: 'ai-injection', name: '提示注入与安全' },
    ],
  },
  {
    id: 'ai-engineering',
    name: '工程化与实战',
    intro: '流式输出、可观测性与典型应用形态。',
    children: [
      { id: 'ai-streaming', name: '流式输出与中断' },
      { id: 'ai-observability', name: '日志、追踪与灰度' },
      { id: 'ai-app-patterns', name: '客服、知识库问答与代码助手' },
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

/** 挂到 catalog 里 ai 分类的 children 上 */
export const aiChapters: Category[] = outline.map(toCategory)
