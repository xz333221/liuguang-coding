---
title: 乐观更新与离线队列
summary: '乐观更新是先把界面改成成功的样子, 再发请求, 失败回滚。关键是保存旧快照, 并且在连续操作时只回滚自己那一次。网络不可用时把写操作排进队列存到 IndexedDB, 恢复后按顺序重放, 每个操作带一个幂等键, 否则重放会把一次提交变成两次。'
category: frontend
node: frontend-data-optimistic
order: 77
level: 深入
tags: [乐观更新, 离线, IndexedDB, 幂等]
updated: 2026-11-19
mindmap: data-optimistic.mindmap.json
terms: []
sources:
  - title: TanStack Query · Optimistic Updates
    url: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
    note: onMutate 存快照、onError 回滚、onSettled 重新校验。
  - title: 'MDN · Window: online event'
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Window/online_event
    note: online 事件只表示网络接口恢复, 不代表服务可达。
  - title: MDN · IndexedDB API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API
    note: 事务、对象仓库与异步 API 的形状。
---

上一篇把并发的顺序管住了, 但用户点「收藏」还是要等一个往返: 点下去, 按钮转圈, 三百毫秒后变色。这三百毫秒里用户不知道有没有点中, 于是再点一次, 又取消了一次。乐观更新把这三百毫秒藏起来。

## 先改界面, 再发请求

做法很直接: 点击的那一刻就假设请求会成功, 直接改本地状态, 请求在后台跑。

```js
async function toggleFavorite(id, liked) {
  const snapshot = store.get(id);        // 1. 存快照
  store.set(id, { ...snapshot, liked }); // 2. 立刻改

  try {
    await request(`/api/favorites/${id}`, {
      method: liked ? 'PUT' : 'DELETE',
    });
  } catch (err) {
    store.set(id, snapshot);             // 3. 失败还原
    toast('操作失败, 已撤销');
  }
}
```

三步缺一不可。少了第三步, 网络失败后界面一直显示「已收藏」, 用户下次进来发现是空的。

`PUT` / `DELETE` 在这里是刻意的选择: 它们幂等, 重复发一次结果一样, 重试安全。换成 `POST /api/favorites/toggle` 就麻烦了, 重发会把状态翻回去。

## 快照的回滚边界

上面的写法在单次操作下没问题, 连续点两次就露馅了。用户先点收藏 (快照 A 是未收藏), 紧接着取消 (快照 B 是已收藏), 两个请求都在飞。第一个请求失败回滚到 A, 界面变回未收藏, 可第二个请求成功了, 服务端记的是已收藏。

快照回滚的本质是「恢复到操作前」, 当操作有多个时, 得保证回滚的是自己那一次, 而不是把后来的操作一起抹掉。

两种做法。一是回滚时用函数式更新, 只改自己那一项, 不整体覆盖; 二是干脆不回滚本地, 失败时重拉一次真实数据, 慢一点但一定和服务端一致:

```js
// 方案一: 只回滚自己那一项
setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...snapshot } : it)));

// 方案二: 丢掉本地猜测, 以服务端为准
async function onFail(err) {
  await refetch();
  toast(err.message);
}
```

TanStack Query 的写法把两件事分开: `onMutate` 存快照并改缓存, `onError` 用快照还原, `onSettled` 无论成败都重新校验。

```ts
const { mutate } = useMutation({
  mutationFn: (next: Todo) => request(`/api/todos/${next.id}`, {
    method: 'PUT',
    body: JSON.stringify(next),
  }),
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] }); // 别让在途的查询覆盖乐观值
    const previous = queryClient.getQueryData<Todo[]>(['todos']);
    queryClient.setQueryData<Todo[]>(['todos'], (old = []) =>
      old.map((t) => (t.id === next.id ? next : t)),
    );
    return { previous };
  },
  onError: (_err, _next, ctx) => {
    queryClient.setQueryData(['todos'], ctx?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`cancelQueries` 那行经常被跳过, 结果是: 页面刚挂载时有一个列表请求在飞, 乐观值写进去了, 半秒后旧列表回来, 把乐观值盖掉。用户在界面上看到「改完又弹回去」。

`onSettled` 里的失效也不是形式主义。服务端可能对数据做了加工 (补了 id、改了时间戳), 只有重新拉一次本地才和服务端对齐。

## 乐观更新的适用边界

不是所有写操作都适合乐观。

| 操作类型 | 是否适合 | 原因 |
| --- | --- | --- |
| 收藏、点赞、勾选 | 适合 | 结果确定, 失败影响小 |
| 开关类设置 | 适合 | 只有两个状态, 回滚明确 |
| 表单提交、评论 | 谨慎 | 服务端要校验, 可能拒绝 |
| 下单、支付 | 不适合 | 失败代价高, 必须等真实结果 |

判断标准是「猜错的代价」。猜错只需要撤销一次点击的, 可以做; 猜错要让用户改地址、重填金额的, 老老实实 loading。

## 离线队列

网络断了以后, 写请求会直接失败。用户不知道, 照常操作, 关掉页面, 改动全丢。要留住这些操作, 得把它们持久化。

内存队列不行, 页面一关就没了。存 `localStorage` 也不行, 它同步写、有 5MB 上限、只存字符串。写操作队列用 IndexedDB。

```js
import { openDB } from 'idb';

