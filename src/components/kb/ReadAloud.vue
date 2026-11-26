<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { codeLabel, codeToSpeech } from '../../lib/code-speech'
import { speechTextOf } from '../../lib/speech-text'

// 文章朗读条。音频优先走服务端 /api/tts(Edge 音色 + 缓存),
// 服务端不可用时自动回退到浏览器自带的 speechSynthesis,不额外装依赖。

const props = defineProps<{ nextHref?: string; nextTitle?: string }>()

// 读完这一篇后自动跳到下一篇并接着朗读(可关掉,开关状态存本地)
const AUTONEXT_KEY = 'flowlight-kb-autonext'
// 跨页接管:跳转前写一个标记,下一篇的朗读条看到它就自动开读
const AUTOPLAY_KEY = 'flowlight-kb-autoplay-next'

// 正文里能对应到朗读块的元素。chunks 也可能来自 pre(代码)、table(表格),
// 所以选区落在这两种里时也要能找回所在块。
const BLOCK_SELECTOR = 'p, h2, h3, h4, li, blockquote, dt, dd, pre, table'

const VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', label: '晓晓' },
  { id: 'zh-CN-XiaoyiNeural', label: '晓伊' },
  { id: 'zh-CN-YunxiNeural', label: '云希' },
  { id: 'zh-CN-YunjianNeural', label: '云健' },
  { id: 'zh-CN-YunyangNeural', label: '云扬' },
  { id: 'zh-CN-liaoning-XiaobeiNeural', label: '晓北' },
  { id: 'zh-CN-shaanxi-XiaoniNeural', label: '晓妮' },
]
const RATES = [0.9, 1, 1.25, 1.5]
const MAX_CHARS = 220
const VOICE_KEY = 'flowlight-kb-voice'
const RATE_KEY = 'flowlight-kb-rate'
// 默认同源;部署在子路径或指向独立 TTS 服务时,构建时用 PUBLIC_TTS_API 覆盖
const TTS_API = (import.meta.env.PUBLIC_TTS_API as string | undefined) || '/api/tts'

type State = 'idle' | 'loading' | 'playing' | 'paused'

const state = ref<State>('idle')
const current = ref(0)
const total = ref(0)
const error = ref('')
const voice = ref(VOICES[0].id)
const rate = ref(1)
// 自绘下拉:原生 select 的展开层由系统渲染,CSS 改不动
const voiceOpen = ref(false)
const rateOpen = ref(false)
const voicePickRef = ref<HTMLElement | null>(null)
const ratePickRef = ref<HTMLElement | null>(null)
const autonext = ref(true)
const jumping = ref(false)
const chunks: string[] = []
// 与 chunks 一一对应:这段文字来自正文里的哪个块,朗读时据此滚动并高亮
const chunkEls: (Element | null)[] = []
let readingEl: Element | null = null

// 朗读条位置:拖动后记住,下次打开沿用
const DOCK_KEY = 'flowlight-kb-dock-pos'
const dockRef = ref<HTMLElement | null>(null)
const dockPos = ref<{ x: number; y: number } | null>(null)
const dockDragging = ref(false)
let dockPointer: {
  id: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
} | null = null

const supported = typeof window !== 'undefined' && typeof fetch === 'function'
const label = computed(() =>
  state.value === 'loading' ? '加载中…' : state.value === 'playing' ? '暂停' : state.value === 'paused' ? '继续' : '朗读',
)
const progress = computed(() =>
  state.value === 'idle' || !total.value ? '' : `${current.value}/${total.value}`,
)
const voiceLabel = computed(() => VOICES.find((item) => item.id === voice.value)?.label ?? '')

let audio: HTMLAudioElement | null = null
let runId = 0
const fallback = ref(false)
const urls = new Map<number, string>()

