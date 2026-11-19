---
title: 存储：Cookie、localStorage 与 IndexedDB
summary: 'Cookie 随同源请求发送,约 4KB,HttpOnly 与 SameSite 划安全边界;localStorage 同步读写、每源 5MB 量级,storage 事件只在其他标签页触发;IndexedDB 异步且事务化,能存结构化对象与文件,代价是 API 啰嗦。'
category: frontend
node: frontend-dom-storage
order: 45
level: 进阶
tags: [DOM, Cookie, localStorage, IndexedDB]
updated: 2026-11-19
mindmap: dom-storage.mindmap.json
terms: []
sources:
  - title: MDN · HTTP Cookie
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Cookies
    note: Cookie 的作用域规则与 HttpOnly、Secure、SameSite 属性。
  - title: MDN · Window.localStorage
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage
    note: 同步读写、容量限制与 storage 事件的触发范围。
  - title: MDN · IndexedDB API
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/IndexedDB_API
    note: 数据库版本升级、事务与请求对象模型。
---

上一篇提交完表单,数据就交给了服务端,页面自己什么也没留下。刷新一下,购物车空了、登录态没了、草稿丢了。要在浏览器里留下状态,有三套设施,选错的那套迟早会出问题。

## 三套存储的差别

先看一张对比表:

| | Cookie | localStorage | IndexedDB |
| --- | --- | --- | --- |
| 容量 | 约 4KB / 条 | 每个源 5MB 量级 | 按磁盘配额,几百 MB 起 |
| 生命周期 | 会话或 `Max-Age` | 永久,除非主动清除 | 永久,除非主动删除 |
| 随请求发送 | 是,同源请求自动带 | 否 | 否 |
| API 形态 | 字符串,同步 | 字符串,同步 | 异步,事务 |
| 能存的数据 | 只有字符串 | 只有字符串 | 结构化克隆,含 `Blob`、`ArrayBuffer` |

差别最大的是「随请求发送」这一列:

```text
浏览器 ──HTTP 请求──▶ 服务器
   │  Cookie: sid=abc; theme=dark     ← 自动附在请求头上
   │
   └─ localStorage / IndexedDB         ← 只留在本地,服务端永远看不到
```

Cookie 每发一个同源请求就带上一次,所以它适合放「服务端需要知道」的小数据,比如会话 id。localStorage 和 IndexedDB 只供前端自己使用。

## Cookie 的属性

Cookie 有两个来源:服务端 `Set-Cookie` 响应头,和前端 `document.cookie`。属性决定它在什么范围内生效:

| 属性 | 作用 |
| --- | --- |
| `HttpOnly` | JS 读不到,只能由服务端设置,防 XSS 窃取 |
| `Secure` | 只在 HTTPS 下发送,`localhost` 例外 |
| `SameSite` | 跨站请求是否携带;`Strict` / `Lax` / `None`,默认 `Lax` |
| `Domain` | 指定生效的域,设了 `.example.com` 则子域共享 |
| `Path` | 路径前缀匹配,默认是当前目录 |
| `Max-Age` | 存活秒数;`0` 或负数即删除,优先于 `Expires` |

`SameSite=None` 必须同时带 `Secure`,否则浏览器直接拒收。这条规则的背景是 CSRF:`Lax` 只允许顶层 GET 导航携带 Cookie,跨站的 `POST` 表单、`fetch`、`iframe` 都不带。把会话 Cookie 设成 `SameSite=None` 等于放弃这层保护,通常只在需要跨站嵌入的场景才这么做。

`HttpOnly` 挡的是脚本读取,挡不住 CSRF,也挡不住 XSS 直接以用户身份发请求。它只是让攻击者拿不到 Cookie 原文。

## document.cookie 的读写怪癖

这个 API 的形态很反常:读是一个字符串,写也只能一次写一条。

```js
// 写:一次只能写一个键值,属性跟在后面用分号隔开
document.cookie = 'theme=dark; Max-Age=604800; Path=/; SameSite=Lax';

// 读:返回全部可读 Cookie 拼成的一串,不含属性
console.log(document.cookie); // "theme=dark; sid=abc"

// 删:同名覆盖,Max-Age 设 0,且 Domain 与 Path 必须和写入时一致
document.cookie = 'theme=; Max-Age=0; Path=/';
```

读到的字符串里没有 `HttpOnly` 的 Cookie,也没有任何属性信息。想知道某条 Cookie 什么时候过期,前端拿不到,只能自己记。

解析要靠 `split`,顺手把值解码:

```js
function readCookie(name) {
  const row = document.cookie
    .split('; ')
    .find(pair => pair.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.slice(name.length + 1)) : null;
}
```

三个高频坑:

- **不写 `Path`**:默认路径是当前页面所在目录。在 `/user/profile` 下设的 Cookie,回到 `/` 首页读不到,现象是「登录了但首页还是未登录」。
- **值里有分号或中文**:必须 `encodeURIComponent`,否则 `;` 会把值截断,中文在部分场景下变成乱码。
- **超过 4KB**:`name=value` 合计超过约 4096 字节,浏览器直接丢弃这条 Cookie,且不报错。

