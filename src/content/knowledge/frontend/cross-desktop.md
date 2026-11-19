---
title: Electron 与 Tauri：桌面端取舍
summary: 'Electron 自带 Chromium 与 Node,渲染稳定但安装包上百 MB;Tauri 用系统 WebView 加 Rust 后端,体积小到几 MB,代价是三平台各一套内核,行为差异要自己兜。'
category: frontend
node: frontend-cross-desktop
order: 108
level: 进阶
tags: [Electron, Tauri, 桌面端, IPC]
updated: 2026-11-19
mindmap: cross-desktop.mindmap.json
terms: []
sources:
  - title: Electron · Process Model
    url: https://www.electronjs.org/docs/latest/tutorial/process-model
    note: 主进程与渲染进程的分工,以及 preload 脚本的位置。
  - title: Electron · Context Isolation
    url: https://www.electronjs.org/docs/latest/tutorial/context-isolation
    note: contextIsolation 与 contextBridge 的安全模型。
  - title: Tauri · Documentation
    url: https://v2.tauri.app/
    note: 系统 WebView、Rust 命令与打包流程。
---

上一篇让页面在断网时也能打开,但它始终是浏览器里的一个标签页,关掉就没了,也碰不到本地文件。桌面端要的是图标、托盘、菜单和文件系统权限,做法是给网页套一个壳。

## 两个进程与一条边界

Electron 的进程模型只有两种角色。主进程(main)是一个 Node.js 环境,负责创建窗口、菜单、托盘、读写文件;每个窗口对应一个渲染进程(renderer),里面是完整的 Chromium,负责画界面。

```text
主进程 (Node.js)
  ├─ BrowserWindow ──▶ 渲染进程 A (Chromium + DOM)
  ├─ BrowserWindow ──▶ 渲染进程 B
  └─ ipcMain  ◀──IPC──▶  ipcRenderer
```

渲染进程里有 DOM,但没有 `require`、没有 `fs`。这是设计上的隔离:页面一旦能直接调 Node,一个 XSS 就等于把整台机器交出去。所有系统能力必须由主进程提供,渲染进程通过 IPC 请求。

两边的通信有两种形态:`ipcRenderer.invoke` 配 `ipcMain.handle` 是请求-响应,返回 Promise;`ipcRenderer.send` 配 `ipcMain.on` 是单向投递,发完不管结果。

## 安全默认值:三个开关加一个 preload

窗口的 `webPreferences` 决定渲染进程有多大权限:

```js
// main.js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // 默认,页面与 preload 各用一套 JS 上下文
      nodeIntegration: false,   // 默认,渲染进程拿不到 require
      sandbox: true,            // 默认,渲染进程跑在沙箱里
    },
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

三个值都是默认值,但在老项目里经常被改成 `nodeIntegration: true`,因为「这样页面里能直接 `require('fs')`,省事」。改回去的代价是所有依赖 Node 的渲染代码要重写;不改的代价是任何一个第三方脚本都能读 `C:\Users\...\.ssh`。

preload 是唯一同时能碰到页面 `window` 和 Node API 的地方,它跑在页面加载之前,用 `contextBridge` 挑几个方法挂到 `window` 上:

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('config:read'),
  saveConfig: (data) => ipcRenderer.invoke('config:save', data),
  onProgress: (cb) => {
    const handler = (_event, percent) => cb(percent);
    ipcRenderer.on('task:progress', handler);
    return () => ipcRenderer.removeListener('task:progress', handler);
  },
});
```

这里最容易写错的一句是 `exposeInMainWorld('ipc', ipcRenderer)`。把整个 `ipcRenderer` 交出去,页面就能 `invoke` 任意 channel,白名单等于没有。只暴露具体方法,参数在主进程侧再校验一遍。

另一个坑是 `contextBridge` 只能传可结构化克隆的值。自定义类的实例过桥之后原型丢失,变成普通对象,`instanceof` 判断全部失效;`Map`、`Set`、`Date` 能过,但 DOM 节点、Promise 包装之外的回调都得自己转一层。传过去一个 `Buffer`,到页面侧可能变成 `Uint8Array`。

## IPC:invoke 与 handle

主进程注册处理器,渲染进程拿返回值:

```js
// main.js
const { app, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

ipcMain.handle('config:read', async () => {
  const file = path.join(app.getPath('userData'), 'config.json');
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return { theme: 'light', recent: [] };   // 首次启动没有文件
  }
});

ipcMain.handle('config:save', async (_event, data) => {
  if (typeof data !== 'object' || data === null) throw new Error('invalid payload');
  const file = path.join(app.getPath('userData'), 'config.json');
  await fs.writeFile(file, JSON.stringify(data), 'utf8');
  return true;
});
```

`userData` 是各平台约定的应用数据目录,不要往安装目录里写,那里在 macOS 和 Windows 上通常不可写。

