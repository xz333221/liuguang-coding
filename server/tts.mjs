// 朗读接口:浏览器 -> 这里 -> 微软 Edge 的在线语音,合成结果按内容哈希缓存在本地。
//
// 为什么放服务端:一是浏览器自带的 speechSynthesis 音色少、跨平台不一致;
// 二是同一篇文章会被反复朗读,缓存命中后不再请求上游,速度和稳定性都更好。
// 前端拿不到任何密钥,这个接口本身也不需要密钥。
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import msedge from 'msedge-tts'
import { DATA_DIR } from './store.mjs'

const { MsEdgeTTS, OUTPUT_FORMAT } = msedge

const CACHE_DIR = join(DATA_DIR, 'tts-cache')
const MAX_TEXT = 600
const MAX_ACTIVE = 2
const CACHE_LIMIT = 3000
const RATE_LIMIT = 600

/** 与博客端保持同一组音色,前端下拉直接复用这些 id */
const VOICES = new Set([
  'zh-CN-XiaoxiaoNeural',
  'zh-CN-XiaoyiNeural',
  'zh-CN-YunxiNeural',
  'zh-CN-YunjianNeural',
  'zh-CN-YunyangNeural',
  'zh-CN-liaoning-XiaobeiNeural',
  'zh-CN-shaanxi-XiaoniNeural',
])

/** ip -> 本小时窗口内的请求数;命中缓存的不计 */
const hits = new Map()

let active = 0
const waiting = []
let writes = 0

function rateLimited(ip) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now - entry.start > 3600_000) {
    hits.set(ip, { start: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT
}

/** 上游并发有限,超出就排队,避免一次点开把连接数打满 */
async function withSlot(task) {
  if (active >= MAX_ACTIVE) await new Promise((resolve) => waiting.push(resolve))
  active += 1
  try {
    return await task()
  } finally {
    active -= 1
    const next = waiting.shift()
    if (next) next()
  }
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 缓存写到一定数量后清一批最旧的,避免目录无限膨胀 */
function pruneCache() {
  writes += 1
  if (writes % 50 !== 0) return
  try {
    const files = readdirSync(CACHE_DIR)
      .filter((name) => name.endsWith('.mp3'))
      .map((name) => ({ name, at: statSync(join(CACHE_DIR, name)).mtimeMs }))
      .sort((a, b) => a.at - b.at)
    if (files.length <= CACHE_LIMIT) return
    for (const file of files.slice(0, files.length - CACHE_LIMIT)) {
      try {
        unlinkSync(join(CACHE_DIR, file.name))
      } catch {
        // 缓存清理失败不影响本次请求
      }
    }
  } catch {
    // 目录刚建好或权限异常,下次再清
  }
}

async function synthesize(text, voice) {
  const tts = new MsEdgeTTS()
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
  return new Promise((resolve, reject) => {
    const chunks = []
    let settled = false
    const done = (error, buffer) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        tts.close()
      } catch {
        // 已经断了就不管
      }
      if (error) reject(error)
      else resolve(buffer)
    }
    const timer = setTimeout(() => done(new Error('tts timeout')), 30_000)
    const { audioStream } = tts.toStream(escapeXml(text))
    audioStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    audioStream.on('end', () => done(null, Buffer.concat(chunks)))
    audioStream.on('error', (error) => done(error))
  })
}

export function createTtsHandler() {
  return async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    const voice = typeof req.body?.voice === 'string' ? req.body.voice : VOICES.values().next().value
    if (!text) return res.status(400).json({ error: { message: 'text 不能为空' } })
    if (text.length > MAX_TEXT) {
      return res.status(400).json({ error: { message: `一次最多 ${MAX_TEXT} 字,请先切分` } })
    }
    if (!VOICES.has(voice)) return res.status(400).json({ error: { message: '不支持的音色' } })

    const key = createHash('sha1').update(voice + '\n' + text).digest('hex')
    const file = join(CACHE_DIR, key + '.mp3')
    if (existsSync(file)) {
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      return res.send(readFileSync(file))
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown'
    if (rateLimited(ip)) {
      return res.status(429).json({ error: { message: '朗读请求太频繁,歇一会儿再点' } })
    }

    try {
      const buffer = await withSlot(() => synthesize(text, voice))
      if (!buffer?.length) throw new Error('empty audio')
      mkdirSync(CACHE_DIR, { recursive: true })
      writeFileSync(file, buffer)
      pruneCache()
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'public, max-age=604800')
      res.send(buffer)
    } catch (error) {
      console.error('[tts]', error?.message || error)
      res.status(502).json({ error: { message: '语音合成失败,前端可以回退到浏览器朗读' } })
    }
  }
}
