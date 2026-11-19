---
title: 指标体系：Core Web Vitals（LCP / INP / CLS）
summary: 'LCP 量最大内容画出来的时间,INP 量交互到下一帧的延迟,CLS 量意外位移的累计分数。三者都取第 75 百分位,良好线是 2.5s、200ms、0.1,先把这三个数埋进页面,再谈优化哪一段。'
category: frontend
node: frontend-performance-metrics
order: 84
level: 入门
tags: [性能, Core Web Vitals, LCP, INP, CLS]
updated: 2026-11-19
mindmap: performance-metrics.mindmap.json
terms: []
sources:
  - title: web.dev · Core Web Vitals
    url: https://web.dev/articles/vitals
    note: 三个核心指标的阈值、分位数口径与采集方式。
  - title: web.dev · Optimize LCP
    url: https://web.dev/articles/optimize-lcp
    note: LCP 四个子阶段的拆分,以及每段对应的优化手段。
  - title: web.dev · Optimize CLS
    url: https://web.dev/articles/optimize-cls
    note: 位移分数的计算方式,transform 不计入位移的说明。
---

上一篇《图标、字体与静态资源》讲的是把图标换成 SVG、把字体按字符集切开,让静态资源少占字节。资源瘦下来之后要回答一个更靠前的问题:什么算「快」,这个判断由谁来下。这一篇先把指标立起来,后面六篇都在往这三个数上使劲。

## 三个数定成败

Core Web Vitals(核心网页指标,简称 CWV)是 Google 提出的一组体验指标,现在有三项,分别对应加载、交互、视觉稳定:

- LCP(Largest Contentful Paint,最大内容绘制):视口内最大的一块内容画出来的时间点;
- INP(Interaction to Next Paint,交互到下一次绘制):用户操作到界面给出下一帧反馈的延迟;
- CLS(Cumulative Layout Shift,累积布局偏移):整次访问里意外位移的累计分数。

阈值按第 75 百分位的访问算,不看平均值:

| 指标 | 量什么 | 良好 | 需要改进 | 差 |
| --- | --- | --- | --- | --- |
| LCP | 最大内容的绘制时间 | ≤ 2.5s | 2.5s - 4s | > 4s |
| INP | 交互到下一帧的延迟 | ≤ 200ms | 200ms - 500ms | > 500ms |
| CLS | 意外位移的累计分数 | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |

三项同时进入「良好」才算通过。任一项落进「差」,整站的评价就被这一项拖住,另外两项做得再好也补不回来。

## LCP 的四个子阶段

LCP 不是单个数字,而是一条时间线。从点下链接到最大元素上屏,可以切成四段:

```text
导航开始
  │
  ├─ ① TTFB              服务器返回第一个字节
  │
  ├─ ② 资源加载延迟      发现图片到真正发起请求之间的空档
  │
  ├─ ③ 资源加载时长      请求发出到下载完成
  │
  └─ ④ 元素渲染延迟      资源到手到画上屏幕,这一段结束时就是 LCP
```

四段各自对应不同的改法:

- ① 慢:查服务端耗时、查 CDN 命中率、查重定向。这一段的优化不在前端;
- ② 长:图片藏在 JS 里、藏在 CSS 背景里,或者要先等一个接口返回才知道地址;
- ③ 长:文件太大、没压缩、没走 CDN,参考下一篇的资源提示与第 15 章讲图片与字体那篇的图片格式;
- ④ 长:主线程被脚本占住,资源下载完了排不上队渲染,或者字体阻塞了文字。

LCP 的元素不是固定的。页面往上长,更大的图或更大的文本块出现,LCP 会跟着更新,直到用户产生交互或页面被隐藏。所以一个懒加载的巨图,在滚动之后仍可能改写 LCP。

## INP 取代了 FID

FID(First Input Delay,首次输入延迟)只量第一次交互的输入延迟,2024 年 3 月起被 INP 取代。INP 看整次访问的全部交互,取最慢的那次,并忽略少量离群值。

一次交互的延迟由三段相加:输入延迟(主线程在忙别的,事件在队列里等)、处理时间(事件回调本身执行多久)、呈现延迟(改完样式到下一帧画出来)。三段里任何一段长,INP 就长。

长任务(long task)是执行超过 50ms 的主线程任务。它恰好压在用户点击的那一刻,输入延迟就直接被拉长。所以 INP 超标的页面,基本都能在主线程上找到一段没让路的长任务,而不是「交互逻辑写得慢」。拆分手法在第 15 章讲运行时性能那篇。

## CLS 怎么算分

每次意外位移算一个分数:

```text
layout shift score = impact fraction × distance fraction
```

impact fraction 是受影响区域占视口的比例,distance fraction 是元素移动的最大距离占视口尺寸的比例。两个分数相乘,一张大图把整页往下推半屏,分数就接近 0.5,一次就超标。

两条规则决定什么时候不计分:

- 用户输入后 500ms 内发生的位移带上 `hadRecentInput`,不计入统计;
- 用 `transform` 做的移动不算布局位移,因为它不改几何。

第二条最实用。淡入、滑入用 `transform` 与 `opacity` 实现,既省性能也不会被 CLS 抓住;用 `top`、`margin` 或临时插入元素把内容顶下去,分数就实打实记上。第 9 章讲合成层时说过 `transform` 不触发布局,同一个事实在这里变成了指标上的好处。

## 用 PerformanceObserver 采集

三个指标都能从 PerformanceObserver 读到,不用引第三方库也能拿到原始数据。LCP 取最后一次上报:

```js
let lcp = 0;
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  lcp = entries[entries.length - 1].startTime;
}).observe({ type: 'largest-contentful-paint', buffered: true });

// 页面隐藏时才是最终值,此时再上报
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') report({ lcp });
});
```

CLS 要把每次位移的 `value` 累加,跳过带 `hadRecentInput` 的条目:

```js
let cls = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;
    cls += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });
```

INP 需要看 `event` 类型的条目,`duration` 就是三段之和:

```js
let worst = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    worst = Math.max(worst, entry.duration);
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 40 });
```

`buffered: true` 表示把观察者创建之前已经发生过的条目也补发一遍,否则首屏那几秒的数据会全丢。`durationThreshold` 默认 104ms、最小 16ms,调小才能看到更多交互样本。

## 看第 75 百分位

CrUX(Chrome 用户体验报告)统计真实用户数据,用 28 天滚动窗口,取第 75 百分位。这个口径的意思是:75% 的访问比这个数快,剩下 25% 更慢。

平均值会把长尾抹平。一万次访问里九千次 1s、一千次 8s,平均下来才 1.7s,看起来还行,但那 10% 的用户体验很差。分位数就是逼你面对长尾。

自查时也要按这个口径看。本地 Lighthouse 跑出 1.2s 只能说明这台机器这一次是这个数,真实用户的 75 百分位,得靠 RUM(Real User Monitoring,真实用户监控)在线上采,采样与上报在第 15 章讲测量那篇。

## 小结

- Core Web Vitals 有 LCP、INP、CLS 三项,分别对应加载、交互、稳定;
- 良好线是 LCP 2.5s、INP 200ms、CLS 0.1,按第 75 百分位算;
- LCP 拆成 TTFB、资源加载延迟、加载时长、元素渲染延迟四段,哪段长改哪段;
- INP 是输入延迟、处理时间、呈现延迟之和,超标通常意味着主线程有长任务;
- CLS 分数是影响比例乘位移距离比例,用户输入后 500ms 内与 `transform` 位移不计;
- 三个指标都能用 PerformanceObserver 加 `buffered: true` 采到,页面隐藏时再上报最终值。