function splitLong(text: string): string[] {
  const out: string[] = []
  let rest = text
  while (rest.length > MAX_CHARS) {
    let cut = -1
    for (const sep of ['。', '！', '？', '；', '!', '?', ';', '，', ',']) {
      const at = rest.lastIndexOf(sep, MAX_CHARS - 1)
      if (at > cut) cut = at
    }
    if (cut < 40) cut = MAX_CHARS - 1
    const piece = rest.slice(0, cut + 1).trim()
    if (piece) out.push(piece)
    rest = rest.slice(cut + 1).trim()
  }
  if (rest) out.push(rest)
  return out
}

function pushChunk(text: string, el: Element | null) {
  chunks.push(text)
  chunkEls.push(el)
}

function pushText(text: string, el: Element | null) {
  if (text.length <= MAX_CHARS) {
    pushChunk(text, el)
    return
  }
  for (const piece of splitLong(text)) pushChunk(piece, el)
}

function cellText(cell: Element): string {
  // 术语的悬浮解释卡是 aria-hidden 的,克隆一份删掉再取字,免得混进表头/单元格
  const copy = cell.cloneNode(true) as Element
  copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove())
  return (copy.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** 表格转成能听懂的说明:先说列,再逐行读 */
function tableToSpeech(table: HTMLTableElement): string {
  const rows = Array.from(table.rows).filter((row) => row.closest('table') === table)
  if (!rows.length) return ''
  const firstCells = Array.from(rows[0].cells)
  const hasHeader = firstCells.some((cell) => cell.tagName === 'TH')
  const header = hasHeader ? firstCells.map(cellText) : []
  const body = hasHeader ? rows.slice(1) : rows
  const parts: string[] = []
  if (header.length) parts.push(`共 ${header.length} 列,表头是 ${header.join('、')}。`)
  body.forEach((row, rowIndex) => {
    const cells = Array.from(row.cells).map(cellText)
    if (!cells.length) return
    const pairs = cells
      .map((value, cellIndex) => `${header[cellIndex] || `第 ${cellIndex + 1} 列`}是${value || '空'}`)
      .join('，')
    parts.push(`第 ${rowIndex + 1} 行，${pairs}。`)
  })
  return parts.join('')
}

/** 抓正文里的段落、标题、列表项;代码块与表格转成口语后一起读,导图跳过 */
function collect() {
  if (chunks.length) return
  const root = document.querySelector('#read .lg-prose')
  if (!root) return
  const skip = 'script, style, .mermaid-block, .mindmap-block, [data-no-speech]'
  const walk = (el: Element) => {
    if (el.matches(skip)) return
    if (el.matches('table')) {
      const speech = tableToSpeech(el as HTMLTableElement)
      if (speech) pushText(`表格。${speech}`, el)
      return
    }
    if (el.matches('pre')) {
      const codeEl = el.querySelector('code') ?? el
      const classes = `${el.getAttribute('class') ?? ''} ${codeEl.getAttribute('class') ?? ''}`
      const lang = (el.getAttribute('data-language') ?? classes.match(/language-([\w-]+)/)?.[1] ?? '').toLowerCase()
      const code = (codeEl.textContent ?? '').trim()
      if (code) {
        pushText(codeLabel(lang), el)
        pushText(codeToSpeech(code, lang), el)
      }
      return
    }
    const isBlock = el.matches('p, h2, h3, h4, li, blockquote, dt, dd')
    if (isBlock && !el.querySelector('p, h2, h3, h4, li, blockquote, dt, dd')) {
      // 用 speechTextOf 而不是 textContent:跳过术语的解释气泡、脚注序号,
      // 并给术语/行内代码/加粗前后补停顿
      const text = speechTextOf(el)
      if (text) pushText(text, el)
      return
    }
    for (const child of Array.from(el.children)) walk(child)
  }
  walk(root)
}

function releaseUrls() {
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
}

function resetAudio() {
  if (!audio) return
  audio.onended = null
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
}

/** 朗读到第 index 段时,把对应正文块滚进视野,并做轻量标记 */
function follow(index: number) {
  const el = chunkEls[index]
  if (!el) return
  if (readingEl !== el) {
    readingEl?.classList.remove('is-reading')
    el.classList.add('is-reading')
    readingEl = el
  }
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  // 比视口还高的块(长代码)只能让顶部对齐,普通段落居中;两者都避开页头和底部控制条
  const tall = rect.height > vh * 0.62
  const topSafe = 96
  const bottomSafe = 140
  const visible = tall
    ? rect.top >= topSafe - 8 && rect.top <= vh - bottomSafe
    : rect.top >= topSafe && rect.bottom <= vh - bottomSafe
  if (visible) return
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: tall ? 'start' : 'center' })
}

