---
title: 小程序与 Hybrid 容器
summary: '小程序把逻辑与渲染拆成双线程,没有 DOM,更新只能走 setData;主包 2MB 封顶逼出分包,各平台 API 前缀不同逼出条件编译;Hybrid 则是页面在 WebView 里,能力靠 JSBridge 借。'
category: frontend
node: frontend-cross-miniprogram
order: 109
level: 进阶
tags: [小程序, Hybrid, JSBridge, WebView]
updated: 2026-11-19
mindmap: cross-miniprogram.mindmap.json
terms: []
sources:
  - title: 微信开放文档 · 小程序框架
    url: https://developers.weixin.qq.com/miniprogram/dev/framework/
    note: 逻辑层与视图层的双线程模型、生命周期与路由。
  - title: 微信开放文档 · 分包加载
    url: https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/basic.html
    note: 主包与分包的体积限制、配置方式与预下载。
  - title: Android Developers · WebView
    url: https://developer.android.com/reference/android/webkit/WebView
    note: 容器侧 WebView 的生命周期回调与 JS 注入接口。
---

上一篇把网页装进桌面壳,靠 IPC 换系统能力。手机上还有两种更轻的容器:一种是小程序,代码跑在平台自己的运行时里;另一种是 Hybrid,页面就是普通网页,只是被塞进了 App 的 WebView。

## 逻辑层与视图层是两个线程

小程序没有 DOM。渲染层跑在一个 WebView 里,逻辑层跑在独立的 JS 引擎里:iOS 上是 JavaScriptCore,Android 上是 V8。两层之间隔着 Native,不能共享变量,也不能直接操作节点。

```text
逻辑层 (JSCore / V8)          视图层 (WebView)
  Page 实例、data、事件  ──setData──▶  渲染、DOM、样式
  没有 document          ◀──事件上报──  用户点击、滚动
```

所以 `document.querySelector`、`window.innerWidth` 在小程序里都不存在。要拿节点信息用 `createSelectorQuery`,要拿系统信息用 `wx.getSystemInfoSync`。这一条决定了所有从 Web 迁移过来的代码都要重写渲染部分。

好处是安全与可控:逻辑代码接触不到视图,平台的审核与限制有地方落。代价是每次更新都要显式同步,不像 Vue 或 React 那样改了数据视图自动跟着变。

## setData 的代价

`setData` 做的事比看上去多:把对象序列化成 JSON,跨线程传给视图层,视图层反序列化后做 diff,再更新真实节点。一次调用两次序列化加一次跨线程,频繁调用必然排队。

```js
// 差:整个列表重设,200 条记录全量过一遍
this.setData({ list: this.data.list.map((item) => ({ ...item, done: true })) });

// 好:只改一项,用路径定位
this.setData({ [`list[${index}].done`]: true });
```

路径写法只把变化的那一个字段送过去,视图层也只 diff 这一处。列表滚动加载、开关切换这类高频更新,差别是几十毫秒和几毫秒。

几个明确的坑:

- 单次 `setData` 的数据量官方上限是 1024KB,超了直接报错;实际建议压到几十 KB,序列化本身就占主线程。
- `this.data.list.push(x)` 不会触发渲染。`data` 是普通对象,不是响应式的,改完必须再 `setData` 一次。
- 传函数、`undefined`、循环引用的对象会丢字段或报错,`data` 只接受 JSON 能表达的值。
- 页面 `onUnload` 之后还调 `setData`,会打一条警告并可能作用于已销毁的实例,定时器要在 `onUnload` 里清掉。

## 主包 2MB 与分包

平台对体积有硬限制:主包不超过 2MB,单个分包不超过 2MB,所有分包加起来不超过 20MB。主包是启动时必须下载的部分,超了连上传都过不去。

```json
{
  "pages": ["pages/index/index", "pages/mine/mine"],
  "subPackages": [
    { "root": "packageOrder", "pages": ["pages/detail/detail", "pages/pay/pay"] },
    { "root": "packageReport", "pages": ["pages/chart/chart"], "independent": true }
  ],
  "preloadRule": {
    "pages/index/index": { "network": "all", "packages": ["packageOrder"] }
  }
}
```

- `subPackages` 里的页面不在主包里,进入时才下载,`root` 是目录前缀,页面路径相对它写。
- `independent: true` 是独立分包,不依赖主包即可运行,适合分享落地页;代价是拿不到主包的公共模块与全局状态。
- `preloadRule` 在空闲时提前下载分包,用户点进去不用等。写成 `network: "all"` 表示不限网络,`"wifi"` 则只在 Wi-Fi 下预下载。

主包超限最常见的原因不是代码,是静态资源:一张 1.5MB 的启动图、一套图标字体、一个没用到的图表库。图片走 CDN,字体用子集,库按需引入,通常就能压回去。

## 各平台的 API 长什么样

