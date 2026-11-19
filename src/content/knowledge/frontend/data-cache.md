---
title: 缓存与失效：SWR / TanStack Query
summary: '缓存要回答四件事: 键是什么、什么时候算新鲜、什么时候重取、什么时候丢掉。SWR 与 TanStack Query 都按 stale-while-revalidate 走, 先给旧数据再后台更新。真正要分清的是 staleTime 与 gcTime: 前者决定数据多久算新, 后者决定没组件用之后内存里留多久。'
category: frontend
node: frontend-data-cache
order: 75
level: 进阶
tags: [数据缓存, SWR, TanStack Query, 失效]
updated: 2026-11-19
mindmap: data-cache.mindmap.json
terms: []
sources:
  - title: SWR · 官方文档（中文）
    url: https://swr.vercel.app/zh-CN
    note: stale-while-revalidate 的语义与默认配置。
  - title: TanStack Query · Caching
    url: https://tanstack.com/query/latest/docs/framework/react/guides/caching
    note: staleTime、gcTime 与缓存生命周期的关系。
  - title: TanStack Query · Important Defaults
    url: https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
    note: 默认值列表, 自动化重取的三个触发点。
---

上一篇把单个请求收进了一个 `request` 函数, 但没解决重复: 侧边栏要用户信息、头像要用户信息、设置页也要用户信息, 三个组件各发一次, 页面打开就是三个同样的请求。缓存层要做的不是「存一份数据」这么简单, 它得回答四个问题。

## 缓存的四个问题

1. **键是什么**: 同一份数据怎么被认出来, 是 `/api/users/1` 还是 `['user', 1]`。
2. **什么时候算新鲜**: 拿到数据后 30 秒内, 再挂载的组件用不用重新请求。
3. **什么时候重取**: 窗口重新聚焦、网络恢复、组件重新挂载, 要不要更新。
4. **什么时候丢掉**: 没有组件用了, 内存里还留多久。

四个问题没想清就上库, 常见结果是「数据永远不更新」或者「每切一次标签页就全量刷新一次」。

## stale-while-revalidate

这个策略的名字就是做法: 先返回缓存里的旧数据 (stale), 同时后台发请求 (revalidate), 回来后替换。用户看不到 loading, 最多看到内容闪一下。

HTTP 的 `Cache-Control` 里有同名指令:

```text
Cache-Control: max-age=60, stale-while-revalidate=600
```

意思是最初 60 秒内直接用本地副本, 60 到 660 秒之间先给旧副本再后台校验, 超过 660 秒就当没有缓存。SWR 这个库的名字也来自这里, 只是它管的是内存里的请求结果, 不是 HTTP 缓存。

两者不冲突: 浏览器缓存省掉网络往返, 应用层缓存省掉组件之间重复请求, 也负责「拿到新数据后通知视图」。

## SWR 的最小用法

```tsx
import useSWR from 'swr';

const fetcher = (url: string) => request(url);

function Profile({ id }: { id: number }) {
  const { data, error, isLoading, mutate } = useSWR(`/api/users/${id}`, fetcher);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorBox message={error.message} />;

  return (
    <div>
      <span>{data.name}</span>
      <button onClick={() => mutate()}>刷新</button>
    </div>
  );
}
```

键是一个字符串, 相同键的 `useSWR` 共享同一份缓存和同一个在途请求。默认 `dedupingInterval` 是 2000 毫秒, 两秒内多个组件同时挂载只会发一次请求。

`mutate()` 不带参数时触发重新校验, 带参数时直接写缓存:

```tsx
mutate('/api/users/1', { ...data, name: '新名字' }, { revalidate: false }); // 只改本地, 不发请求
```

`revalidate: false` 表示写完不重新请求。这是乐观更新的基础, 第 13 章讲乐观更新那篇会接着用。

## TanStack Query 的两个时间

v5 里两个配置最容易混: `staleTime` 和 `gcTime`。

| 配置 | 管什么 | 默认值 | 改大的后果 |
| --- | --- | --- | --- |
| `staleTime` | 数据多久之内算新鲜, 新鲜就不重取 | `0` | 数据更新不及时 |
| `gcTime` | 没有组件订阅后, 缓存留多久再回收 | 5 分钟 | 内存占用变高 |

v5 之前 `gcTime` 叫 `cacheTime`, 名字改了语义没变。看到老文章里的 `cacheTime` 要自己换算。

