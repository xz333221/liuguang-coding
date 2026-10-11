// 确认线上 Pages 能打开
const url = 'https://xz333221.github.io/liuguang-coding/'

fetch(url, { redirect: 'follow' })
  .then(async (response) => {
    const html = await response.text()
    const title = html.match(/<title>([\s\S]*?)<\/title>/)
    const css = html.match(/assets\/index-[^"]+\.css/)
    console.log('status:', response.status)
    console.log('title:', title ? title[1] : '(none)')
    console.log('css chunk:', css ? css[0] : '(none)')

    const cssUrl = new URL(css[0], url).href
    const cssResponse = await fetch(cssUrl)
    const cssText = await cssResponse.text()
    console.log('css status:', cssResponse.status, 'bytes:', cssText.length)
    console.log('has amber accent:', cssText.includes('#e9a23b'))
    // index.css 里的自定义动效类应出现在产物里
    console.log('has stream class:', cssText.includes('lg-stream'))
  })
  .catch((error) => {
    console.log('ERR', error.message)
  })
