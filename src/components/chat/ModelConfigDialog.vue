<script setup lang="ts">
import { AddModelForm } from 'ai-model-form/client'
import 'ai-model-form/dist/ai-model-form.css'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { SavedModel } from '../../lib/chat-models'
import {
  LOCAL_API_BASE,
  installLocalModelBackend,
  resolveModelApiBase,
  saveCurrentId,
  upsertModel,
} from '../../lib/chat-models'

/**
 * 模型配置弹窗:里面直接挂 ai-model-form 的 <AddModelForm>。
 * 它是 Vue 组件,所以这里做成独立岛;和 React 的问答面板之间只通过 DOM 事件通信:
 *   收到 lg-chat:config 打开(detail 里带 model 表示编辑),保存后派发 lg-chat:models-changed。
 * 没部署 ai-model-form 的 Express 中间件时,用浏览器本地的兜底后端顶掉那三条路由。
 */
const props = withDefaults(defineProps<{ apiBase?: string }>(), { apiBase: '' })

const open = ref(false)
const theme = ref<'dark' | 'light'>('dark')
const apiBase = resolveModelApiBase(props.apiBase)
const usingLocalBackend = apiBase === LOCAL_API_BASE
const editingId = ref('')
const initial = ref<SavedModel | null>(null)

let uninstall: (() => void) | null = null
let observer: MutationObserver | undefined

function readTheme() {
  theme.value = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function openDialog(event: Event) {
  const detail = (event as CustomEvent<{ model?: SavedModel }>).detail
  editingId.value = detail?.model?.id ?? ''
  initial.value = detail?.model ?? null
  open.value = true
}

function close() {
  open.value = false
  editingId.value = ''
  initial.value = null
}

function onSaved(model: {
  id?: string
  endpoint: string
  modelName: string
  displayName?: string
  apiKey?: string
}) {
  // 编辑走同一条路:把 id 换回原来的那条,等同覆盖
  const saved = upsertModel({
    id: editingId.value || model.id || '',
    endpoint: model.endpoint,
    modelName: model.modelName,
    displayName: model.displayName || model.modelName,
    apiKey: model.apiKey ?? '',
    savedAt: Date.now(),
  })
  const target = editingId.value
    ? saved.find((item) => item.id === editingId.value)
    : saved[saved.length - 1]
  if (target) saveCurrentId(target.id)
  document.dispatchEvent(new CustomEvent('lg-chat:models-changed'))
  close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) close()
}

onMounted(() => {
  readTheme()
  observer = new MutationObserver(readTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  uninstall = installLocalModelBackend()
  document.addEventListener('lg-chat:config', openDialog)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  uninstall?.()
  document.removeEventListener('lg-chat:config', openDialog)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="open"
    class="lg-model-modal"
    role="dialog"
    aria-modal="true"
    aria-label="模型配置"
    @click.self="close"
  >
    <div class="lg-model-card">
      <header class="lg-model-head">
        <div>
          <p class="lg-model-title">模型配置</p>
          <p class="lg-model-sub">选供应商、填 Key，测通再保存；保存后回到问答面板挑一个用。</p>
        </div>
        <button type="button" class="lg-model-close" aria-label="关闭" @click="close">×</button>
      </header>

      <div class="lg-model-body">
        <AddModelForm
          :api-base="apiBase"
          :theme="theme"
          :initial="initial"
          locale="zh-CN"
          @save="onSaved"
          @cancel="close"
        />
      </div>

      <p v-if="usingLocalBackend" class="lg-model-note">
        当前没有接中间件，配置存在这台浏览器里：模型列表能不能自动拉到，取决于对方是否允许跨域，
        拉不到就直接手填模型名。「测试连接」会因为跨域失败，这属正常现象，
        在服务器上跑 ai-model-form 的中间件后把 <code>PUBLIC_MODEL_API</code> 指过去就好了。
      </p>
    </div>
  </div>
</template>

<style scoped>
.lg-model-modal {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, #0b0a09 72%, transparent);
  backdrop-filter: blur(3px);
}

.lg-model-card {
  width: min(560px, 100%);
  max-height: min(86dvh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 0 24px 60px -24px rgb(0 0 0 / 0.6);
}

.lg-model-head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid var(--line);
}

.lg-model-title {
  font-size: 0.95rem;
  font-weight: 500;
}

.lg-model-sub {
  margin-top: 0.2rem;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.lg-model-close {
  margin-left: auto;
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1;
}

.lg-model-close:hover {
  color: var(--ink);
}

.lg-model-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.15rem;
}

.lg-model-note {
  border-top: 1px solid var(--line);
  padding: 0.75rem 1.15rem;
  color: var(--muted);
  font-size: 0.74rem;
  line-height: 1.7;
}

.lg-model-note code {
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--line);
  border-radius: 5px;
  font-family: var(--font-mono);
}

/* 把 ai-model-form 的配色拉回站内令牌:表单自带的蓝色换成琥珀,圆角按全站规则。
   它把主题变量写成行内 style,所以这里必须带 !important 才盖得住。 */
.lg-model-body :deep(.form-wrap) {
  --bg: var(--canvas) !important;
  --bg-surface: var(--panel) !important;
  --bg-elevated: var(--surface) !important;
  --border: var(--line) !important;
  --border-focus: var(--accent) !important;
  --primary: var(--accent) !important;
  --primary-hover: var(--highlight) !important;
  --primary-dim: var(--accent-soft) !important;
  --text: var(--ink) !important;
  --text-dim: var(--muted) !important;
  --text-muted: var(--muted) !important;
  --font: var(--font-sans) !important;
  --radius: 10px !important;
  --radius-lg: 18px !important;
}

/* 主按钮上的字用深色(琥珀底),对比度才够 */
.lg-model-body :deep(.form-wrap .btn-primary) {
  color: var(--on-accent) !important;
}
</style>
