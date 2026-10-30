// 模型配置的仓库,两处存放:
//   全局 —— data/models.json(匿名用户、老行为),明文 Key,0600
//   按用户 —— MySQL model_configs 表(登录用户),密钥同样只放服务端
// 为什么自己存:ai-model-form 的中间件把配置放在内存里、而且只留掩码后的 Key,
// 拿不到明文就没法替浏览器去调模型。
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from './db.mjs'

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

/**
 * 给浏览器的形状:带掩码,不带明文。
 * scope 区分归属:user = 这位登录用户自己存的,global = 服务端公共仓库。
 */
export function publicModel(record, scope = 'global') {
  return {
    id: record.id,
    endpoint: record.endpoint,
    modelName: record.modelName ?? record.model_name,
    displayName: record.displayName ?? record.display_name ?? record.modelName ?? record.model_name,
    apiKeyMasked: maskKey(record.apiKey ?? record.api_key),
    createdAt: record.createdAt ?? record.created_at,
    scope,
  }
}

// ---------------- 按用户存的模型配置(MySQL) ----------------

/** @returns {Promise<{ id: string, endpoint: string, model_name: string, display_name: string, api_key: string, created_at: string }[]>} */
export async function listUserModels(userId) {
  const [rows] = await query(
    'SELECT id, endpoint, model_name, display_name, api_key, created_at FROM model_configs WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return rows
}

export async function findUserModel(userId, id) {
  const [rows] = await query(
    'SELECT id, endpoint, model_name, display_name, api_key, created_at FROM model_configs WHERE user_id = ? AND id = ? LIMIT 1',
    [userId, id],
  )
  return rows[0] ?? null
}

/** 同一用户同一端点下模型名重复,视为改密钥(沿用原 id 覆盖),不报错 */
export async function addUserModel(userId, { endpoint, modelName, displayName, apiKey, id }) {
  const clean = {
    endpoint: String(endpoint).trim().replace(/\/+$/, ''),
    modelName: String(modelName).trim(),
    displayName: String(displayName || modelName).trim(),
    apiKey: String(apiKey ?? ''),
  }
  let recordId = id
  if (!recordId) {
    const [rows] = await query(
      'SELECT id FROM model_configs WHERE user_id = ? AND endpoint = ? AND model_name = ? LIMIT 1',
      [userId, clean.endpoint, clean.modelName],
    )
    recordId = rows[0]?.id || `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
  await query(
    `INSERT INTO model_configs (id, user_id, endpoint, model_name, display_name, api_key)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), api_key = VALUES(api_key)`,
    [recordId, userId, clean.endpoint, clean.modelName, clean.displayName, clean.apiKey],
  )
  return { id: recordId, ...clean }
}

export async function removeUserModel(userId, id) {
  const [result] = await query('DELETE FROM model_configs WHERE user_id = ? AND id = ?', [userId, id])
  return result.affectedRows > 0
}