默认 `staleTime: 0` 意味着数据一拿到就过期, 任何一次重新挂载都会触发后台重取。这不是 bug, 是「默认最正确」的取舍, 但对首页这类一天不变几次的数据就是浪费。

```tsx
const { data, isPending, isFetching } = useQuery({
  queryKey: ['user', id],
  queryFn: () => request<User>(`/api/users/${id}`),
  staleTime: 60_000,   // 1 分钟内算新鲜
  gcTime: 300_000,     // 组件卸载 5 分钟后回收
});
```

`isPending` 表示还没有任何数据 (首次加载), `isFetching` 表示正在请求, 包括后台刷新。判断要不要显示骨架屏用前者, 显示右上角的小转圈用后者。写成 `isLoading` 也常见, 它等于 `isPending && isFetching`。

三个自动重取的触发点是默认开着的: 组件挂载、窗口重新聚焦、网络重连。很多人以为「数据没更新」是缓存坏了, 其实是 `refetchOnWindowFocus` 在正常工作, 只是后端数据本来就没变。

## 缓存键与请求去重

键要包含所有影响结果的参数, 一个都不能少:

```ts
// 错的: 翻页后还是同一份缓存
useQuery({ queryKey: ['orders'], queryFn: () => fetchOrders(page) });

// 对的: 页码进键
useQuery({ queryKey: ['orders', { page, status }], queryFn: () => fetchOrders(page, status) });
```

键是数组, 序列化后做深比较。对象里属性的书写顺序不影响结果, 但值的类型影响: `1` 和 `'1'` 是两个键。

反过来, 键里塞了每次都变的东西等于没有缓存。`queryKey: ['user', Date.now()]` 每次渲染都是新键, 缓存永远命中不了, 请求也永远在飞。

键相同还有一个额外好处: 两个组件在同一帧里挂载, 库只会发一次请求, 结果分给两边。这是缓存层顺带解决的, 不用自己写 Promise 表。

去重只发生在**同一个 QueryClient 实例**里。SSR 场景下每个请求要新建一个 client, 否则上一个用户的数据会漏给下一个用户。Next.js 的 App Router 里 `HydrationBoundary` 那套就是为此存在的。

## 失效与手动改缓存

数据被别处改了, 缓存得跟着变。常用的三种手段:

```ts
const qc = useQueryClient();

// 1. 标记失效并重取所有以 ['orders'] 开头的查询
await qc.invalidateQueries({ queryKey: ['orders'] });

// 2. 直接用接口返回的新值写缓存, 省一次请求
qc.setQueryData(['order', id], updated);

// 3. 只标记失效, 等下次挂载再取
qc.invalidateQueries({ queryKey: ['orders'], refetchType: 'none' });
```

`invalidateQueries` 默认会立刻重取「当前有组件在用」的查询, 没人用的只标脏, 下次挂载时再取。前缀匹配是默认行为, `['orders']` 能匹配到 `['orders', { page: 1 }]`。

改完列表里某一项, 与其失效整个列表再全量拉一遍, 不如 `setQueryData` 就地改。列表很长、接口很慢时, 差别很明显。

## 坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 切换页面回来还是旧数据 | `staleTime` 设得太大 | 按数据变化频率调, 别一律 5 分钟 |
| 表单提交后列表不刷新 | 只改了服务端, 没通知缓存 | `invalidateQueries` 对应前缀 |
| 每个用户看到同一份数据 | SSR 时共用了 QueryClient | 每个请求新建实例 |
| 缓存键每次渲染都变 | 键里放了 `Date.now()` 或新建对象 | 键用原始值, 对象要稳定 |
| 请求发了两次 | 两个不同的 Provider 各建了一个 client | 全局只留一个 |

最后一条在微前端里比较常见: 主应用和子应用各包了一层 `QueryClientProvider`, 缓存和去重都失效了。

## 小结

- 缓存要定清楚键、新鲜期、重取时机、回收时机, 缺一个就会出「不更新」或「刷太勤」;
- stale-while-revalidate 是先给旧值再后台更新, 浏览器缓存与应用层缓存各管一段;
- `staleTime` 决定多久算新鲜, `gcTime` 决定无订阅后留多久, v5 里 `cacheTime` 已改名;
- 缓存键要覆盖所有影响结果的参数, 又不能放每次都变的值;
- 失效用 `invalidateQueries` 前缀匹配, 能就地改就用 `setQueryData` 省一次请求;
- 相同键的在途请求会自动去重, 但只在同一个 QueryClient 实例内。
