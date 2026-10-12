// 模型配置的落盘仓库(只存在服务器上)。
// 为什么自己存:ai-model-form 的中间件把配置放在内存里、而且只留掩码后的 Key,
// 拿不到明文就没法替浏览器去调模型。所以这里单独存一份带明文 Key 的配置,
// 文件权限 0600,目录不进仓库;浏览器只能拿到掩码。
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(here, 'data')
const FILE = join(DATA_DIR, 'models.json')

/** @typedef {{ id: string, endpoint: string, modelName: string, displayName: string, apiKey: string, createdAt: string }} ModelRecord */

/** @type {ModelRecord[]} */
let cache = []

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function read() {
  try {
    if (!existsSync(FILE)) return []
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.endpoint && item.modelName) : []
  } catch {
    return []
  }
}

/** 原子写:先写临时文件再改名,避免写一半挂掉把配置毁了 */
function persist(list) {
  ensureDir()
  const temp = `${FILE}.tmp`
  writeFileSync(temp, JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 })
  renameSync(temp, FILE)
  try {
    chmodSync(FILE, 0o600)
  } catch {
    // Windows 上无效,忽略
  }
  cache = list
}

export function listModels() {
  if (cache.length === 0) cache = read()
  return cache
}

export function findModel(id) {
  return listModels().find((item) => item.id === id)
}

export function addModel({ endpoint, modelName, displayName, apiKey, id }) {
  const record = {
    id: id || `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    endpoint: String(endpoint).trim().replace(/\/+$/, ''),
    modelName: String(modelName).trim(),
    displayName: String(displayName || modelName).trim(),
    apiKey: String(apiKey ?? ''),
    createdAt: new Date().toISOString(),
  }
  const list = listModels().filter((item) => item.id !== record.id)
  persist([...list, record])
  return record
}

export function removeModel(id) {
  const list = listModels()
  const next = list.filter((item) => item.id !== id)
  if (next.length === list.length) return false
  persist(next)
  return true
}

export function maskKey(key) {
  const value = String(key ?? '')
  if (!value) return ''
  if (value.length <= 10) return `${value.slice(0, 3)}****`
  return `${value.slice(0, 6)}****${value.slice(-4)}`
}

/** 给浏览器的形状:带掩码,不带明文 */
export function publicModel(record) {
  return {
    id: record.id,
    endpoint: record.endpoint,
    modelName: record.modelName,
    displayName: record.displayName,
    apiKeyMasked: maskKey(record.apiKey),
    createdAt: record.createdAt,
  }
}
