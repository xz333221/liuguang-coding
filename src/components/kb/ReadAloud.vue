<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// 文章朗读条。音频优先走服务端 /api/tts(Edge 音色 + 缓存),
// 服务端不可用时自动回退到浏览器自带的 speechSynthesis,不额外装依赖。

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

type State = 'idle' | 'loading' | 'playing' | 'paused'

const state = ref<State>('idle')
const current = ref(0)
const total = ref(0)
const error = ref('')
const voice = ref(VOICES[0].id)
const rate = ref(1)
const chunks: string[] = []

const supported = typeof window !== 'undefined' && typeof fetch === 'function'
const label = computed(() =>
  state.value === 'loading' ? '加载中…' : state.value === 'playing' ? '暂停' : state.value === 'paused' ? '继续' : '朗读',
)
const progress = computed(() =>
  state.value === 'idle' || !total.value ? '' : `${current.value}/${total.value}`,
)

let audio: HTMLAudioElement | null = null
let runId = 0
let fallback = false
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

function pushText(text: string) {
  if (text.length <= MAX_CHARS) {
    chunks.push(text)
    return
  }
  for (const piece of splitLong(text)) chunks.push(piece)
}

/** 抓正文里的段落、标题、列表项;代码块、表格、导图不读 */
function collect() {
  if (chunks.length) return
  const root = document.querySelector('#read .lg-prose')
  if (!root) return
  const skip = 'pre, code, script, style, table, .code-block, .mermaid-block, .mindmap-block, [data-no-speech]'
  const walk = (el: Element) => {
    if (el.matches(skip)) return
    const isBlock = el.matches('p, h2, h3, h4, li, blockquote, dt, dd')
    if (isBlock && !el.querySelector('p, h2, h3, h4, li, blockquote, dt, dd')) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) pushText(text)
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

function finish() {
  state.value = 'idle'
  current.value = 0
}

function fetchUrl(index: number, id: number): Promise<string> {
  const cached = urls.get(index)
  if (cached) return Promise.resolve(cached)
  return fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: chunks[index], voice: voice.value }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('tts ' + res.status)
      return res.blob()
    })
    .then((blob) => {
      if (id !== runId) throw new Error('aborted')
      const url = URL.createObjectURL(blob)
      urls.set(index, url)
      return url
    })
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
    finish()
    return
  }
  current.value = index + 1
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
    finish()
    return
  }
  current.value = index + 1
  state.value = 'loading'
  try {
    const url = await fetchUrl(index, id)
    if (id !== runId) return
    fallback = false
    if (!audio) {
      audio = new Audio()
      audio.onended = () => {
        if (state.value === 'playing') playAt(current.value, runId)
      }
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
    fallback = true
    speakAt(index, id)
  }
}

function start() {
  if (!supported) return
  error.value = ''
  runId += 1
  fallback = false
  resetAudio()
  releaseUrls()
  collect()
  if (!chunks.length) {
    error.value = '这一页没找到可朗读的正文'
    return
  }
  total.value = chunks.length
  playAt(0, runId)
}

function stop() {
  runId += 1
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  fallback = false
  resetAudio()
  releaseUrls()
  finish()
}

function toggle() {
  if (state.value === 'loading') {
    stop()
    return
  }
  if (state.value === 'playing') {
    if (fallback) window.speechSynthesis.pause()
    else audio?.pause()
    state.value = 'paused'
    return
  }
  if (state.value === 'paused') {
    if (fallback) window.speechSynthesis.resume()
    else audio?.play()
    state.value = 'playing'
    return
  }
  start()
}

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

onMounted(() => {
  const savedVoice = localStorage.getItem(VOICE_KEY) ?? ''
  if (VOICES.some((item) => item.id === savedVoice)) voice.value = savedVoice
  const savedRate = Number(localStorage.getItem(RATE_KEY))
  if (RATES.includes(savedRate)) rate.value = savedRate
  collect()
})

onBeforeUnmount(() => {
  stop()
})
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
    <select v-model="voice" class="read-pick" aria-label="朗读音色">
      <option v-for="item in VOICES" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
    <select v-model.number="rate" class="read-pick" aria-label="朗读语速">
      <option v-for="item in RATES" :key="item" :value="item">{{ item }}x</option>
    </select>
    <button v-if="state !== 'idle'" type="button" class="lg-chip" @click="stop">停止</button>
    <span v-if="progress" class="text-[0.78rem] text-muted">{{ progress }}</span>
    <span v-if="error" class="text-[0.78rem] text-[#b3261e]">{{ error }}</span>
  </div>
</template>

<style scoped>
.read-pick {
  appearance: none;
  background: transparent;
  border: 1px solid #e6e9ed;
  padding: 3px 8px;
  font-size: 12px;
  line-height: 1.6;
  color: inherit;
  cursor: pointer;
}

.read-pick:hover {
  border-color: currentColor;
}
</style>
