// 正文里的 mermaid 流程图:构建期保留为代码块(无 JS 也能读源码),
// 页面加载后按需引入 mermaid 渲染成 SVG,主题跟着 html[data-theme] 走。
// 渲染失败时退回代码块,不让一张图毁掉整篇正文。
// 点图或右上角「放大」进全屏层,SVG 按可用空间尽量放大,Esc / 点空白关闭。

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

function openOverlay(host: HTMLElement) {
  const svg = host.querySelector('svg')
  if (!svg) return

  const overlay = document.createElement('div')
  overlay.className = 'lg-mermaid-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', '流程图全屏')

  const stage = document.createElement('div')
  stage.className = 'lg-mermaid-stage'
  const bar = document.createElement('header')
  bar.className = 'lg-mermaid-stage-bar'
  const title = document.createElement('span')
  title.textContent = '流程图 · 点空白或按 Esc 关闭'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'lg-mermaid-close'
  close.textContent = '关闭'
  bar.append(title, close)
  const canvas = document.createElement('div')
  canvas.className = 'lg-mermaid-stage-canvas'
  stage.append(bar, canvas)
  overlay.append(stage)

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.style.maxWidth = 'none'
  canvas.append(clone)

  const fit = () => {
    const vb = clone.viewBox.baseVal
    if (!vb.width || !vb.height) return
    const cs = getComputedStyle(canvas)
    const availW = canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const availH = canvas.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const scale = Math.min(availW / vb.width, availH / vb.height)
    clone.style.width = `${Math.floor(vb.width * scale)}px`
    clone.style.height = 'auto'
  }

  const dismiss = () => {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', fit)
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss()
  }

  close.addEventListener('click', dismiss)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) dismiss()
  })
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', fit)

  document.body.append(overlay)
  fit()
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
          const canvas = document.createElement('div')
          canvas.className = 'lg-mermaid-canvas'
          const expand = document.createElement('button')
          expand.type = 'button'
          expand.className = 'lg-mermaid-expand'
          expand.textContent = '放大'
          expand.setAttribute('aria-label', '全屏查看流程图')
          host.append(canvas, expand)
          host.addEventListener('click', () => openOverlay(host))
          pre.after(host)
        }
        const id = `lg-mermaid-${seq++}`
        try {
          const { svg } = await mermaid.render(id, pre.textContent ?? '')
          host.querySelector('.lg-mermaid-canvas')!.innerHTML = svg
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