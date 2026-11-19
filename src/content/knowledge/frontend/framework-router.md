---
title: 路由与代码分割
summary: '单页应用把 URL 映射到组件,换页不换文档,代价是刷新 404 与首屏包体。路由表配懒加载能把代码按页面切开,而同一组件复用时参数变化不会重新挂载,必须靠 watch 或 key 主动处理。'
category: frontend
node: frontend-framework-router
order: 71
level: 进阶
tags: [路由, 代码分割, 懒加载, keep-alive, 前端路由]
updated: 2026-11-19
mindmap: framework-router.mindmap.json
terms: []
sources:
  - title: Vue Router 官方文档 · 路由懒加载
    url: https://router.vuejs.org/zh/guide/advanced/lazy-loading.html
    note: 动态 import 与按路由分块的关系。
  - title: Vue Router 官方文档 · 动态路由匹配
    url: https://router.vuejs.org/zh/guide/essentials/dynamic-matching.html
    note: 参数变化时组件复用的问题与应对方式。
  - title: React Router 官方文档 · 路由
    url: https://reactrouter.com/start/library/routing
    note: 路由配置、嵌套路由与懒加载的写法。
---

表单把数据收了回来,接下来要解决「这些页面怎么组织」。前端路由做的是把 URL 映射到组件,换页时 document 不重新加载。这件好处背后有两个必须自己处理的成本。

## 两种模式

hash 模式把路径放在 `#` 之后,浏览器不会为它发请求;history 模式用 `pushState` 改路径,长得和传统页面一样,但刷新时浏览器真的会请求那个地址。

| 维度 | hash | history |
| --- | --- | --- |
| 形态 | `/#/user/1` | `/user/1` |
| 刷新请求 | 只请求 `/`,片段不发 | 请求 `/user/1` |
| 服务端要求 | 无 | 所有路径回退到 `index.html` |
| 兼容性 | 全部 | 需要 `pushState` |
| 常见场景 | 老项目、内嵌页 | 新项目默认 |

history 模式的 404 几乎每个项目都遇到过:本地开发正常,部署到 nginx 后刷新就白屏。原因是服务器上并没有 `/user/1` 这个文件。

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

开发服务器(Vite、webpack dev server)默认做了这个回退,所以本地看不出来。

## 路由表

```js
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', component: Home },
        { path: 'user/:id', component: User, props: true },
      ],
    },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
})
```

React 用组件树描述同一件事,把 `children` 写成嵌套的 `<Route>`:父级 `<Route path="/" element={<Layout />}>` 下挂 `<Route index element={<Home />} />` 与 `<Route path="user/:id" element={<User />} />`,布局组件里放一个 `<Outlet />` 做出口。

嵌套路由的实际价值是布局复用:`Layout` 里的侧边栏与头部只挂载一次,切换子路由时只有 `<router-view>` / `<Outlet>` 那部分替换。侧边栏的滚动位置、展开状态因此能保留。

`props: true` 把路径参数变成组件 props,Vue 里可以省掉 `useRoute()`,组件也更容易单独测试。

## 懒加载怎么切包

```jsx
// vue-router 直接接受返回 Promise 的函数
const routes = [
  { path: '/user/:id', component: () => import('./views/User.vue') },
]

// React 用 lazy 包一层,再由 Suspense 提供加载态
const User = lazy(() => import('./views/User'))

function UserRoute() {
  return (
    <Suspense fallback={<Spinner />}>
      <User />
    </Suspense>
  )
}
```

打包器看到 `import()` 就单独产出一个 chunk,页面停留时不会下载。首屏只加载当前路由需要的代码,登录页不会拖着整个后台系统的图表库。

切分粒度不是越细越好。每个路由一个 chunk,进入该路由时要多一次往返;把公共依赖(UI 库、请求层)抽到入口 chunk 里,Vite 与 webpack 默认会做这种提取。判断依据是「这个模块是否只在少数路由用到」,而不是「文件是不是很大」。

发版之后会遇到另一种失败。旧页面还开着,chunk 的哈希已经变了,点击未访问过的路由会拿到 `Failed to fetch dynamically imported module`,因为那个文件名在服务器上已经不存在。

Vite 提供了 `vite:preloadError` 事件可以兜底,监听后 `location.reload()` 就能恢复。更好的做法是提示「有新版本,点击刷新」,直接 reload 会丢掉用户正在填的内容。

## 同一组件不同参数

从 `/user/1` 跳到 `/user/2`,框架复用的是同一个组件实例:不会卸载,不会重新执行 `onMounted`,也不会重建 React 组件。

```js
// Vue:参数变化时手动监听
const route = useRoute()
watch(() => route.params.id, (id) => load(id), { immediate: true })

// React:把 id 放进 effect 依赖
const { id } = useParams()
useEffect(() => { load(id) }, [id])
```

`immediate: true` 让首次进入也走这条路径,`onMounted` 里就不用再写一遍。

另一种做法是干脆强制重建:`<Route path="/user/:id" element={<User key={id} />} />`。`key` 放在路由元素上,参数一变整个组件销毁重建,状态自然清空。表单页通常希望这样,列表页则希望保留筛选条件,按场景选。

## 守卫与鉴权

```js
router.beforeEach((to) => {
  if (to.meta.auth && !isLogin()) {
    return { name: 'login', query: { from: to.fullPath } }
  }
})
```

返回一个路由对象就是重定向,返回 `false` 是取消导航。React Router 没有全局守卫这个概念,常见做法是包一个组件:未登录时 `return <Navigate to="/login" state={{ from: loc }} replace />`,否则 `return children`,再把受保护的页面套在这个组件里。

两边都要记住一点:前端守卫只是体验优化。用户能改 JS、能直接调接口,权限必须在服务端每个接口上校验。

## keep-alive 与状态保留

Vue 内置了组件缓存:

```vue
<router-view v-slot="{ Component }">
  <keep-alive :include="['ListPage']" :max="5">
    <component :is="Component" />
  </keep-alive>
</router-view>
```

被缓存的组件切走时不销毁,回来时保留滚动位置、表单内容与内部状态。`onActivated` / `onDeactivated` 替代 `onMounted` / `onUnmounted` 做数据刷新与清理。

三个边界:`include` 匹配的是组件 `name`,用了 `<script setup>` 要显式 `defineOptions({ name: 'ListPage' })`,否则缓存不生效;`max` 必须设,不设上限时访问过的页面实例全在内存里;被缓存的页面离开时不会触发 `onUnmounted`,定时器与订阅要在 `onDeactivated` 里停掉。

React 没有内置等价物,通常把列表状态提到路由之外(状态库或路由 state),或者用 CSS 隐藏而不是卸载。前者更符合 React 的心智,代价是手动管理状态的生命周期。

## 小结

- history 模式刷新依赖服务端回退到 `index.html`,hash 模式不需要;
- 嵌套路由让布局只挂载一次,切换时只替换出口部分;
- `() => import()` 按路由切 chunk,首屏只加载当前页面需要的代码;
- 参数变化时组件实例被复用,用 `watch` 或 `key` 主动响应,别指望重新挂载;
- 守卫只是体验优化,真正的权限校验在服务端;`keep-alive` 要设上限并处理失活清理。
