// 前端的章节目录树(20 章)。
//
// 与 javaOutline.ts 同一套约定:编号不写进数据,由树位置推导(catalog.outlineNumber);
// 节点一律 status: 'active',空不空由「子树里有几篇文章」推导,补上内容后「筹备中」自动消失。
// 文章靠 frontmatter 的 `node` 指到这里的某个 id,`category` 仍是 frontend。
//
// 章节顺序按学习路径排:HTML / CSS / JavaScript → DOM 与浏览器 → 工程化与 TypeScript
// → 框架与数据 → 性能、测试、安全、可访问性 → 跨端与实战。
// 覆盖面参照 MDN 的学习区、javascript.info 的目录、freeCodeCamp 的认证科目
// 与 roadmap.sh/frontend,不照抄任何一家的分章。
import type { Category } from './catalog'

interface OutlineNode {
  id: string
  name: string
  /** 章节落地页上的一句话说明;叶子节点省略(名字已经说清了) */
  intro?: string
  children?: OutlineNode[]
}

const outline: OutlineNode[] = [
  {
    id: 'frontend-intro',
    name: '起步与环境',
    intro: '先弄清浏览器拿到一个地址之后做了什么,再把编辑器、DevTools 和本地服务器这三样工具用顺手。',
    children: [
      { id: 'frontend-intro-what', name: '前端是什么：从输入 URL 到看见页面' },
      { id: 'frontend-intro-env', name: '开发环境：编辑器、浏览器与 DevTools' },
      { id: 'frontend-intro-first-page', name: '第一个页面：结构、样式、行为三件套' },
      { id: 'frontend-intro-how-to-read', name: '这份知识库怎么读（学习路线）' },
    ],
  },
  {
    id: 'frontend-html',
    name: 'HTML：结构与语义',
    intro: 'HTML 决定页面上有什么。标签选错,后面的样式、无障碍和 SEO 都要跟着还债。',
    children: [
      { id: 'frontend-html-document', name: '文档结构：doctype、head 与 body' },
      { id: 'frontend-html-text', name: '内容标签：标题、段落、列表、链接与图片' },
      { id: 'frontend-html-table-form', name: '表格与表单' },
      { id: 'frontend-html-semantics', name: '语义化：landmark、alt 与可访问名称' },
      { id: 'frontend-html-meta', name: 'meta、viewport 与资源加载顺序' },
    ],
  },
  {
    id: 'frontend-css-basics',
    name: 'CSS 基础',
    intro: '选择器决定改谁,层叠决定谁赢,盒模型决定占多大地方 —— 大半「样式不生效」都出在这三件事上。',
    children: [
      { id: 'frontend-css-selector', name: '选择器、组合器与伪类' },
      { id: 'frontend-css-cascade', name: '层叠、优先级与继承' },
      { id: 'frontend-css-box', name: '盒模型与 box-sizing' },
      { id: 'frontend-css-unit-color', name: '单位与颜色：px / em / rem / vw、hsl 与 oklch' },
      { id: 'frontend-css-typography', name: '字体、行高与文本排版' },
      { id: 'frontend-css-decorate', name: '背景、边框、圆角与阴影' },
    ],
  },
  {
    id: 'frontend-css-layout',
    name: 'CSS 布局',
    intro: 'Flexbox 和 Grid 覆盖了绝大多数版面;定位与层叠上下文解释剩下的「为什么压不住」。',
    children: [
      { id: 'frontend-css-flow', name: '文档流与 display' },
      { id: 'frontend-css-flex', name: 'Flexbox：主轴、换行与弹性' },
      { id: 'frontend-css-grid', name: 'Grid：轨道、区域与自动布局' },
      { id: 'frontend-css-position', name: '定位、层叠上下文与 z-index' },
      { id: 'frontend-css-responsive', name: '响应式：媒体查询、移动优先与视口' },
      { id: 'frontend-css-modern-layout', name: '容器查询、subgrid 与逻辑属性' },
    ],
  },
  {
    id: 'frontend-css-advanced',
    name: 'CSS 进阶',
    intro: '自定义属性、@layer 和 :has 是近几年真正改变写法的几件东西,再往后是样式怎么组织才不烂。',
    children: [
      { id: 'frontend-css-variable', name: '自定义属性与主题切换' },
      { id: 'frontend-css-layer', name: '@layer、@scope 与样式隔离' },
      { id: 'frontend-css-motion', name: '过渡与关键帧动画' },
      { id: 'frontend-css-transform', name: 'transform、3D 与合成' },
      { id: 'frontend-css-modern-selector', name: ':has / :is / :where 与现代选择器' },
      { id: 'frontend-css-architecture', name: '样式架构：BEM、CSS Modules 与原子化' },
    ],
  },
  {
    id: 'frontend-js-core',
    name: 'JavaScript 语言核心',
    intro: '类型、作用域、闭包、原型与 this —— 面试爱问,但更重要的是它们决定你读不读得懂别人的代码。',
    children: [
      { id: 'frontend-js-type', name: '值与类型：原始类型、对象与类型转换' },
      { id: 'frontend-js-scope', name: '变量、作用域与提升' },
      { id: 'frontend-js-function', name: '函数、参数与闭包' },
      { id: 'frontend-js-object', name: '对象、原型链与 class' },
      { id: 'frontend-js-this', name: 'this 的四种绑定' },
      { id: 'frontend-js-array', name: '数组与对象的常用方法' },
      { id: 'frontend-js-equality', name: '相等比较、深浅拷贝与不可变数据' },
      { id: 'frontend-js-error', name: '错误处理与调试' },
    ],
  },
  {
    id: 'frontend-js-async',
    name: '异步与运行时',
    intro: '事件循环被讲得很玄,其实只有调用栈、宏任务、微任务三样;Promise 与 async 都建在它上面。',
    children: [
      { id: 'frontend-js-eventloop', name: '调用栈、任务队列与事件循环' },
      { id: 'frontend-js-promise', name: 'Promise：状态、链式与错误传播' },
      { id: 'frontend-js-async-await', name: 'async / await 与并发控制' },
      { id: 'frontend-js-timer', name: '定时器、微任务与渲染时机' },
      { id: 'frontend-js-cancel', name: 'AbortController 与请求取消' },
      { id: 'frontend-js-iterator', name: '迭代器、生成器与异步迭代' },
    ],
  },
  {
    id: 'frontend-dom',
    name: 'DOM 与浏览器 API',
    intro: '框架底下就是这些 API:选节点、听事件、读表单、存数据、发请求。',
    children: [
      { id: 'frontend-dom-tree', name: 'DOM 树与节点操作' },
      { id: 'frontend-dom-event', name: '事件模型：捕获、冒泡与事件委托' },
      { id: 'frontend-dom-form', name: '表单、约束校验与 FormData' },
      { id: 'frontend-dom-storage', name: '存储：Cookie、localStorage 与 IndexedDB' },
      { id: 'frontend-dom-fetch', name: 'fetch、响应流与上传下载' },
      { id: 'frontend-dom-observer', name: 'IntersectionObserver、ResizeObserver 与 History' },
    ],
  },
  {
    id: 'frontend-browser',
    name: '浏览器工作原理',
    intro: '知道一帧是怎么拼出来的,才知道该优化哪一步;知道同源策略在防什么,才知道跨域为什么这么绕。',
    children: [
      { id: 'frontend-browser-navigation', name: '导航：DNS、TCP / TLS 与 HTTP 缓存' },
      { id: 'frontend-browser-parse', name: '解析：DOM、CSSOM 与阻塞资源' },
      { id: 'frontend-browser-render', name: '渲染流水线：布局、绘制与合成' },
      { id: 'frontend-browser-reflow', name: '重排、重绘与合成层' },
      { id: 'frontend-browser-engine', name: 'JS 引擎与内存：V8、GC 与内存泄漏' },
      { id: 'frontend-browser-same-origin', name: '同源策略、CORS 与 iframe 沙箱' },
    ],
  },
  {
    id: 'frontend-module',
    name: '模块与工程化',
    intro: '从一个人写页面到一群人维护项目,靠的是模块、包管理和一条能重复跑通的构建流程。',
    children: [
      { id: 'frontend-module-history', name: '模块化：IIFE、CommonJS 与 ESM' },
      { id: 'frontend-module-package', name: '包管理与语义化版本' },
      { id: 'frontend-module-bundler', name: '构建工具：Vite、Rollup 与 esbuild' },
      { id: 'frontend-module-lint', name: '规范与质量：ESLint、Prettier 与 Git 钩子' },
      { id: 'frontend-module-env', name: '环境变量与多环境构建' },
    ],
  },
  {
    id: 'frontend-typescript',
    name: 'TypeScript',
    intro: '类型不是写给别人看的注释:它把「这个值可能没有」从运行时提前到编辑器里。',
    children: [
      { id: 'frontend-ts-why', name: '为什么加类型：从 JavaScript 到 TypeScript' },
      { id: 'frontend-ts-basic', name: '基础类型、字面量与联合类型' },
      { id: 'frontend-ts-interface', name: '接口、类型别名与结构类型' },
      { id: 'frontend-ts-generic', name: '泛型与约束' },
      { id: 'frontend-ts-narrow', name: '类型收窄、守卫与断言' },
      { id: 'frontend-ts-utility', name: '映射类型与工具类型' },
      { id: 'frontend-ts-declare', name: '声明文件与第三方类型' },
    ],
  },
  {
    id: 'frontend-framework',
    name: '框架与组件化',
    intro: '框架只做三件事:声明式更新、组件复用、状态到视图的同步;理解这三件事,选 Vue 还是 React 只是语法差异。',
    children: [
      { id: 'frontend-framework-why', name: '框架解决什么问题：声明式与响应式' },
      { id: 'frontend-framework-component', name: '组件、props 与状态（Vue 3 / React）' },
      { id: 'frontend-framework-lifecycle', name: '生命周期与副作用' },
      { id: 'frontend-framework-render-list', name: '列表、条件渲染与 key' },
      { id: 'frontend-framework-form', name: '事件、表单与双向绑定' },
      { id: 'frontend-framework-router', name: '路由与代码分割' },
      { id: 'frontend-framework-state', name: '状态管理：局部、全局与组合式' },
      { id: 'frontend-framework-render-mode', name: '渲染模式：CSR / SSR / SSG / islands' },
    ],
  },
  {
    id: 'frontend-data',
    name: '数据获取与状态缓存',
    intro: '页面一半的 bug 出在数据上:请求没人管、缓存不失效、返回顺序乱了。',
    children: [
      { id: 'frontend-data-request', name: '请求层封装：错误、超时与重试' },
      { id: 'frontend-data-cache', name: '缓存与失效：SWR / TanStack Query' },
      { id: 'frontend-data-race', name: '竞态、防抖与并发控制' },
      { id: 'frontend-data-optimistic', name: '乐观更新与离线队列' },
      { id: 'frontend-data-realtime', name: '实时数据：WebSocket 与 SSE' },
    ],
  },
  {
    id: 'frontend-style',
    name: '样式体系与设计系统',
    intro: '样式写到一定规模就得有规矩:令牌管变量,组件库管复用,主题管深浅色。',
    children: [
      { id: 'frontend-style-token', name: '设计令牌与主题' },
      { id: 'frontend-style-solution', name: '组件库与样式方案：CSS Modules / Tailwind / CSS-in-JS' },
      { id: 'frontend-style-theme', name: '深浅色、对比度与响应式排版' },
      { id: 'frontend-style-motion', name: '动效与 prefers-reduced-motion' },
      { id: 'frontend-style-assets', name: '图标、字体与静态资源' },
    ],
  },
  {
    id: 'frontend-performance',
    name: '性能优化',
    intro: '性能不是「感觉快了」,而是 LCP / INP / CLS 三个数;先把指标测出来,再决定优化哪一段。',
    children: [
      { id: 'frontend-performance-metrics', name: '指标体系：Core Web Vitals（LCP / INP / CLS）' },
      { id: 'frontend-performance-loading', name: '加载性能：关键渲染路径与资源提示' },
      { id: 'frontend-performance-media', name: '图片、字体与媒体' },
      { id: 'frontend-performance-split', name: '代码分割、懒加载与预取' },
      { id: 'frontend-performance-runtime', name: '运行时性能：长任务、虚拟列表与渲染开销' },
      { id: 'frontend-performance-cache', name: '缓存策略与 CDN' },
      { id: 'frontend-performance-measure', name: '测量：Lighthouse、Performance 面板与 RUM' },
    ],
  },
  {
    id: 'frontend-testing',
    name: '测试与质量',
    intro: '测试是为了敢改代码:单元测试管逻辑,组件测试管交互,E2E 管那条真正走得通的路径。',
    children: [
      { id: 'frontend-testing-pyramid', name: '测试金字塔与取舍' },
      { id: 'frontend-testing-unit', name: '单元测试：Vitest' },
      { id: 'frontend-testing-component', name: '组件测试：Testing Library' },
      { id: 'frontend-testing-e2e', name: '端到端：Playwright' },
      { id: 'frontend-testing-a11y', name: '可访问性测试与视觉回归' },
      { id: 'frontend-testing-ci', name: '覆盖率与 CI 门禁' },
    ],
  },
  {
    id: 'frontend-security',
    name: '安全',
    intro: '前端的攻击面比想象中大:一个 innerHTML、一个第三方脚本、一个没设好的 Cookie 都算。',
    children: [
      { id: 'frontend-security-xss', name: 'XSS：注入点与防御' },
      { id: 'frontend-security-csrf', name: 'CSRF、SameSite 与 Cookie 作用域' },
      { id: 'frontend-security-csp', name: 'CSP 与 Trusted Types' },
      { id: 'frontend-security-supply-chain', name: '依赖安全与供应链' },
      { id: 'frontend-security-boundary', name: '能力边界：什么不该放在浏览器里' },
    ],
  },
  {
    id: 'frontend-a11y',
    name: '可访问性与国际化',
    intro: '可访问性不是给少数人做的补丁:键盘和屏幕阅读器能走通,鼠标用户通常也更好用。',
    children: [
      { id: 'frontend-a11y-semantics', name: '语义、焦点与键盘操作' },
      { id: 'frontend-a11y-aria', name: 'ARIA 的正确用法与常见误用' },
      { id: 'frontend-a11y-screen-reader', name: '屏幕阅读器、对比度与动效偏好' },
      { id: 'frontend-i18n-copy', name: '国际化：文案组织、日期数字与复数' },
      { id: 'frontend-i18n-rtl', name: 'RTL 与本地化布局' },
    ],
  },
  {
    id: 'frontend-cross-platform',
    name: '跨端与桌面',
    intro: '同一套前端代码跑在浏览器、桌面壳和小程序里,差别在能力边界与调试方式。',
    children: [
      { id: 'frontend-cross-pwa', name: 'PWA：Service Worker 与离线缓存' },
      { id: 'frontend-cross-desktop', name: 'Electron 与 Tauri：桌面端取舍' },
      { id: 'frontend-cross-miniprogram', name: '小程序与 Hybrid 容器' },
      { id: 'frontend-cross-native', name: '跨端方案：React Native 与 Flutter Web' },
    ],
  },
  {
    id: 'frontend-practice',
    name: '实战与上线',
    intro: '把前面十九章拼成两个能上线的项目,顺带把调试、部署和查资料的习惯定下来。',
    children: [
      { id: 'frontend-practice-static-site', name: '从零做一个静态站点' },
      { id: 'frontend-practice-data-app', name: '做一个带数据的应用：路由、请求与状态' },
      { id: 'frontend-practice-debug', name: '调试手册：控制台、网络与性能面板' },
      { id: 'frontend-practice-deploy', name: '部署：静态托管、CDN 与 CI' },
      { id: 'frontend-practice-docs', name: '教程与文档怎么用：MDN、javascript.info 与社区' },
    ],
  },
]

function toCategory(node: OutlineNode): Category {
  return {
    id: node.id,
    name: node.name,
    intro: node.intro,
    status: 'active',
    children: node.children?.map(toCategory),
  }
}

/** 挂到 catalog 里 frontend 分类的 children 上 */
export const frontendChapters: Category[] = outline.map(toCategory)
