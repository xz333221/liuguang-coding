---
title: 调试手册：控制台、网络与性能面板
summary: '样式不对看 Elements,数据不对看 Network,报错看 Console,卡顿看 Performance,状态丢了看 Application。每个面板给出操作路径、该看哪一列,以及五个「照着做却查错方向」的坑。'
category: frontend
node: frontend-practice-debug
order: 113
level: 入门
tags: [DevTools, 调试, Network, Performance, Console]
updated: 2026-11-19
mindmap: practice-debug.mindmap.json
terms: []
sources:
  - title: Chrome DevTools · Overview
    url: https://developer.chrome.com/docs/devtools/overview
    note: 各面板职责的官方划分,以及面板之间的联动。
  - title: Chrome DevTools · Network features reference
    url: https://developer.chrome.com/docs/devtools/network/reference
    note: Status、Timing、Initiator 各列的含义与筛选方式。
  - title: Chrome DevTools · Performance panel
    url: https://developer.chrome.com/docs/devtools/performance
    note: 录制流程、火焰图与 Bottom-Up 视图的读法。
---

前两篇做出了两个能跑的站点,跑不起来的部分才是日常。调试的难点不在工具,在「先看哪个面板」:方向错了,再熟练的快捷键也只是在错误的地方翻找。这一篇按症状归类,把五个面板的操作路径走一遍。

## 按症状找面板

| 现象 | 先看 | 具体看什么 |
| --- | --- | --- |
| 样式不对、位置偏了 | Elements | Styles 的命中规则、Computed 的最终值 |
| 数据没出来 | Network | 请求有没有发、Status 与 Response |
| 按钮点了没反应 | Console | 红色报错、`getEventListeners` |
| 滚动卡、点击延迟 | Performance | 长任务、Layout 次数 |
| 刷新后登录态丢了 | Application | Cookies、Local Storage、Service Worker |
| 线上与本地不一致 | Network + Sources | 缓存、SW、实际加载的产物 |

顺序上先排除「请求没发」和「脚本报错」这两类,它们占了故障的大半,而且判断只需要几秒。样式和性能问题通常有明确的现象描述,反而好定位。

## Elements:改样式

右键页面元素 →「检查」,Elements 面板会定位到对应节点。右侧 Styles 里从上到下是命中的规则,优先级高的在上面:

- 带删除线的声明表示被后面的规则覆盖,鼠标移上去能看到赢家在哪一行;
- 最上面的 `element.style` 是这个节点的行内样式,优先级最高,也是「为什么改了 class 没用」的常见答案;
- 勾掉某条声明前的小方框可以临时禁用,比删掉再撤销省事;
- 点 `:hov` 可以强制 `:hover`、`:focus`、`:active`,调下拉菜单和焦点样式时必须用;
- 选中 flex 或 grid 容器时,元素旁边出现 `flex` 或 `grid` 小徽标,点开能看到每条轨道和间隙的实际尺寸。

Computed 标签给出最终计算值,`width`、`margin`、`font-size` 都是解析后的像素,不再是 `auto` 或 `2rem`。值右边有链接,点一下跳到定义它的那条规则,查「这个 16px 从哪来」比在 Styles 里翻快得多。

这里的修改只作用在当前文档的内存副本上,刷新即还原。它用来验证猜测,不用来改代码。

## Network:看请求

打开 Network 后刷新页面,列表才有内容。顶部筛选栏点 `Fetch/XHR` 可以滤掉图片字体,表头右键能加 `Priority`、`Protocol`、`Initiator` 这些列。

**Status** 一列决定下一步:

| 看到 | 含义 | 接着做什么 |
| --- | --- | --- |
| 200 | 成功 | 看 Response 里的内容对不对 |
| 304 | 协商缓存命中,用的是本地副本 | 勾 Disable cache 再看真实响应 |
| 4xx | 参数、权限或路径错 | 看 Response 里的错误码 |
| 5xx | 服务端异常 | 复制 request id 给后端 |
| `(failed)` | 请求根本没发出去,或被浏览器拦截 | 看 Console 里的 CORS、CSP、混合内容报错 |
| `(canceled)` | 被 `AbortController` 取消,或页面跳转打断 | 多数情况正常,不用查 |

`(failed)` 与 4xx 是两回事。前者连响应都没有,常见原因是跨域预检失败、被 CSP 的 `connect-src` 拦下、HTTPS 页面请求了 HTTP 接口。Console 里一定有一条对应报错,别在 Network 里反复点。

**Timing** 标签把一次请求拆成几段,鼠标悬停能看到每段耗时:

```text
Queueing          排队,同域并发满了(HTTP/1.1 上限 6 个)
Stalled           等可用连接
DNS Lookup        域名解析
Initial connection / SSL    TCP 与 TLS 握手
Request sent      请求已发出
Waiting (TTFB)    等第一个字节,服务端处理时间都在这一段
Content Download  下载响应体
```

TTFB 大说明服务端慢,查数据库和接口;Content Download 大说明响应体太大或带宽不够,查分页与压缩;Queueing 大说明并发请求太多,该合并或延后。三段的对策完全不同,不分开看就只能笼统地说「接口慢」。

**Initiator** 显示是谁发的请求。点开是一串调用栈,最上面那行指向源码行号,`VM123` 开头说明是 `eval` 或控制台里发出的。看到不认识的请求先看这里,比全局搜 URL 快。

页面跳转后列表会清空,勾上 `Preserve log` 才能留住上一页的请求。排查登录跳转、表单提交这类跨页流程必须勾。

