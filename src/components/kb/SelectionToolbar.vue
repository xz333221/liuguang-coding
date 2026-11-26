<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// 选中正文文字后浮出的小工具条:复制、从这一段开始朗读。
// 朗读走 window 上的自定义事件 kb-read-from,由 ReadAloud 接住,
// 这样不用在 Astro 页面之间传递组件实例。

const PROSE_SELECTOR = '#read .lg-prose'
const BLOCK_SELECTOR = 'p, h2, h3, h4, li, blockquote, dt, dd, pre, table'
const GAP = 8
const EDGE = 8

const visible = ref(false)
const copied = ref(false)
const barRef = ref<HTMLElement | null>(null)
const pos = ref({ left: 0, top: 0 })

let anchorEl: Element | null = null
let selectedText = ''
let copyTimer: number | undefined
let updateTimer: number | undefined

function hide() {
  visible.value = false
  copied.value = false
}

function readSelection(): { el: Element; text: string; rect: DOMRect } | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const root = document.querySelector(PROSE_SELECTOR)
  if (!root) return null
  const range = selection.getRangeAt(0)
  const startNode = range.startContainer
  const startEl =
    startNode.nodeType === Node.ELEMENT_NODE
      ? (startNode as Element)
      : startNode.parentElement
  // 只认从正文里起头的选区
  if (!startEl || !root.contains(startEl)) return null
  const text = selection.toString().trim()
  if (!text) return null
  const rect = range.getBoundingClientRect()
  if (!rect.width && !rect.height) return null
  return { el: startEl, text, rect }
}

function place(rect: DOMRect) {
  const bar = barRef.value
  const width = bar?.offsetWidth ?? 148
  const height = bar?.offsetHeight ?? 36
  const maxLeft = Math.max(EDGE, window.innerWidth - width - EDGE)
  const left = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - width / 2), maxLeft)
  let top = rect.top - height - GAP
  // 上方放不下就翻到选区下方;选区在视口外(键盘扩选、脚本选中)时贴着视口边
  if (top < EDGE) top = rect.bottom + GAP
  const maxTop = Math.max(EDGE, window.innerHeight - height - EDGE)
  top = Math.min(Math.max(EDGE, top), maxTop)
  pos.value = { left, top }
}

async function update() {
  const found = readSelection()
  if (!found) {
    hide()
    return
  }
  anchorEl = found.el.closest(BLOCK_SELECTOR) ?? found.el
  selectedText = found.text
  const rect = found.rect
  if (!visible.value) {
    visible.value = true
    await nextTick()
  }
  place(rect)
}

/** mouseup / keyup / touchend 之后再读选区,让浏览器先把 selection 落定 */
function scheduleUpdate() {
  if (updateTimer) window.clearTimeout(updateTimer)
  updateTimer = window.setTimeout(() => {
    updateTimer = undefined
    update()
  }, 0)
}

async function copy() {
  if (!selectedText) return
  let ok = false
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(selectedText)
      ok = true
    }
  } catch {
    ok = false
  }
  if (!ok) ok = legacyCopy(selectedText)
  if (!ok) return
  copied.value = true
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
    copyTimer = undefined
  }, 1200)
}

/** 非安全上下文(或剪贴板权限被拒)时的兜底 */
function legacyCopy(value: string): boolean {
  const area = document.createElement('textarea')
  area.value = value
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok
}

function readFrom() {
  if (anchorEl) {
    window.dispatchEvent(new CustomEvent('kb-read-from', { detail: anchorEl }))
  }
  // 收起后把选择也放掉,否则高亮还留着,看着像没生效
  window.getSelection()?.removeAllRanges()
  hide()
}

function onSelectionChange() {
  // 拖动选取的过程中选区一直在变,这里只负责"选区没了就收起",
  // 位置更新交给 mouseup / keyup / touchend
  const found = readSelection()
  if (!found) {
    hide()
    return
  }
  if (visible.value) {
    anchorEl = found.el.closest(BLOCK_SELECTOR) ?? found.el
    selectedText = found.text
    place(found.rect)
  }
}

function onPointerDown(event: MouseEvent) {
  const bar = barRef.value
  if (bar && event.target instanceof Node && bar.contains(event.target)) return
  hide()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') hide()
}

onMounted(() => {
  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('mouseup', scheduleUpdate)
  document.addEventListener('keyup', scheduleUpdate)
  document.addEventListener('touchend', scheduleUpdate)
  document.addEventListener('mousedown', onPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  // 滚动 / 缩放后选区坐标就失效了,直接收起
  window.addEventListener('scroll', hide, true)
  window.addEventListener('resize', hide)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  document.removeEventListener('mouseup', scheduleUpdate)
  document.removeEventListener('keyup', scheduleUpdate)
  document.removeEventListener('touchend', scheduleUpdate)
  document.removeEventListener('mousedown', onPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', hide, true)
  window.removeEventListener('resize', hide)
  if (copyTimer) window.clearTimeout(copyTimer)
  if (updateTimer) window.clearTimeout(updateTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sel-bar">
      <div
        v-if="visible"
        ref="barRef"
        class="sel-bar"
        :style="{ left: `${pos.left}px`, top: `${pos.top}px` }"
        role="toolbar"
        aria-label="选中文字操作"
        @mousedown.prevent
      >
        <button type="button" class="sel-bar__btn" :class="{ 'is-done': copied }" @click="copy">
          <svg class="sel-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="copied">
              <path
                d="M5 12.5 10 17.5 19 7"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </template>
            <template v-else>
              <rect
                x="9"
                y="9"
                width="11"
                height="11"
                rx="2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              />
              <path
                d="M15 6.2V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h1.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </template>
          </svg>
          <span>{{ copied ? '已复制' : '复制' }}</span>
        </button>
        <span class="sel-bar__divider" aria-hidden="true" />
        <button type="button" class="sel-bar__btn" @click="readFrom">
          <svg class="sel-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linejoin="round"
            />
            <path
              d="M15.5 9a4 4 0 0 1 0 6M18 6.6a7.4 7.4 0 0 1 0 10.8"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
            />
          </svg>
          <span>朗读</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sel-bar {
  position: fixed;
  z-index: 90;
  display: flex;
  align-items: center;
  padding: 3px;
  border: 0;
  border-radius: 6px;
  background: #26221e;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
  color: #f5f2ee;
}

.sel-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 60px;
  height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.16s ease;
}

.sel-bar__btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.sel-bar__btn:active {
  background: rgba(255, 255, 255, 0.18);
}

.sel-bar__btn:focus-visible {
  outline: 2px solid #e9a23b;
  outline-offset: -2px;
}

.sel-bar__btn.is-done {
  color: #e9a23b;
}

.sel-bar__icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.sel-bar__divider {
  width: 1px;
  height: 18px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.14);
}

.sel-bar-enter-active,
.sel-bar-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.sel-bar-enter-from,
.sel-bar-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .sel-bar-enter-active,
  .sel-bar-leave-active {
    transition: none;
  }
}
</style>