| 能力 | 微信 | 支付宝 | 抖音 |
| --- | --- | --- | --- |
| 全局对象 | `wx` | `my` | `tt` |
| 登录 | `wx.login` | `my.getAuthCode` | `tt.login` |
| 支付 | `wx.requestPayment` | `my.tradePay` | `tt.pay` |
| 本地存储 | `wx.setStorageSync` | `my.setStorageSync` | `tt.setStorageSync` |
| 页面生命周期 | `onLoad` / `onShow` | 同名 | 同名 |

命名规律大体一致,差异集中在登录、支付、分享、订阅消息这类需要平台资质的接口。剩下的分歧在样式与组件:同一段选择器在两端支持程度不同,`button` 的默认样式、`scroll-view` 的滚动行为也有出入。

跨端框架(Taro、uni-app)把源码编译成各家产物,能抹平大部分 API 差异。抹不平的地方靠条件编译:

```js
// 只在微信里执行
// #ifdef MP-WEIXIN
wx.requestSubscribeMessage({ tmplIds: ['TPL_ID'] });
// #endif

// 各端分别处理
// #ifdef MP-ALIPAY
my.alert({ content: '已保存' });
// #endif
```

条件编译是预处理,不是运行时判断,写多了会让「一份代码」变成三份互不相干的分支。真正跑不通的接口,不如抽一层适配模块,把平台差异收在一个文件里。

## Hybrid:页面在 WebView 里,能力靠桥

Hybrid 的思路相反:界面就是 H5,复用现成的 Web 技术栈,只有原生能力(相机、支付、定位、扫码)通过 JSBridge 借过来。

桥的实现有三代做法。最早是 Android 的 `addJavascriptInterface` 注入一个对象,iOS 用 `WKScriptMessageHandler` 收消息;更通用的是拦截 URL Scheme,把调用编码进 `location.href` 或一个隐藏 iframe 的 `src`,原生侧在导航回调里解析;现在多数容器用「注入对象 + 回调 id」的组合,把异步结果按 id 送回来。

```js
let seq = 0;
const pending = new Map();

// 原生侧拿到结果后调用这个全局函数
window.__bridgeCallback = (id, payload) => {
  const task = pending.get(id);
  if (!task) return;
  pending.delete(id);
  payload.error ? task.reject(new Error(payload.error)) : task.resolve(payload.data);
};

function callNative(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    const message = { id, method, params };
    if (window.webkit?.messageHandlers?.bridge) {
      window.webkit.messageHandlers.bridge.postMessage(message);   // iOS
    } else {
      window.bridge?.postMessage(JSON.stringify(message));          // Android
    }
  });
}

const { latitude, longitude } = await callNative('getLocation');
```

桥的三个坑,几乎每个 Hybrid 项目都会遇到:

- 注入时机。iOS 的 `messageHandlers` 在页面加载前由原生配置,但 H5 在 `DOMContentLoaded` 就调用时,对象可能还没挂上,报 `undefined is not an object`。要么原生在 `didCreateWebView` 时就注入,要么 H5 侧轮询一个 ready 标记。
- 高频调用丢消息。用改 `location.href` 的方式,连续调用时后一次会覆盖前一次;用 iframe 方式,Android 上需要把节点插进 DOM 再移除才生效,而且几十次之后会有明显卡顿。埋点上报要合并成批量。
- 回调泄漏。页面跳转后 `pending` 里的 Promise 永远不 settle,原生侧再回调也是打到旧页面。路由切换时要清空 `pending` 并 reject。

## WebView 的生命周期

容器侧的生命周期和浏览器不一样,顺序和覆盖范围都要单独记:

- Android:`onPageStarted` 在开始加载时触发,`onPageFinished` 在资源加载完成时触发,但 `onPageFinished` 里 `document.readyState` 未必是 `complete`,JS 注入太早会失败。
- iOS:`decidePolicyFor` 决定是否放行一次导航,可以用来拦 `target="_blank"` 和自定义 scheme。
- 白屏:通常是 JS 报错导致首屏没渲染,或者 `WKWebView` 进程被系统回收(内存压力下会杀掉 WebContent 进程),需要监听 `webViewWebContentProcessDidTerminate` 并重新加载。

还有一个绕不开的问题:键盘。Android 上没配 `windowSoftInputMode` 时,系统多半按平移(`adjustPan`)处理,输入框会被键盘挡住;改成 `adjustResize` 才会压缩可视区高度,而这要在 Activity 侧配置,H5 自己改不了。

## 小结

- 小程序是逻辑层与视图层双线程,没有 DOM,所有更新走 `setData` 跨线程同步;
- `setData` 一次两次序列化加跨线程,单次数据上限 1024KB,高频更新要按路径改字段;
- 主包 2MB、单分包 2MB、总计 20MB,超限先查静态资源而不是代码;
- `preloadRule` 提前下载分包,独立分包不依赖主包但也拿不到主包资源;
- 平台差异靠条件编译或适配模块收敛,不要散落在业务代码里;
- Hybrid 的 JSBridge 要处理注入时机、高频调用与页面切换时的回调泄漏;
- 容器的生命周期与浏览器不同,白屏多数是 JS 报错或 WebView 进程被回收。