## Console:比 `log` 多得多

Console 自带一套命令行 API,只在面板里存在,写进代码会报 `$0 is not defined`:

```js
$0                          // Elements 里当前选中的节点
$0.closest('form')          // 直接在上面做查询
copy($0.outerHTML)          // 结果进剪贴板,贴进编辑器
$_                          // 上一次表达式的返回值
getEventListeners($0)       // 这个节点上挂了哪些监听
monitorEvents($0, 'click')  // 事件触发时自动打印
unmonitorEvents($0)         // 关掉
console.table(rows, ['id', 'status', 'amount'])
```

`$0` 配合 Elements 使用效率最高:选中节点,回 Console 立刻能对它求值,不用写 `document.querySelector`。

事件绑没绑上,`getEventListeners` 一句话就能确认,展开还能看到 handler 的函数体。这比在源码里搜 `addEventListener` 可靠,尤其是事件由框架或第三方库代理时。

`monitorEvents` 适合查「这个事件到底有没有触发」。鼠标移动、滚动这类高频事件会刷屏,限定到 `click`、`keydown` 就好。

对象在 Console 里是懒展开的:打印时存的是引用,点开箭头那一刻才读属性,所以看到的可能是后来改过的值。要固定当场快照,用 `console.log(JSON.parse(JSON.stringify(obj)))`,或者 `copy(obj)` 之后看剪贴板。

Sources 面板里的断点比 `console.log` 精确:在行号上点一下打断点,右键可以加条件(只有 `id === 42` 时停),右侧面板能看调用栈与作用域链。临时插一句 `debugger` 效果一样,记得提交前删掉。

## Performance:火焰图

录制流程固定:开一个无痕窗口,打开 Performance 面板,点齿轮把 CPU 降到 4x 或 6x 模拟中端机,点录制(或 `Ctrl+E`),操作三到五秒,停止。

结果分三块:顶部是 FPS 与 CPU 占用,中间是火焰图,底部是统计视图。

```text
Frames   ▇▇▇▇▇▁▁▁▇▇▇▇▇     中间的空缺就是掉帧
Main     ▇▇▇▇▇▇▇▇▇▇▇▇▇▇   一条长条 = 一个任务
         ├ ▇ evaluateScript 40ms
         ├ ▇▇ Recalculate Style 120ms
         └ ▇▇▇▇ Layout 260ms   横条越宽,耗时越长
```

读法只有两条:

1. 找超过 50ms 的任务,右上角有红色三角标记,这叫长任务,会阻塞输入响应;
2. 在长任务里找自己的函数名。框架和浏览器内部的函数会占很多宽度,Expand 之后才看得到业务代码。

底部切到 `Bottom-Up`,按 `Self Time` 排序,能直接看到「哪个函数自己耗的时间最多」,不受调用层级干扰。切到 `Call Tree` 看整体结构,`Event Log` 按时间顺序列出发生的事。

`Screenshots` 勾上会录下每一帧的画面,配合火焰图能对上「卡的那一下屏幕是什么样」,代价是录制文件变大。

## Application:状态存哪了

Application 面板左边是按存储类型分的树:

- Local Storage / Session Storage:按来源分组,可以直接改值、删键,改完要刷新页面才生效;
- Cookies:能看到名称、值、`Domain`、`Path`、`Expires`、`HttpOnly`、`SameSite`。标了 `HttpOnly` 的值这里是空的,那是设计如此,不是 bug;
- IndexedDB:展开能看到库、表与记录,调试离线数据时用;
- Cache Storage:Service Worker 缓存了哪些请求,一条条列出来,可以单独删;
- Service Workers:状态、更新按钮、`Update on reload`、`Bypass for network`。这三个开关决定了你看到的是新代码还是旧缓存。

右上角 `Clear site data` 一次清掉当前来源的全部存储,排查「清缓存就好了」类问题最快。但它清不掉 CDN 和浏览器 HTTP 缓存,那部分要在 Network 里勾 `Disable cache`。

## 照着做却查错方向

- 开着 DevTools 测性能:面板本身有开销,再加上一堆扩展,数据比真实用户差一截。用无痕窗口,关掉扩展;
- 在 Elements 改了样式没反应,就怀疑选择器写错:先看 Computed 里那条属性的最终值和来源,多半是行内样式或 `!important` 压着;
- Network 里找不到某个请求:先看筛选器是不是停在 `Fetch/XHR` 之外,再看有没有勾 `Preserve log`,最后确认请求是不是由 Service Worker 直接返回的;
- 改了代码刷新没变化:优先怀疑 Service Worker,Application 里勾 `Update on reload`,不行再 `Clear site data`;
- 看到 304 就以为请求没发:304 是协商缓存命中,请求发了、服务端也回了,只是响应体没传。要复现真实响应,勾 Disable cache 或加 `Cache-Control: no-cache`。

## 小结

- 先按症状选面板,再动手;方向错了,工具再熟也是白费;
- Elements 里改样式只影响当前文档,用来看最终值和来源,不用来改代码;
- Network 先看 Status 分类,再看 Timing 拆段:TTFB 归服务端,下载归体积,排队归并发;
- `$0`、`copy()`、`getEventListeners()`、`monitorEvents()` 只在 Console 里可用,查事件比读源码快;
- 火焰图只做两件事:找 50ms 以上的长任务,在任务里找自己的函数;
- Application 管存储与 Service Worker,「清缓存才好」的问题先来这里看。
