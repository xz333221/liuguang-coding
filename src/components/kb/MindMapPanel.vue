<script setup lang="ts">
import { MindMap } from 'flow-mindmap'
import 'flow-mindmap/style.css'
import type { MindMapNode, MindMapTheme } from 'flow-mindmap'
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

/**
 * 知识地图面板。
 * 只读展示(flow-mindmap 的预览模式):保留展开/折叠与视图缩放,去掉编辑入口。
 * 导图数据放在 public/mindmaps/ 下按需 fetch,不进 JS 包;主题跟着 html[data-theme] 走。
 *
 * 带代码节点的导图在 460px 的嵌入区域内只能看个轮廓,所以右上角留了「全屏查看」:
 * 全屏里画布够大,节点里的代码才读得清。
 */
const props = withDefaults(defineProps<{ src: string; height?: number }>(), { height: 460 })

interface MapHandle {
  resetView?: () => void
}

const state = ref<'loading' | 'ready' | 'error'>('loading')
const data = shallowRef<MindMapNode | null>(null)
const theme = ref<MindMapTheme>({})
const mapRef = ref<MapHandle | null>(null)
const stageRef = ref<MapHandle | null>(null)
const fullscreen = ref(false)

function applyTheme() {
  const light = document.documentElement.dataset.theme === 'light'
  theme.value = light
    ? {
        bgColor: '#f6f4f1',
        rootBg: '#e9a23b',
        rootText: '#1a1408',
        branchBg: '#f1eee9',
        branchText: '#1a1815',
        lineColor: '#cfc8bf',
      }
    : {
        bgColor: '#0b0a09',
        rootBg: '#e9a23b',
        rootText: '#1a1408',
        branchBg: '#1c1917',
        branchText: '#f5f2ee',
        lineColor: '#3b352e',
      }
}

/** 把整张图缩放进可视区。库不会在数据就绪后自动做这件事,大图会被裁掉。 */
function fit(get: () => MapHandle | null) {
  nextTick(() => {
    // 节点宽高要等 richContent 里的代码排版完才算得准:第一次量到的还偏小,
    // 所以隔一会儿再校一次。
    const run = () => get()?.resetView?.()
    setTimeout(run, 250)
    setTimeout(run, 900)
    setTimeout(run, 1800)
  })
}

let observer: MutationObserver | undefined

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') fullscreen.value = false
}

watch(fullscreen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  fit(() => (open ? stageRef.value : mapRef.value))
})

onMounted(async () => {
  applyTheme()
  observer = new MutationObserver(applyTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  window.addEventListener('keydown', onKeydown)

  try {
    const response = await fetch(props.src)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const json = await response.json()
    data.value = (json?.root ?? json) as MindMapNode
    state.value = 'ready'
    fit(() => mapRef.value)
  } catch {
    state.value = 'error'
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="lg-mindmap" :style="{ height: `${props.height}px` }">
    <p v-if="state !== 'ready'" class="lg-mindmap-status">
      {{ state === 'loading' ? '导图加载中…' : '导图没能加载出来，正文里有完整内容。' }}
    </p>
    <template v-else-if="data">
      <MindMap
        ref="mapRef"
        :data="data"
        :theme="theme"
        :preview-mode="true"
        :hide-canvas-actions="true"
        class="lg-mindmap-canvas"
      />
      <button type="button" class="lg-mindmap-expand" data-mindmap-expand @click="fullscreen = true">
        全屏查看
      </button>

      <!-- 全屏:节点里带代码的导图在小框里看不清,这里给足画布 -->
      <Teleport to="body">
        <div v-if="fullscreen" class="lg-mindmap-overlay" data-mindmap-overlay @click.self="fullscreen = false">
          <div class="lg-mindmap-stage">
            <header class="lg-mindmap-stage-bar">
              <span>知识地图 · 可拖动、缩放、折叠</span>
              <button type="button" class="lg-mindmap-close" data-mindmap-close @click="fullscreen = false">
                关闭 Esc
              </button>
            </header>
            <MindMap
              ref="stageRef"
              :data="data"
              :theme="theme"
              :preview-mode="true"
              :hide-canvas-actions="true"
              class="lg-mindmap-stage-canvas"
            />
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.lg-mindmap {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}

.lg-mindmap-canvas {
  width: 100%;
  height: 100%;
}

.lg-mindmap-expand {
  position: absolute;
  top: 0.6rem;
  right: 0.7rem;
  padding: 0.22rem 0.6rem;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  color: var(--muted);
  font-size: 0.72rem;
  transition: color 0.18s;
}

.lg-mindmap-expand:hover {
  color: var(--ink);
}

.lg-mindmap-status {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem;
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
}

/* 全屏层:不圆角、只留一条分隔线,免得像一张贴上去的卡片 */
.lg-mindmap-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--canvas) 92%, transparent);
  backdrop-filter: blur(6px);
}

.lg-mindmap-stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: var(--surface);
}

.lg-mindmap-stage-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.76rem;
}

.lg-mindmap-close {
  padding: 0.2rem 0.6rem;
  color: var(--muted);
  font-size: 0.72rem;
  transition: color 0.18s;
}

.lg-mindmap-close:hover {
  color: var(--ink);
}

.lg-mindmap-stage-canvas {
  flex: 1;
  min-height: 0;
}

@media (max-width: 640px) {
  .lg-mindmap-overlay {
    padding: 0;
  }
}
</style>