function clearReading() {
  readingEl?.classList.remove('is-reading')
  readingEl = null
}

function finish(completed = false) {
  clearReading()
  state.value = 'idle'
  current.value = 0
  if (completed && autonext.value && props.nextHref) {
    jumping.value = true
    try {
      sessionStorage.setItem(AUTOPLAY_KEY, '1')
    } catch {
      /* 隐私模式下不可用,退化成不自动朗读 */
    }
    const target = props.nextHref
    setTimeout(() => {
      window.location.assign(target)
    }, 1200)
  }
}

async function fetchUrl(index: number, id: number): Promise<string> {
  const cached = urls.get(index)
  if (cached) return cached
  const post = () =>
    fetch(TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunks[index], voice: voice.value }),
    })
  let res = await post()
  // 上游偶发空音频时服务端返回 5xx(它自己已经重试过几轮)。这里再补一次:
  // 音色突然换成系统音比多等一秒更明显。
  if (res.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    if (id !== runId) throw new Error('aborted')
    res = await post()
  }
  if (!res.ok) {
    const reason = new Error('tts ' + res.status) as Error & { status?: number }
    reason.status = res.status
    throw reason
  }
  const blob = await res.blob()
  if (id !== runId) throw new Error('aborted')
  const url = URL.createObjectURL(blob)
  urls.set(index, url)
  return url
}

function pickSystemVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  return window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith('zh')) ?? null
}

function speakAt(index: number, id: number) {
  if (id !== runId) return
  if (!('speechSynthesis' in window)) {
    error.value = '浏览器不支持朗读,换一个浏览器或用 Chrome / Edge'
    finish()
    return
  }
  if (index >= chunks.length) {
    finish(true)
    return
  }
  current.value = index + 1
  follow(index)
  const utterance = new SpeechSynthesisUtterance(chunks[index])
  utterance.lang = 'zh-CN'
  utterance.rate = rate.value
  const systemVoice = pickSystemVoice()
  if (systemVoice) utterance.voice = systemVoice
  utterance.onend = () => {
    if (id === runId) speakAt(index + 1, id)
  }
  utterance.onerror = () => {
    if (id !== runId) return
    error.value = '朗读中断了'
    finish()
  }
  window.speechSynthesis.speak(utterance)
  state.value = 'playing'
}

async function playAt(index: number, id: number) {
  if (id !== runId) return
  if (index >= chunks.length) {
    finish(true)
    return
  }
  current.value = index + 1
  follow(index)
  state.value = 'loading'
  try {
    const url = await fetchUrl(index, id)
    if (id !== runId) return
    fallback.value = false
    if (!audio) audio = new Audio()
    // 每次开播都重新挂 onended:resetAudio 会把它摘掉,只在创建时挂一次的话,
    // 点过停止 / 重新朗读之后再读,第一段读完就断链,不再往下走
    audio.onended = () => {
      if (state.value === 'playing') playAt(current.value, runId)
    }
    audio.src = url
    audio.playbackRate = rate.value
    await audio.play()
    if (id !== runId) return
    state.value = 'playing'
    // 预取下一块,减少每段之间的停顿
    fetchUrl(index + 1, id).catch(() => {})
  } catch (e) {
    if (id !== runId) return
    if (e instanceof Error && e.message === 'aborted') return
    const status = (e as { status?: number })?.status
    fallback.value = true
    error.value = status
      ? `服务端朗读不可用(HTTP ${status}),已改用浏览器语音`
      : '服务端朗读不可用,已改用浏览器语音'
    speakAt(index, id)
  }
}