const db = await openDB('app-queue', 1, {
  upgrade(database) {
    database.createObjectStore('ops', { keyPath: 'id' });
  },
});

async function enqueue(op) {
  await db.put('ops', {
    id: crypto.randomUUID(),   // 幂等键, 也是主键
    url: op.url,
    method: op.method,
    body: op.body,
    createdAt: Date.now(),
  });
}
```

`crypto.randomUUID()` 只在安全上下文 (https 或 localhost) 可用, 内网 http 环境会拿到 `undefined`, 要准备一个基于 `Date.now()` 加随机数的降级方案。

重放按 `createdAt` 排序, 一条一条发:

```js
async function flush() {
  if (!navigator.onLine) return;

  const ops = (await db.getAll('ops')).sort((a, b) => a.createdAt - b.createdAt);

  for (const op of ops) {
    try {
      await request(op.url, {
        method: op.method,
        headers: { 'idempotency-key': op.id },   // 服务端按这个键去重
        body: op.body ? JSON.stringify(op.body) : undefined,
      });
      await db.delete('ops', op.id);
    } catch (err) {
      if (err.name === 'TypeError' || err.status >= 500) return; // 网络或服务还没好, 留着下次
      await db.delete('ops', op.id);                             // 4xx 是永久失败
      notify(`「${op.label}」同步失败`);
    }
  }
}

window.addEventListener('online', flush);
flush();
```

两个分支必须分开: 网络错误与 5xx 是临时的, 任务要留在队列里; 4xx (比如字段校验失败、无权限) 重放多少次都是失败, 留着只会堵住后面的操作, 只能丢弃并告诉用户。

## 幂等键

重放最大的风险是「请求其实成功了, 只是响应没回来」。前端看到超时, 把任务留在队列, 下次启动再发一遍, 服务端就多了一条记录。

解决办法是给每个操作一个稳定的键, 服务端见到同样的键就返回第一次的结果, 不再执行:

```text
POST /api/orders
Idempotency-Key: 5f3c1a8e-...
```

键必须在**入队时**生成并存下来, 不能在发送时生成。每次发送都换新键, 服务端就认不出这是同一次操作, 幂等等于没做。

这个键同时解决第 13 章第一篇那个问题: 超时重试的 POST 请求, 带上同一个键就不会重复下单。前端能做的到此为止, 服务端必须真的按这个键去重, 否则前端再规范也没用。

## 坑

| 现象 | 原因 | 改法 |
| --- | --- | --- |
| 改完弹回旧值 | 在途查询覆盖了乐观值 | `onMutate` 里先 `cancelQueries` |
| 连续操作后状态错乱 | 快照整体回滚, 盖掉了后来的修改 | 函数式更新只回滚单项 |
| 页面一关队列丢了 | 队列放在内存或 `sessionStorage` | 用 IndexedDB |
| 恢复网络后重复提交 | 重放时生成了新的幂等键 | 键在入队时生成 |
| 队列卡住不再前进 | 一条 4xx 一直重试 | 4xx 丢弃并提示 |
| 两个标签页同时重放 | 各自都监听了 `online` | 用 `BroadcastChannel` 或 Web Locks 选主 |

`navigator.onLine` 的语义要小心: 它只表示系统有没有网络接口, 连着 WiFi 但无法出网时它照样是 `true`。所以 `online` 事件只是「可能恢复了」, 真正的判断要看请求是否成功。

`Background Sync` 能在页面关闭后继续同步, 但兼容性有限, 目前仍要靠页面打开时的 `flush` 兜底。

## 小结

- 乐观更新三步: 存快照、立刻改本地、失败还原, 少一步就会出现假成功;
- 连续操作要函数式回滚单项, 或者直接以服务端重新拉取的结果为准;
- 猜测错误代价高的操作 (下单、支付) 不要用乐观更新;
- 离线队列存 IndexedDB, 监听 `online` 重放, 网络错误与 4xx 要分开处理;
- 幂等键在入队时生成并持久化, 重放时复用, 服务端按它去重;
- `navigator.onLine` 不代表服务可达, 恢复与否以请求结果为准。
