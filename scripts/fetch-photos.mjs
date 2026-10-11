// 一次性脚本:把演示用照片下载到 public/photos/。
// 来源:Unsplash(按 Unsplash License 可免费使用),仅作站点占位素材,不是品牌资产。
// 重新生成:`node scripts/fetch-photos.mjs`
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'photos')
await mkdir(outDir, { recursive: true })

// [文件名, Unsplash photo id, 宽, 高]
const targets = [
  ['hero.jpg', 'photo-1498050108023-c5249f4df085', 1000, 1250], // 桌面上的代码编辑器,用在 Hero
  ['code.jpg', 'photo-1461749280684-dccba630e2f6', 1400, 875], // 屏幕上的代码特写,用在课程卡
  ['people.jpg', 'photo-1522202176988-66273c2fd55f', 1000, 750], // 一起改代码的两个人,用在"有人看你的代码"
  ['desk.jpg', 'photo-1517694712202-14dd9538aa97', 1400, 875], // 桌上的笔记本与笔记,用在"每节课都有产出"
]

for (const [name, id, w, h] of targets) {
  const url = `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=72&fm=jpg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(join(outDir, name), buf)
  console.log(`${name} <- ${id} (${w}x${h}, ${buf.length} bytes)`)
}