/** 从文档顺序上找到选区起点所对应的朗读块 */
function chunkIndexOf(target: Element): number {
  if (!chunkEls.length) return 0
  const direct = chunkEls.indexOf(target)
  if (direct >= 0) return direct
  const block = target.closest(BLOCK_SELECTOR)
  const byBlock = block ? chunkEls.indexOf(block) : -1
  if (byBlock >= 0) return byBlock
  // 选中的是块里的行内元素(链接、加粗)或更外层的容器:取文档顺序上第一个排在它后面的块
  for (let i = 0; i < chunkEls.length; i += 1) {
    const el = chunkEls[i]
    if (!el) continue
    const position = target.compareDocumentPosition(el)
    if (position & (Node.DOCUMENT_POSITION_FOLLOWING | Node.DOCUMENT_POSITION_CONTAINED_BY)) return i
  }
  return 0
}

function resetPlayback() {
  runId += 1
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  fallback.value = false
  resetAudio()
  releaseUrls()
}

function start() {
  if (!supported) return
  error.value = ''
  resetPlayback()
  collect()
  if (!chunks.length) {
    error.value = '这一页没找到可朗读的正文'
    return
  }
  total.value = chunks.length
  playAt(0, runId)
}

/** 从选区所在的段落开始读,而不是从头读 */
function startFromElement(target: Element) {
  if (!supported) return
  const root = document.querySelector('#read .lg-prose')
  if (!root || !root.contains(target)) {
    start()
    return
  }
  error.value = ''
  resetPlayback()
  // 重收集一次:索引必须和当前 DOM 对齐,顺带把上面异步改过的正文算进来
  chunks.length = 0
  chunkEls.length = 0
  collect()
  if (!chunks.length) {
    error.value = '这一页没找到可朗读的正文'
    return
  }
  total.value = chunks.length
  playAt(chunkIndexOf(target), runId)
}

function stop() {
  resetPlayback()
  finish()
}

function toggle() {
  if (state.value === 'loading') {
    stop()
    return
  }
  if (state.value === 'playing') {
    if (fallback.value) window.speechSynthesis.pause()
    else audio?.pause()
    state.value = 'paused'
    return
  }
  if (state.value === 'paused') {
    if (fallback.value) window.speechSynthesis.resume()
    else audio?.play()
    follow(current.value - 1)
    state.value = 'playing'
    return
  }
  start()
}

watch(autonext, (next) => {
  try { localStorage.setItem(AUTONEXT_KEY, next ? '1' : '0') } catch { /* ignore */ }
})

watch(voice, (next) => {
  localStorage.setItem(VOICE_KEY, next)
  if (state.value !== 'idle') {
    stop()
    error.value = '音色已切换,点朗读重新开始'
  }
})

watch(rate, (next) => {
  localStorage.setItem(RATE_KEY, String(next))
  if (audio) audio.playbackRate = next
  if (state.value !== 'idle') {
    stop()
    error.value = '语速已切换,点朗读重新开始'
  }
})

const dockStyle = computed(() =>
  dockPos.value
    ? { left: `${dockPos.value.x}px`, top: `${dockPos.value.y}px`, bottom: 'auto', transform: 'none' }
    : undefined,
)

function clampDock(x: number, y: number) {
  const el = dockRef.value
  if (!el) return { x, y }
  const maxX = Math.max(8, window.innerWidth - el.offsetWidth - 8)
  const maxY = Math.max(8, window.innerHeight - el.offsetHeight - 8)
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) }
}

