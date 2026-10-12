// 线上验收:Astro 知识库的首页、知识点页、导图 JSON、/about 是否都能打开
const base = 'https://xz333221.github.io/liuguang-coding/'

const targets = [
  ['首页', base],
  ['知识点页', `${base}python/variables-are-not-boxes/`],
  ['导图 JSON', `${base}mindmaps/python-variables.mindmap.json`],
  ['AI 知识点页', `${base}ai/temperature-and-sampling/`],
  ['分类页(筹备中)', `${base}java/`],
  ['落地页(存档)', `${base}about/`],
]

for (const [label, url] of targets) {
  try {
    const response = await fetch(url, { redirect: 'follow' })
    const text = await response.text()
    const title = text.match(/<title>([\s\S]*?)<\/title>/)
    console.log(`${label}: ${response.status} · ${title ? title[1].trim() : '(no title)'} · ${text.length}B`)
    if (label === '知识点页') {
      console.log('   问这篇按钮:', text.includes('问这篇'))
      console.log('   问答岛:', /ChatPanel/.test(text))
      console.log('   页头问答入口:', text.includes('data-chat-open'))
    }
  } catch (error) {
    console.log(`${label}: ERR ${error.message}`)
  }
}