## localStorage

`localStorage` 按源隔离,`https://a.com` 与 `https://b.com` 互不可见,同源的不同路径共享。读写都是同步的:

```js
localStorage.setItem('cart', JSON.stringify([{ id: 1, qty: 2 }]));
const cart = JSON.parse(localStorage.getItem('cart') ?? '[]');

localStorage.removeItem('cart');
localStorage.clear();          // 清空当前源的全部键
console.log(localStorage.length);
```

同步意味着阻塞主线程。一次 `JSON.stringify` 几 MB 的对象再 `setItem`,主线程会被按住几十毫秒,期间点击、滚动全部无响应。存储量大或者写入频繁时,应该换 IndexedDB。

存满时 `setItem` 抛出 `QuotaExceededError`。这是个 `DOMException`,`name` 是 `'QuotaExceededError'`,不是 `Error` 的普通子类判断能覆盖的:

```js
try {
  localStorage.setItem('draft', bigText);
} catch (err) {
  if (err.name === 'QuotaExceededError') {
    console.warn('本地空间不足,草稿未保存');
  }
}
```

隐私模式或者用户关掉了站点数据,访问 `localStorage` 这个属性本身就抛 `SecurityError`,连 `getItem` 都到不了。取用前包一层 `try` 更稳。

`storage` 事件用于多标签页同步,但它**只在其他同源标签页触发**,触发变更的那个页面自己收不到:

```js
window.addEventListener('storage', (event) => {
  if (event.key === 'token') {
    console.log('另一个标签页改了登录态:', event.oldValue, '→', event.newValue);
  }
});
```

`event.key` 是被改的键,`event.newValue` 是新值,`localStorage.clear()` 触发时 `key` 为 `null`。靠这个事件可以让多个标签页的登录态、主题设置保持一致。

`sessionStorage` 的 API 完全一样,区别只在生命周期:它绑定单个标签页,关掉即清,复制标签页时会把内容复制一份,新开标签页则是空的。

## IndexedDB

数据量大、要存文件、要按索引查询时用 IndexedDB。它的模型是「数据库 → 对象仓库(object store) → 记录」,所有操作走事务。

打开数据库要先定版本号,结构变更只能发生在 `onupgradeneeded` 里:

```js
const req = indexedDB.open('shop', 1);

req.onupgradeneeded = (event) => {
  const db = event.target.result;
  const store = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
  store.createIndex('byUser', 'userId');   // 建索引,后续可按用户查
};

req.onsuccess = () => {
  const db = req.result;
  console.log(db.objectStoreNames);        // DOMStringList ['orders']
};
req.onerror = () => console.error(req.error);
```

版本号只增不减。已有用户的数据库版本是 1,你把代码改成 `open('shop', 2)`,浏览器就会为这些用户再跑一次 `onupgradeneeded`,`event.oldVersion` 是 1。在升级回调里用 `if (oldVersion < 1)` 分段建表,才能兼容从任意旧版本升上来的情况。

读写走事务,结果是 `IDBRequest`,靠 `onsuccess` 回调,不是 Promise:

```js
function addOrder(db, order) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('orders', 'readwrite');
    const req = tx.objectStore('orders').add(order);
    req.onsuccess = () => resolve(req.result);   // 新记录的 id
    req.onerror = () => reject(req.error);
  });
}
```

事务有个硬约束:只在当前任务内有效。一旦回到事件循环(比如 `await fetch(...)` 之后)而事务里没有排队中的请求,它就自动提交了,之后再操作同一个事务会抛 `TransactionInactiveError`。正确顺序是先把要写的数据准备好,再开事务,事务里只做同步的 IDB 调用。

另一个坑是 `onblocked`:用户开着两个标签页,旧标签页还持有旧版本连接,新标签页的升级请求会卡住,直到旧连接关闭。监听 `db.onversionchange` 并主动 `db.close()`,可以避免用户看到「一直转圈」。

## 怎么选

- 服务端需要读到、体积很小、要跨请求保持:`Cookie`,会话类 Cookie 交给服务端设 `HttpOnly`;
- 纯前端的少量配置、主题、草稿:`localStorage`,记得 `try` 和 JSON 序列化;
- 成百上千条记录、要按字段查询、要存图片或文件:`IndexedDB`,用 `navigator.storage.estimate()` 可以查当前用量与配额;
- 登录 token:优先放 `HttpOnly` Cookie。放 localStorage 意味着任何一个 XSS 都能把它读走。

## 小结

- Cookie 约 4KB,随同源请求自动发送,`HttpOnly` 防脚本读取,`SameSite` 防跨站携带;
- `document.cookie` 读是一整串、写只能写一条,删除要 `Max-Age=0` 且 `Path`、`Domain` 对齐;
- `localStorage` 同步阻塞主线程,每个源 5MB 量级,写满抛 `QuotaExceededError`;
- `storage` 事件只在其他标签页触发,当前页要靠自己更新;
- IndexedDB 的结构变更只在 `onupgradeneeded` 里做,版本号只增不减;
- IndexedDB 的事务绑在任务上,`await` 跨任务之后不能继续用同一个事务。