function loadDockPos() {
  try {
    const raw = localStorage.getItem(DOCK_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as { x?: unknown; y?: unknown }
    if (typeof saved.x === 'number' && typeof saved.y === 'number') {
      dockPos.value = clampDock(saved.x, saved.y)
    }
  } catch {
    /* 位置数据坏了就当没存过 */
  }
}

function saveDockPos() {
  if (!dockPos.value) return
  try {
    localStorage.setItem(DOCK_KEY, JSON.stringify(dockPos.value))
  } catch {
    /* ignore */
  }
}

function onDockPointerDown(event: PointerEvent) {
  if ((event.target as Element).closest('button, select, a, input')) return
  const el = dockRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  dockPointer = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  }
  el.setPointerCapture(event.pointerId)
}

function onDockPointerMove(event: PointerEvent) {
  if (!dockPointer || event.pointerId !== dockPointer.id) return
  const moved =
    Math.abs(event.clientX - dockPointer.startX) + Math.abs(event.clientY - dockPointer.startY)
  if (!dockDragging.value && moved < 5) return
  if (!dockDragging.value) {
    dockDragging.value = true
    document.body.style.userSelect = 'none'
  }
  dockPos.value = clampDock(event.clientX - dockPointer.offsetX, event.clientY - dockPointer.offsetY)
}

function onDockPointerUp(event: PointerEvent) {
  if (!dockPointer || event.pointerId !== dockPointer.id) return
  const wasDragging = dockDragging.value
  dockPointer = null
  dockDragging.value = false
  document.body.style.userSelect = ''
  if (wasDragging) saveDockPos()
}

function resetDockPos() {
  dockPos.value = null
  try {
    localStorage.removeItem(DOCK_KEY)
  } catch {
    /* ignore */
  }
}

function onDockResize() {
  if (dockPos.value) dockPos.value = clampDock(dockPos.value.x, dockPos.value.y)
}

function closePicks() {
  voiceOpen.value = false
  rateOpen.value = false
}

function toggleVoicePick() {
  rateOpen.value = false
  voiceOpen.value = !voiceOpen.value
}

function toggleRatePick() {
  voiceOpen.value = false
  rateOpen.value = !rateOpen.value
}

function pickVoice(id: string) {
  voice.value = id
  voiceOpen.value = false
}

function pickRate(value: number) {
  rate.value = value
  rateOpen.value = false
}

function onPickPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (voicePickRef.value?.contains(target) || ratePickRef.value?.contains(target)) return
  closePicks()
}

function onPickKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePicks()
}

// 选中文字浮条用自定义事件喊一声,省得跨 Astro 页面去拿组件实例
function onReadFrom(event: Event) {
  const detail = (event as CustomEvent<unknown>).detail
  if (detail instanceof Element) startFromElement(detail)
}

onMounted(() => {
  const savedVoice = localStorage.getItem(VOICE_KEY) ?? ''
  if (VOICES.some((item) => item.id === savedVoice)) voice.value = savedVoice
  const savedRate = Number(localStorage.getItem(RATE_KEY))
  if (RATES.includes(savedRate)) rate.value = savedRate
  if (localStorage.getItem(AUTONEXT_KEY) === '0') autonext.value = false
  collect()
  loadDockPos()
  addEventListener('resize', onDockResize)
  addEventListener('kb-read-from', onReadFrom)
  document.addEventListener('pointerdown', onPickPointerDown)
  document.addEventListener('keydown', onPickKeydown)
  // 上一篇读完后跳过来的：直接接着读
  if (sessionStorage.getItem(AUTOPLAY_KEY) === '1') {
    sessionStorage.removeItem(AUTOPLAY_KEY)
    setTimeout(() => start(), 300)
  }
})

onBeforeUnmount(() => {
  removeEventListener('resize', onDockResize)
  removeEventListener('kb-read-from', onReadFrom)
  document.removeEventListener('pointerdown', onPickPointerDown)
  document.removeEventListener('keydown', onPickKeydown)
  stop()
})

