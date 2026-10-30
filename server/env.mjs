// 环境变量装载:仓库根的 .env 补一遍(进程里已有的优先,loadEnvFile 不覆盖)。
//
// 必须是服务器入口的第一个 import —— ES module 按 import 语句顺序求值,
// db.mjs / chat.mjs 在顶层就读 process.env,晚于它们加载就白读了。
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const envFile = join(here, '..', '.env')

if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch (error) {
    console.warn(`[env] .env 读取失败:${error instanceof Error ? error.message : String(error)}`)
  }
}
