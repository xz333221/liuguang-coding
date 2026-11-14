// 正文里的 mermaid 流程图:构建期保留为代码块(无 JS 也能读源码),
// 页面加载后按需引入 mermaid 渲染成 SVG,主题跟着 html[data-theme] 走。
// 渲染失败时退回代码块,不让一张图毁掉整篇正文。

const SELECTOR = 'pre[data-language="mermaid"]'

let seq = 0

function palette() {
  const light = document.documentElement.dataset.theme === 'light'
  return light
    ? {
        background: '#f6f4f1',
        primaryColor: '#f1eee9',
        primaryBorderColor: '#cfc8bf',
        primaryTextColor: '#1a1815',
        secondaryColor: '#e9e4dc',
        tertiaryColor: '#efece6',
        lineColor: '#8a8177',
        edgeLabelBackground: '#f6f4f1',
        clusterBkg: '#efece6',
        clusterBorder: '#cfc8bf',
      }
    : {
        background: '#0b0a09',
        primaryColor: '#1c1917',
        primaryBorderColor: '#3b352e',
        primaryTextColor: '#f5f2ee',
        secondaryColor: '#26221e',
        tertiaryColor: '#171412',
        lineColor: '#6b6257',
        edgeLabelBackground: '#0b0a09',
        clusterBkg: '#171412',
        clusterBorder: '#3b352e',
      }
}

export function setupMermaidBlocks() {
  const blocks = Array.from(document.querySelectorAll<HTMLPreElement>(SELECTOR))
  if (blocks.length === 0) return

  void (async () => {
    const { default: mermaid } = await import('mermaid')

    const renderAll = async () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: { ...palette(), fontSize: '14px' },
        flowchart: { useMaxWidth: true },
      })
      for (const pre of blocks) {
        let host = pre.nextElementSibling
        if (!(host instanceof HTMLElement) || !host.classList.contains('lg-mermaid')) {
          host = document.createElement('div')
          host.className = 'lg-mermaid'
          pre.after(host)
        }
        const id = `lg-mermaid-${seq++}`
        try {
          const { svg } = await mermaid.render(id, pre.textContent ?? '')
          host.innerHTML = svg
          pre.hidden = true
        } catch {
          // mermaid 解析失败会在 body 里留下临时节点,清掉再退回代码块
          document.getElementById(`d${id}`)?.remove()
          host.remove()
          pre.hidden = false
        }
      }
    }

    await renderAll()

    let timer: number | undefined
    new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void renderAll(), 120)
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  })()
}