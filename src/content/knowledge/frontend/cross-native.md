---
title: 跨端方案：React Native 与 Flutter Web
summary: 'React Native 把组件映射成原生控件，新架构用 JSI 与 Fabric 替掉异步桥；Flutter 自绘整个界面，三端一致，但编译到 Web 后文字画在 canvas 里，查找与爬虫都读不到。'
category: frontend
node: frontend-cross-native
order: 110
level: 进阶
tags: [React Native, Flutter, 跨端, 渲染]
updated: 2026-11-19
mindmap: cross-native.mindmap.json
terms: []
sources:
  - title: React Native · Architecture
    url: https://reactnative.dev/architecture/landing-page
    note: 新架构中 JSI、Fabric 与 TurboModules 的分工。
  - title: Flutter · Architectural overview
    url: https://docs.flutter.dev/resources/architectural-overview
    note: 框架层、引擎层与 Skia/Impeller 绘制的关系。
  - title: Flutter · Web renderers
    url: https://docs.flutter.dev/platform-integration/web/renderers
    note: CanvasKit 与 skwasm 两条 Web 渲染路径的差异。
---

上一篇的小程序把页面关在自己的双线程里，能力靠平台给。还有一条路是直接用 JS 或 Dart 写真正的移动端应用：一套代码出 iOS、Android，顺便还能出一个 Web 版。这条路省下的是 UI 层的工作量，省不下平台本身。

## React Native 映射原生控件

RN 不画界面，它把组件翻译成原生控件：`<View>` 变成 iOS 的 `UIView`、Android 的 `android.view.View`,`<Text>` 变成 `UILabel` 或 `TextView`。你在 JS 里写声明式组件，原生侧负责真正的布局与绘制。

```jsx
import { View, Text, FlatList, StyleSheet } from 'react-native';

export default function OrderList({ orders }) {
  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.amount}>{item.amount.toFixed(2)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { flex: 1, fontSize: 15 },
  amount: { marginLeft: 12, fontVariant: ['tabular-nums'] },
});
```

这段代码里有三处和 Web 不一样，写惯了 CSS 的人一定会踩：

- 默认主轴是纵向。`flexDirection` 的默认值是 `column`，而 CSS 是 `row`，横向排列必须显式写。
- 没有单位。`fontSize: 15` 是逻辑像素，写成 `'15px'` 直接不生效，也没有 `rem`、`em`、`vw`。
- 没有 CSS 级联与选择器。样式是普通对象，`StyleSheet.create` 只是注册与复用，不存在 `.row .title` 这种组合选择，也不支持 `display: grid` 与伪元素。

更麻烦的是，同一个 `View` 在两端映射到不同控件，原生的默认行为会漏出来：阴影在 iOS 用 `shadowOffset` 加 `shadowRadius`,Android 只认 `elevation`;`overflow: 'hidden'` 在 Android 上对绝对定位的子元素常常失效。

## 桥、JSI 与新架构

老架构里，JS 线程和原生线程各跑各的，通信走一个异步桥：JS 侧把调用序列化成 JSON，批量投递给原生，原生执行完再把结果投回来。三个代价直接可见：

- 全是异步，拿不到同步返回值；
- 每次都要序列化，大数据量的列表滚动时开销明显；
- 桥是单通道，所有模块排队，一个慢调用会压住后面所有调用。

新架构换掉了这条通道。JSI(JavaScript Interface)让 JS 直接持有 C++ 宿主对象的引用并同步调用，TurboModules 是基于它的原生模块系统，可以按需懒加载；Fabric 是新的渲染器，把布局与挂载放在 C++ 侧，允许并发与同步测量。

```ts
// NativeCalendar.ts:TurboModule 的类型声明,codegen 据此生成两端胶水代码
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  createEvent(title: string, startAt: number): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeCalendar');
```

写业务代码感知不大，`TurboModuleRegistry` 与旧的 `NativeModules` 用法接近。变化在性能和启动：模块不再全量初始化，同步调用成为可能，列表滚动时的掉帧少了很多。前提是第三方库已经适配新架构，没适配的库会退回兼容层，性能回到老样子。

## Flutter 自己画

Flutter 不做控件映射。它把整个界面画在一张画布上，布局由框架自己算，绘制交给 Skia 或 Impeller，最后交给 GPU。iOS 和 Android 上看到的是同一套像素。