defineExpose({ start, stop, toggle, startFromElement })
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      type="button"
      class="lg-chip"
      :disabled="!supported"
      :aria-label="label + '本文'"
      @click="toggle"
    >
      {{ label }}
    </button>
    <div
      ref="voicePickRef"
      class="read-pick"
      :class="{ 'is-open': voiceOpen, 'is-disabled': fallback }"
    >
      <button
        type="button"
        class="read-pick__trigger"
        :disabled="fallback"
        :title="fallback ? '已回退浏览器语音,音色由系统决定' : '朗读音色'"
        aria-haspopup="listbox"
        :aria-expanded="voiceOpen"
        aria-label="朗读音色"
        @click="toggleVoicePick"
      >
        <span>{{ voiceLabel }}</span>
        <svg class="read-pick__caret" viewBox="0 0 12 8" aria-hidden="true">
          <path
            d="M1 1.5 6 6.5 11 1.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <ul v-if="voiceOpen" class="read-pick__menu" role="listbox" aria-label="朗读音色">
        <li v-for="item in VOICES" :key="item.id">
          <button
            type="button"
            class="read-pick__option"
            :class="{ 'is-active': item.id === voice }"
            role="option"
            :aria-selected="item.id === voice"
            @click="pickVoice(item.id)"
          >
            <span>{{ item.label }}</span>
            <svg
              v-if="item.id === voice"
              class="read-pick__check"
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path
                d="M2 6.5 5 9.5 10 3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </li>
      </ul>
    </div>
    <div ref="ratePickRef" class="read-pick read-pick--right" :class="{ 'is-open': rateOpen }">
      <button
        type="button"
        class="read-pick__trigger"
        aria-haspopup="listbox"
        :aria-expanded="rateOpen"
        aria-label="朗读语速"
        @click="toggleRatePick"
      >
        <span>{{ rate }}x</span>
        <svg class="read-pick__caret" viewBox="0 0 12 8" aria-hidden="true">
          <path
            d="M1 1.5 6 6.5 11 1.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <ul
        v-if="rateOpen"
        class="read-pick__menu read-pick__menu--right"
        role="listbox"
        aria-label="朗读语速"
      >
        <li v-for="value in RATES" :key="value">
          <button
            type="button"
            class="read-pick__option"
            :class="{ 'is-active': value === rate }"
            role="option"
            :aria-selected="value === rate"
            @click="pickRate(value)"
          >
            <span>{{ value }}x</span>
            <svg
              v-if="value === rate"
              class="read-pick__check"
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path
                d="M2 6.5 5 9.5 10 3.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </li>
      </ul>
    </div>
    <button v-if="state !== 'idle'" type="button" class="lg-chip" @click="stop">停止</button>
    <label v-if="nextHref" class="read-auto" title="读完这一篇后自动跳到下一篇并接着朗读">
      <input v-model="autonext" type="checkbox" />
      <span>自动下一篇</span>
    </label>
    <span v-if="jumping" class="text-[0.78rem] text-muted">读完，即将朗读下一篇：{{ nextTitle }}</span>
    <span v-if="progress" class="text-[0.78rem] text-muted">{{ progress }}</span>
    <span v-if="error" class="text-[0.78rem] text-[#b3261e]">{{ error }}</span>
  </div>

  <Teleport to="body">
    <Transition name="read-dock">
      <div
        v-if="state !== 'idle'"
        ref="dockRef"
        class="read-dock rounded-full border border-line bg-panel/95 px-3.5 py-2 text-ink shadow-lg backdrop-blur"
        :class="{ 'is-dragging': dockDragging }"
        :style="dockStyle"
        role="status"
        aria-live="polite"
        @pointerdown="onDockPointerDown"
        @pointermove="onDockPointerMove"
        @pointerup="onDockPointerUp"
        @pointercancel="onDockPointerUp"
        @dblclick="resetDockPos"
      >
        <span class="read-dock__grip" title="拖动，双击复位" aria-hidden="true">
          <svg viewBox="0 0 8 14">
            <path
              d="M2 2h.01M6 2h.01M2 7h.01M6 7h.01M2 12h.01M6 12h.01"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </span>
        <span class="read-dock__dot" :class="{ 'is-paused': state === 'paused' }" aria-hidden="true" />
        <div class="read-dock__text">
          <strong>{{ state === 'loading' ? '准备朗读' : state === 'paused' ? '已暂停' : '朗读中' }}</strong>
          <span class="read-dock__meta">
            {{ voiceLabel }}<template v-if="total"> · {{ current }}/{{ total }}</template>
          </span>
        </div>
        <button type="button" class="read-dock__toggle" @click="toggle">
          {{ state === 'playing' ? '暂停' : state === 'paused' ? '继续' : '取消' }}
        </button>
        <button
          type="button"
          class="read-dock__stop"
          aria-label="停止朗读"
          title="停止朗读"
          @click="stop"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 7l10 10M17 7 7 17"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.read-auto {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
  user-select: none;
}

