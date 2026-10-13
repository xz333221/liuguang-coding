<script setup lang="ts">
import { MindMap } from 'flow-mindmap'
import 'flow-mindmap/style.css'
import type { MindMapNode, MindMapTheme } from 'flow-mindmap'
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

/**
 * 知识地图面板。
 * 只读展示(flow-mindmap 的预览模式):保留展开/折叠与视图缩放,去掉编辑入口。
 * 导图数据放在 public/mindmaps/ 下按需 fetch,不进 JS 包;主题跟着 html[data-theme] 走。
 */
const props = withDefaults(defineProps<{ src: string; height?: number }>(), { height: 460 })

const state = ref<'loading' | 'ready' | 'error'>('loading')
const data = shallowRef<MindMapNode | null>(null)
const theme = ref<MindMapTheme>({})

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

let observer: MutationObserver | undefined

onMounted(async () => {
  applyTheme()
  observer = new MutationObserver(applyTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  try {
    const response = await fetch(props.src)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const json = await response.json()
    data.value = (json?.root ?? json) as MindMapNode
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="lg-mindmap" :style="{ height: `${props.height}px` }">
    <p v-if="state !== 'ready'" class="lg-mindmap-status">
      {{ state === 'loading' ? '导图加载中…' : '导图没能加载出来，正文里有完整内容。' }}
    </p>
    <template v-else-if="data">
      <MindMap
        :data="data"
        :theme="theme"
        :preview-mode="true"
        :hide-canvas-actions="true"
        class="lg-mindmap-canvas"
      />
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

/* 画布上的操作按钮(退出预览 / 大纲视图)由 flow-mindmap 的 hide-canvas-actions
   关掉:只读嵌入不需要它们——预览模式下大纲抽屉是强制关闭的,那两个按钮点了没反应。 */
</style>
