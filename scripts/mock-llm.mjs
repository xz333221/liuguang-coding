// 假的 LLM 接口:按 OpenAI 的 SSE 格式回放几段内容,并把收到的请求记下来
// 用途:本地验收问答面板(浏览器直连跨域,所以这里带 CORS 头)
import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'

const LOG = 'tmp/mock-llm.log'
writeFileSync(LOG, '')

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    res.end()
    return
  }

  if (req.method !== 'POST' || !req.url?.includes('/chat/completions')) {
    res.writeHead(404, cors)
    res.end('not found')
    return
  }

  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    const parsed = JSON.parse(body)
    const system = parsed.messages.find((m) => m.role === 'system')?.content ?? ''
    appendFileSync(
      LOG,
      `${JSON.stringify({
        model: parsed.model,
        stream: parsed.stream,
        auth: req.headers.authorization ?? null,
        systemLength: system.length,
        systemHasArticle: system.includes('读者正在读的文章'),
        systemHasBody: system.includes('b.append(4)') || system.includes('softmax'),
        turns: parsed.messages.filter((m) => m.role !== 'system').length,
        lastUser: parsed.messages.at(-1)?.content,
      })}\n`,
    )

    res.writeHead(200, {
      ...cors,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const chunks = [
      '先说结论:变量是名字。\n\n',
      '```python\na = [1, 2]\nb = a\n```\n\n',
      '所以 **b 改了 a 也会变**。',
    ]
    let index = 0
    const timer = setInterval(() => {
      if (index < chunks.length) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[index] } }] })}\n\n`)
        index += 1
        return
      }
      res.write('data: [DONE]\n\n')
      clearInterval(timer)
      res.end()
    }, 120)
  })
})

server.listen(4399, () => console.log('mock llm listening on 4399'))