.read-auto input {
  width: 13px;
  height: 13px;
  cursor: pointer;
}

.read-pick {
  position: relative;
  display: inline-flex;
}

.read-pick__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border: 1px solid var(--line, #e6e9ed);
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.read-pick__trigger:hover {
  border-color: var(--line-strong, currentColor);
}

.read-pick__trigger:focus-visible {
  outline: 2px solid var(--accent, #b3261e);
  outline-offset: 2px;
}

.read-pick__trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.read-pick.is-open .read-pick__trigger {
  border-color: var(--accent, #b3261e);
}

.read-pick__caret {
  width: 10px;
  height: 7px;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.read-pick.is-open .read-pick__caret {
  transform: rotate(180deg);
}

.read-pick__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 80;
  min-width: 100%;
  max-height: 260px;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  border: 1px solid var(--line, rgba(255, 255, 255, 0.14));
  border-radius: 10px;
  background: var(--panel, #1a1714);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.read-pick__menu--right {
  left: auto;
  right: 0;
}

.read-pick__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 6px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  text-align: left;
  cursor: pointer;
}

.read-pick__option:hover {
  background: color-mix(in srgb, var(--accent, #b3261e) 12%, transparent);
}

.read-pick__option.is-active {
  color: var(--accent, #b3261e);
}

.read-pick__check {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

/* ---------- 朗读时浮在底部的迷你控制条 ---------- */
.read-dock {
  position: fixed;
  left: 50%;
  bottom: clamp(1rem, 3vw, 1.5rem);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
  transform: translateX(-50%);
  background: var(--panel, #ffffff);
  border-color: var(--line, rgba(0, 0, 0, 0.12));
  color: var(--ink, inherit);
  touch-action: none;
}

.read-dock.is-dragging {
  cursor: grabbing;
}

.read-dock__grip {
  display: grid;
  place-items: center;
  width: 14px;
  flex-shrink: 0;
  color: var(--muted, #6b7280);
  cursor: grab;
}

.read-dock__grip svg {
  width: 8px;
  height: 14px;
}

.read-dock__dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent, #b3261e);
  animation: read-dock-pulse 1.4s ease-in-out infinite;
}

.read-dock__dot.is-paused {
  opacity: 0.45;
  animation: none;
}

@keyframes read-dock-pulse {
  50% {
    transform: scale(0.7);
    opacity: 0.6;
  }
}

.read-dock__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.read-dock__text strong {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.read-dock__meta {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.read-dock__toggle {
  flex-shrink: 0;
  padding: 4px 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.read-dock__toggle:hover {
  border-color: rgba(0, 0, 0, 0.3);
}

.read-dock__stop {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.read-dock__stop:hover {
  border-color: rgba(0, 0, 0, 0.3);
}

.read-dock__stop svg {
  width: 13px;
  height: 13px;
}

.read-dock__toggle:focus-visible,
.read-dock__stop:focus-visible {
  outline: 2px solid var(--accent, #b3261e);
  outline-offset: 2px;
}

.read-dock-enter-active,
.read-dock-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.read-dock-enter-from,
.read-dock-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

</style>