两个坑。第一,`handle` 里抛出的错误到渲染进程只剩一层包装:`Error: Error invoking remote method 'config:save': Error: invalid payload`,原始 stack 不跨进程,排查时要在主进程打日志。第二,同一个 channel 只能 `handle` 一次,重复注册直接抛异常,热重载时窗口重开、模块重新执行,很容易撞上。

慢操作不要用 `ipcRenderer.sendSync`,它会阻塞整个渲染进程,动画和输入一起卡住。

## 体积、内存与启动

| | Electron | Tauri |
| --- | --- | --- |
| 渲染层 | 自带 Chromium | 系统 WebView |
| 后端语言 | Node.js | Rust |
| 空项目安装包 | 60MB 上下,带依赖常到 100MB+ | 3-10MB 量级 |
| 内存 | 每个窗口一组 Chromium 进程,几百 MB | 取决于系统 WebView |
| 渲染一致性 | 高,Chromium 版本随应用固定 | 低,跟着系统升级 |
| 需要 Rust | 否 | 是,写后端命令要会 |

Electron 的体积不是配置问题,是 Chromium 本身就在包里。换来的是渲染结果稳定:用户系统是 Win10 还是 Win11、装没装什么浏览器,都不影响页面长什么样。对内部工具、需要固定渲染行为的编辑器类应用,这笔账划算。

内存也类似。一个窗口不只是多一个页面,而是多一组进程:主进程、GPU 进程、网络服务、每个窗口的渲染进程。开三个窗口,任务管理器里能看到七八个条目。

## Tauri 用系统 WebView

Tauri 不打包浏览器,直接调系统自带的:Windows 上是 WebView2(基于 Chromium 的 Edge),macOS 上是 WKWebView(Safari 内核),Linux 上是 WebKitGTK。后端是 Rust,前端照旧写 HTML/CSS/JS。

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn read_config() -> Result<String, String> {
    std::fs::read_to_string("config.json").map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

前端调用:

```js
import { invoke } from '@tauri-apps/api/core';

const raw = await invoke('read_config');   // 对应 Rust 的 Result::Ok
```

`Result::Err` 在 JS 侧表现为 rejected Promise,`catch` 拿到的是字符串,不是 Error 实例。

代价在兼容性上。同一个页面要过三个引擎:Safari 的 WKWebView 对某些 CSS 支持滞后,Linux 上 WebKitGTK 的版本取决于发行版,老版本可能没有 `:has()`、容器查询,`backdrop-filter` 的表现也不同。开发机是 macOS、用户是 Ubuntu 20.04 时,「我这儿是好的」会反复出现。测试矩阵实际是「三个浏览器引擎」,不是「一个桌面应用」。

Windows 上还有一层:WebView2 运行时需要预装。Win11 和大部分打过补丁的 Win10 自带,干净的老系统上要额外引导安装,安装包因此会变大一些。

## 自动更新

两家的更新机制都得自己配一条分发链路。

Electron 用 `electron-updater`,把安装包和 `latest.yml` 一起传到静态服务器或 GitHub Releases。检查更新、下载、重启安装三步都是现成的,难点是签名:macOS 上未签名或签名不匹配的应用装不上更新,Windows 上没做代码签名会被 SmartScreen 拦一道。

Tauri 用 `tauri-plugin-updater`,更新包用一对密钥签名,公钥写进 `tauri.conf.json`,私钥只放在 CI 里。少了签名校验,任何人都能推一个包让客户端装上。

两边都要处理「更新装完,用户数据还在不在」。数据写在 `app.getPath('userData')` 或 Tauri 的 app data 目录里,升级时不会被覆盖;写在安装目录里的配置会在下次更新后消失,这是升级后「设置全没了」的常见原因,而不是更新逻辑的 bug。

## 怎么选

- 团队只有前端,要复用 Node 生态(本地打包、串口、SQLite 驱动),并且必须保证渲染结果一致:Electron。
- 追求安装包体积、内存占用,愿意为后端写 Rust,能接受三套 WebView 的差异:Tauri。
- 只是想让网页有个图标、能从桌面直接打开:先考虑 PWA,装个壳反而多一份维护成本。
- 需要深度系统集成(开机自启、托盘、全局快捷键、文件关联):两家都能做,但 Electron 的示例与生态更厚,Rust 侧要自己写。

## 小结

- Electron 是主进程(Node)加渲染进程(Chromium)的两层模型,系统能力只能由主进程提供;
- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true` 是默认值,改掉它们等于把本机权限交给页面;
- preload 里用 `contextBridge` 暴露白名单方法,不要整个 `ipcRenderer` 挂上去;
- `invoke` 配 `handle` 是 Promise 式的请求-响应,错误跨进程只剩一层文字,堆栈要回主进程看;
- Electron 的体积与内存来自 Chromium,换来的是渲染一致;Tauri 用系统 WebView,省下体积但多出三套内核的兼容成本;
- 自动更新的关键是代码签名与数据目录的选择,升级丢配置通常是写在了安装目录里。
