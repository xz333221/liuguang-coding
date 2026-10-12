// 流光 coding 知识库的服务端:同一个进程既发站点,也发接口。
//
//   GET  /api/health                  健康检查
//   POST /api/chat                    问答(SSE 透传,密钥不出服务端)
//   GET  /api/ai-model/providers      供应商预设          ← ai-model-form 中间件
//   GET  /api/ai-model/models         ?endpoint= 拉模型列表 ← ai-model-form 中间件
//   POST /api/ai-model/test           测连接              ← ai-model-form 中间件
//   POST /api/ai-model/models         保存模型配置(落盘,0600)
//   GET  /api/ai-model/models/saved   列出已保存(只回掩码)
//   DELETE /api/ai-model/models/:id   删除
//   /*                                静态站点(dist)
//
// 跑法:
//   npm run build            # 构建站点(部署时带上 PUBLIC_CHAT_PROXY=/api/chat、PUBLIC_MODEL_API=/api/ai-model)
//   npm start                # 默认 8787 端口
//
// 环境变量:PORT / DATA_DIR / ALLOWED_ORIGIN / RATE_LIMIT / MAX_TOKENS
//          以及没有存模型时的兜底:UPSTREAM_BASE_URL / UPSTREAM_API_KEY / DEFAULT_MODEL
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createAiModelMiddleware } from 'ai-model-form/server'
import { createChatHandler } from './chat.mjs'
import { DATA_DIR, addModel, listModels, publicModel, removeModel } from './store.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const DIST = process.env.DIST_DIR ?? join(here, '..', 'dist')
const PORT = Number(process.env.PORT ?? 8787)

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '512kb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    models: listModels().length,
    dataDir: DATA_DIR,
    site: existsSync(DIST),
    uptime: Math.round(process.uptime()),
  })
})

app.post('/api/chat', createChatHandler())

// 保存/列出/删除走自己的落盘仓库(要拿明文 Key 才能替浏览器调模型)
app.post('/api/ai-model/models', (req, res) => {
  const { endpoint, modelName, displayName, apiKey } = req.body ?? {}
  if (!endpoint || !modelName) return res.status(400).json({ message: '缺少必填参数: endpoint 或 modelName' })
  try {
    const url = new URL(endpoint)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol')
  } catch {
    return res.status(400).json({ message: '接口地址格式不正确' })
  }
  const record = addModel({ endpoint, modelName, displayName, apiKey })
  res.status(201).json({ id: record.id, message: '保存成功' })
})

app.get('/api/ai-model/models/saved', (_req, res) => {
  res.json({ models: listModels().map(publicModel) })
})

app.delete('/api/ai-model/models/:id', (req, res) => {
  if (!removeModel(req.params.id)) return res.status(404).json({ message: '模型不存在' })
  res.json({ message: '删除成功' })
})

// 供应商预设 / 模型列表 / 测连接:直接用 ai-model-form 的实现
app.use('/api', createAiModelMiddleware())

// 站点
if (existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: 'index.html',
      extensions: ['html'],
      setHeaders(res, filePath) {
        // 带内容哈希的构建产物可以长缓存;图片和导图留一小时;HTML 不缓存
        if (filePath.includes('/_astro/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        } else if (/\.(png|jpe?g|svg|webp|woff2?|json)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=3600')
        }
      },
    }),
  )
  app.use((_req, res) => {
    res.status(404).sendFile(join(DIST, '404.html'))
  })
} else {
  app.use((_req, res) => {
    res.status(500).type('text/plain; charset=utf-8').send('还没构建站点:先跑 npm run build')
  })
}

app.listen(PORT, () => {
  const models = listModels().length
  console.log(`liuguang-coding 服务已启动:http://127.0.0.1:${PORT}  (模型 ${models} 条,数据目录 ${DATA_DIR})`)
})
