<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { codeLabel, codeToSpeech } from '../../lib/code-speech'

// 文章朗读条。音频优先走服务端 /api/tts(Edge 音色 + 缓存),
// 服务端不可用时自动回退到浏览器自带的 speechSynthesis,不额外装依赖。

const props = defineProps<{ nextHref?: string; nextTitle?: string }>()

// 读完这一篇后自动跳到下一篇并接着朗读(可关掉,开关状态存本地)
const AUTONEXT_KEY = 'flowlight-kb-autonext'
// 跨页接管:跳转前写一个标记,下一篇的朗读条看到它就自动开读
const AUTOPLAY_KEY = 'flowlight-kb-autoplay-next'

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
const autonext = ref(true)
const jumping = ref(false)
const chunks: string[] = []

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

function pushText(text: string) {
  if (text.length <= MAX_CHARS) {
    chunks.push(text)
    return
  }
  for (const piece of splitLong(text)) chunks.push(piece)
}

/** 抓正文里的段落、标题、列表项;代码块转成口语后一起读,表格和导图跳过 */
function collect() {
  if (chunks.length) return
  const root = document.querySelector('#read .lg-prose')
  if (!root) return
  const skip = 'script, style, table, .mermaid-block, .mindmap-block, [data-no-speech]'
  const walk = (el: Element) => {
    if (el.matches(skip)) return
    if (el.matches('pre')) {
      const codeEl = el.querySelector('code') ?? el
      const classes = `${el.getAttribute('class') ?? ''} ${codeEl.getAttribute('class') ?? ''}`
      const lang = (el.getAttribute('data-language') ?? classes.match(/language-([\w-]+)/)?.[1] ?? '').toLowerCase()
      const code = (codeEl.textContent ?? '').trim()
      if (code) {
        pushText(codeLabel(lang))
        pushText(codeToSpeech(code, lang))
      }
      return
    }
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

function finish(completed = false) {
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
  state.value = 'loading'
  try {
    const url = await fetchUrl(index, id)
    if (id !== runId) return
    fallback.value = false
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
    const status = (e as { status?: number })?.status
    fallback.value = true
    error.value = status
      ? `服务端朗读不可用(HTTP ${status}),已改用浏览器语音`
      : '服务端朗读不可用,已改用浏览器语音'
    speakAt(index, id)
  }
}

function start() {
  if (!supported) return
  error.value = ''
  runId += 1
  fallback.value = false
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
  fallback.value = false
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
    if (fallback.value) window.speechSynthesis.pause()
    else audio?.pause()
    state.value = 'paused'
    return
  }
  if (state.value === 'paused') {
    if (fallback.value) window.speechSynthesis.resume()
    else audio?.play()
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

onMounted(() => {
  const savedVoice = localStorage.getItem(VOICE_KEY) ?? ''
  if (VOICES.some((item) => item.id === savedVoice)) voice.value = savedVoice
  const savedRate = Number(localStorage.getItem(RATE_KEY))
  if (RATES.includes(savedRate)) rate.value = savedRate
  if (localStorage.getItem(AUTONEXT_KEY) === '0') autonext.value = false
  collect()
  // 上一篇读完后跳过来的：直接接着读
  if (sessionStorage.getItem(AUTOPLAY_KEY) === '1') {
    sessionStorage.removeItem(AUTOPLAY_KEY)
    setTimeout(() => start(), 300)
  }
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
    <select
      v-model="voice"
      class="read-pick"
      :disabled="fallback"
      :title="fallback ? '已回退浏览器语音,音色由系统决定' : '朗读音色'"
      aria-label="朗读音色"
    >
      <option v-for="item in VOICES" :key="item.id" :value="item.id">{{ item.label }}</option>
    </select>
    <select v-model.number="rate" class="read-pick" aria-label="朗读语速">
      <option v-for="item in RATES" :key="item" :value="item">{{ item }}x</option>
    </select>
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
        class="read-dock rounded-full border border-line bg-panel/95 px-3.5 py-2 text-ink shadow-lg backdrop-blur"
        role="status"
        aria-live="polite"
      >
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
