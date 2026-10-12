// 线上验收:coding.flowdash.cn(站点 + 服务端接口)
const base = process.argv[2] ?? 'https://coding.flowdash.cn'

const targets = [
  ['首页', `${base}/`],
  ['知识点页', `${base}/python/variables-are-not-boxes/`],
  ['AI 知识点页', `${base}/ai/temperature-and-sampling/`],
  ['导图 JSON', `${base}/mindmaps/python-variables.mindmap.json`],
  ['健康检查', `${base}/api/health`],
  ['供应商预设', `${base}/api/ai-model/providers`],
  ['已存模型', `${base}/api/ai-model/models/saved`],
  ['落地页(存档)', `${base}/about/`],
]

for (const [label, url] of targets) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const type = response.headers.get('content-type') ?? ''
    const text = await response.text()
    const title = text.match(/<title>([\s\S]*?)<\/title>/)
    const summary = type.includes('json') ? text.slice(0, 120) : title ? title[1].trim() : `${text.length}B`
    console.log(`${label}: ${response.status} · ${summary}`)

    if (label === '知识点页') {
      console.log('   问答岛:', /ChatPanel/.test(text), '| 模型配置岛:', /ModelConfigDialog/.test(text))
    }
  } catch (error) {
    console.log(`${label}: ERR ${error.message}`)
  }
}