```dart
class OrderTile extends StatelessWidget {
  const OrderTile({super.key, required this.title, required this.amount});

  final String title;
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis)),
          Text(amount.toStringAsFixed(2)),
        ],
      ),
    );
  }
}
```

样式写成 Dart 对象，没有级联、没有选择器、没有继承链。`Container` 的 `decoration` 和 `padding` 分开写，是因为前者绘制、后者布局。看起来很啰嗦，好处是确定：同一份代码在任何平台上布局结果一致，不会因为某个系统控件改版而错位。

代价也在这一层。原生控件自带的无障碍语义、文本选择、输入法联想、滚动惯性，Flutter 都要自己实现一遍。它提供了 `Semantics` 组件来补语义树，但默认并不完整，屏幕阅读器的体验多数时候比原生差一截。

## Flutter Web 的两个渲染路径

同一份 Dart 代码可以编译到 Web，但浏览器里没有 Skia，只能把绘制指令交给 WebGL。这就引出了渲染路径的选择。

```bash
flutter build web --wasm     # 产出 skwasm 版本,需要跨源隔离头
flutter build web            # 默认 CanvasKit
```

- CanvasKit:把 Skia 编译成 WebAssembly，下载体积在 MB 量级，用 WebGL 绘制。首屏要等 wasm 加载完，弱网下白屏时间明显。
- skwasm:CanvasKit 的多线程版本，依赖 `SharedArrayBuffer`，因此服务器必须发 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`。少了这两个头，页面直接起不来。
- 早期的 HTML 渲染器用 DOM 与 CSS 拼界面，体积小、可被搜索引擎读到，但和移动端效果对不上，已在后续版本中移除。

后果不只是首屏。页面上的文字是画进 canvas 的位图，浏览器的 Ctrl+F 查找、翻译插件、爬虫抓正文全部失效；文本选中与复制要靠 Flutter 自己实现，跨元素选择基本不可用。做官网、博客、商品详情页这类需要 SEO 的站点，Flutter Web 不是合适的选择。

## 三者的位置

| | React Native | Flutter | Hybrid / 小程序 |
| --- | --- | --- | --- |
| 渲染方式 | 映射原生控件 | 自绘 canvas | WebView 里的 DOM |
| 样式系统 | Flexbox 子集 | Widget 树 + Dart 对象 | CSS |
| 语言 | TypeScript / JavaScript | Dart | JavaScript |
| 三端一致 | 中，控件差异会漏出 | 高，像素级一致 | 低，依赖浏览器 |
| 首屏与体积 | 中 | 大，引擎与 wasm 数 MB | 小 |
| 无障碍 | 跟随原生，较好 | 需自建语义树 | 取决于网页 |
| SEO | 不适用 | Web 端基本不可用 | 好 |

选型其实是在三个约束里挑两个：渲染一致、包体积、开发成本。Flutter 拿一致与成本，付出体积；RN 拿成本与原生观感，付出一致性；Hybrid 拿体积与成本，付出体验。

## 什么时候不值得跨端

- 只有 Web 需求，没有应用商店的分发诉求。跨端框架帮不上忙，反而多一层构建。
- 页面以内容、表单、列表为主，交互轻。Hybrid 或 PWA 更便宜，还能复用现有前端。
- 依赖大量平台能力：蓝牙配网、后台定位、推送通道、桌面小组件、车机投屏。跨端只统一了 UI 层，原生模块照样每个平台写一遍。
- 对长列表、复杂手势、首帧时间有硬指标。框架层能优化，但天花板仍在原生。
- 团队没有 Dart 或原生经验。省下的 UI 工作量，会被学习与排查原生问题的时间吃掉。

## 小结

- RN 把组件映射成原生控件，样式是 Flexbox 子集，默认主轴为纵向，没有单位与级联；
- 老架构的异步桥带来序列化与排队开销，新架构用 JSI 直连 C++,Fabric 负责渲染，TurboModules 负责原生模块；
- Flutter 自绘整个界面，三端像素一致，代价是无障碍、文本选择等系统能力要自己补；
- Flutter Web 只有 CanvasKit 与 skwasm 两条路径，后者需要 COOP/COEP 响应头；
- canvas 渲染让页面文字不可查找、不可翻译、不被爬虫索引，内容型站点不要选它；
- 跨端统一的是 UI 层，平台能力与性能天花板仍然在原处。
