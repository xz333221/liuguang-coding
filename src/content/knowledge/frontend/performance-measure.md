---
title: 测量：Lighthouse、Performance 面板与 RUM
summary: 'Lighthouse 给的是实验室里的模拟数据,CrUX 给的是真实用户的第 75 百分位。前者用来定位与回归,后者用来判断上线后到底有没有变好,两者不能互相替代。'
category: frontend
node: frontend-performance-measure
order: 90
level: 进阶
tags: [性能, Lighthouse, RUM, Performance 面板, 监控]
updated: 2026-11-19
mindmap: performance-measure.mindmap.json
terms: []
sources:
  - title: web.dev · Lighthouse performance scoring
    url: https://web.dev/articles/performance-scoring
    note: 分数如何由各项指标加权得出,以及指标与 lab 数据的关系。
  - title: web.dev · Measuring performance in the field
    url: https://web.dev/articles/field-data
    note: 真实用户数据与实验室数据的差异,以及采集要点。
  - title: MDN · Performance.mark()
    url: https://developer.mozilla.org/zh-CN/docs/Web/API/Performance/mark
    note: 自定义时间戳与 measure 的用法。
---

上一篇把缓存配好了,但配完不等于变快。最后这一篇解决判断问题:改动到底有没有用,在谁的机器上有用,回归是什么时候发生的。

## 两种数据

性能数据分两类,来源和用途都不一样:

| 维度 | 实验室(lab) | 现场(field) |
| --- | --- | --- |
| 来源 | Lighthouse、Performance 面板 | CrUX、自建 RUM |
| 环境 | 固定设备、固定网络模拟 | 真实设备、真实网络 |
| 样本 | 一次或几次运行 | 成千上万次访问 |
| 口径 | 单次测量值 | 第 75 百分位 |
| 用途 | 定位瓶颈、做回归 | 判断真实体验、定优先级 |

实验室数据可控、可复现,适合「改完再看一次」。现场数据噪声大,但只有它能回答「用户是不是真的变快了」。用 Lighthouse 分数当验收标准,容易出现分数涨了、用户没感觉的情况。

## Lighthouse 怎么读

Lighthouse 默认按移动端跑:模拟慢速 4G、把 CPU 降速若干倍,再跑一遍页面。它报出的 LCP、CLS、TBT 都是这次模拟的结果。

分数由若干指标加权算出来,其中 TBT(Total Blocking Time,总阻塞时间)权重很高。TBT 是把 FCP 之后所有超过 50ms 的任务超出部分累加:

```text
TBT = Σ (每个长任务耗时 - 50ms)
```

它是 INP 在实验室里的代理指标。真实 INP 依赖用户什么时候点、点哪里,实验室没法模拟,只能用「主线程有多堵」近似。

几点使用注意:

- 单次结果波动大,至少跑 3 次看中位数,尤其 TBT 与 LCP;
- Chrome 扩展版与 CI 里的版本、配置要一致,否则数字没法比;
- 分数是加权后的合成值,优化时看具体指标,别只盯总分;
- 首屏之外的问题它看不到,滚动、交互后的性能得靠 Performance 面板。

## Performance 面板

录制一段交互,主线程轨道上会排出一个个任务块。超过 50ms 的块右上角有红色三角标记,那就是长任务。

读图顺序:

1. 先看 Frames 轨,红色竖线代表掉帧,掉帧的位置就是问题发生的时间点;
2. 再看 Main 轨最长的那几个块,展开看里面是 Script、Layout 还是 Paint;
3. 用 Bottom-Up 按自身耗时排序,找到最贵的函数;
4. 用 Call Tree 看调用链,判断是框架内部还是业务代码。

常见的对应关系:一长串 Recalculate Style 说明改动波及面太大;Layout 反复出现说明读写交替;大量的 Function Call 但没有 Layout,说明瓶颈在纯计算。

录制时打开 CPU 4x/6x 降速,能把中低端手机上的问题放大出来。本地开发机上跑得飞快的代码,降速后往往立刻暴露。

## 自定义打点

框架里的耗时不一定能在火焰图上直接看出来,可以用 User Timing API 自己标:

```js
performance.mark('list:start');

const rows = await fetchRows();
renderRows(rows);

performance.mark('list:end');
performance.measure('list:render', 'list:start', 'list:end');

const [entry] = performance.getEntriesByName('list:render');
console.log(entry.duration); // 毫秒
```

`measure` 生成一条 `measure` 类型的条目,它会出现在 Performance 面板的 Timings 轨上,和火焰图对齐。也可以用 `PerformanceObserver` 订阅:

```js
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    report('custom', entry.name, entry.duration);
  }
}).observe({ type: 'measure', buffered: true });
```

打点的名字要能区分场景,比如 `list:render`、`editor:init`。名字重复时后一条会覆盖同名条目的统计,查问题时容易看错。

## RUM 采集

RUM(Real User Monitoring,真实用户监控)在用户浏览器里采样,把指标报回服务端。要采的除了三个核心指标,还有页面类型、设备、网络、地区这些维度,否则数据没法归因。

上报时机要卡在页面隐藏时,否则会漏掉最后一次 LCP 更新:

```js
let lcp = 0;
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  lcp = entries[entries.length - 1].startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  const body = JSON.stringify({ lcp, path: location.pathname });
  navigator.sendBeacon('/rum', body);
});
```

`sendBeacon` 在页面卸载时也能把请求发出去,不阻塞跳转。请求体有大小上限(约 64KB),别把整份性能条目都塞进去。

采样率按流量定。日 PV 百万级的站点采 10% 就足够看出趋势,小站点可以全量。采样要在客户端做,并且把采样标记一起上报,方便后续还原真实分布。

不想自己实现的话,`web-vitals` 这个库封装了三个指标的采集与边界情况,体积只有几 KB。

## 建立基线

数据只有和基线比才有意义。做法是:

- 给每个关键页面记一组数:LCP、INP、CLS 的第 75 百分位;
- 改动前后用同样的口径对比,而不是拿今天的 Lighthouse 分数比上周的;
- 把预算写进 CI,超了就失败:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

预算值的单位要看清:`maxNumericValue` 里 LCP 是毫秒,CLS 是分数。写错单位,预算要么形同虚设,要么每次构建都失败。

CI 里的 Lighthouse 跑在固定容器里,比本地稳定,但仍然是 lab 数据。它能挡住「明显变慢」的提交,判断线上效果还得看 RUM。

## 小结

- lab 数据可复现,用来定位与回归;field 数据才是真实体验,用来判断效果;
- Lighthouse 的 TBT 是 INP 的实验室代理,单次波动大,跑多次取中位数;
- Performance 面板先看掉帧位置,再看最长任务,最后用 Bottom-Up 找函数;
- `performance.mark` 与 `measure` 能把业务耗时标到火焰图上;
- RUM 在 `visibilitychange` 时用 `sendBeacon` 上报,按流量定采样率;
- 验收要比同一口径的基线,预算写进 CI 时注意单位。
