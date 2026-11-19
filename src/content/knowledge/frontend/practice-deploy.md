---
title: 部署：静态托管、CDN 与 CI
summary: '上线传的是 dist,不是源码。子路径部署要配 base,HTML 与带 hash 的资源要分开设缓存头,SPA 刷新 404 靠 history fallback 兜底,构建发布交给 CI,回滚靠旧产物。'
category: frontend
node: frontend-practice-deploy
order: 114
level: 进阶
tags: [部署, CDN, 缓存, CI, 回滚]
updated: 2026-11-19
mindmap: practice-deploy.mindmap.json
terms: []
sources:
  - title: Vite 中文文档 · 构建生产版本
    url: https://cn.vite.dev/guide/build.html
    note: base 配置、产物目录与多环境构建。
  - title: web.dev · 使用长期缓存
    url: https://web.dev/articles/uses-long-cache-ttl
    note: 带 hash 的资源设长缓存、HTML 保持短缓存的理由。
  - title: GitHub Docs · Configuring a publishing source for GitHub Pages
    url: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
    note: 项目站点部署在子路径时对 base 的要求。
---

前一篇的站点在本地跑通了,`npm run build` 也能出 `dist`。从这台机器到用户浏览器之间还差几步:文件放哪、路径怎么写、缓存怎么设、刷新 404 怎么办、谁来做这些事。每一步都有一类固定的翻车方式。

## 上传的是产物

部署时传的是构建结果,不是仓库:

```text
dist/
├─ index.html
├─ notes/index.html
├─ assets/index-a1b2c3d4.js
├─ assets/index-e5f6a7b8.css
└─ favicon.svg
```

`src/`、`node_modules/`、`vite.config.js` 都不需要,浏览器不认识它们。判断标准很简单:打开 `dist/index.html`,页面能正常工作,这一份就是全部。

反过来说,`dist` 不该提交到仓库。它每次构建都变,混在提交历史里,review 时全是几万行的 diff,冲突也无法手工解决。用 `.gitignore` 排除,让 CI 在需要时生成。

本地验证产物用 `npm run preview` 或 `npx serve dist`,别双击 `index.html`,原因和开发时一样:`file://` 下模块加载不了。第 20 章讲静态站点那篇讲过这个坑。

## base:子路径部署的白屏

部署到 `https://example.com/` 这种根路径,默认配置就对。部署到 `https://user.github.io/my-site/` 或公司域名的 `/app/` 下,必须告诉构建工具这段前缀:

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/',
  build: { sourcemap: false },
})
```

`base: '/my-site/'` 会让 HTML 里的资源引用变成 `/my-site/assets/index-a1b2c3d4.js`。不配的话是 `/assets/...`,浏览器去域名根目录找,拿到 404,页面一片白,Console 里几行红色 `Failed to load module script`。

这个错误在本地永远复现不了,因为本地服务就跑在根路径。判断方法:Network 里看 JS 请求的完整 URL,前缀少了一段就是它。

用环境变量把 `base` 交给部署环境决定,同一份代码既能发到根路径也能发到子目录,不用改代码再提交一次。

相对路径也能解决,但要确认路由形态。`base: './'` 生成的引用是 `./assets/x.js`,在 `/notes/` 这种多级路径下会解析成 `/notes/assets/x.js`,仍然 404。多页站点老老实实写绝对前缀。

## 缓存头:两类文件两种策略

同一个站点里,HTML 和静态资源的缓存策略必须相反。

| 路径 | `Cache-Control` | 理由 |
| --- | --- | --- |
| `/index.html` | `no-cache` | 每次向服务器确认,保证拿到新的资源引用 |
| `/assets/*-a1b2c3d4.js` | `public, max-age=31536000, immutable` | 文件名带内容 hash,内容变则名字变 |
| `/favicon.ico` | `public, max-age=86400` | 很少变,一天一次够用 |
| `/sw.js` | `no-cache` | 浏览器更新检查必须拿到新版本 |

`no-cache` 不是不缓存,是「用之前必须校验」。配合 `ETag`,没变时服务端回 304,只花一个往返,不传正文。

`immutable` 告诉浏览器这一年内连校验都不用做,省掉那个往返。它成立的前提是文件名真的随内容变,一旦服务器覆盖了同名文件,用户在一年内都看不到新版本。

nginx 上大概是这样:

```text
location = /index.html {
  add_header Cache-Control "no-cache";
}

location /assets/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location / {
  try_files $uri $uri/ /index.html;
}

location /api/ {
  proxy_pass http://backend;
}
```

顺序有讲究:`location /api/` 必须写在兜底规则之外,否则接口 404 会被替换成 `index.html`,前端 `res.json()` 拿到一段 HTML,报 `Unexpected token '<'`。这个报错在排查时很有辨识度。

## SPA 的 history fallback

单页应用只有一张 `index.html`,用户在 `/orders/42` 刷新时,服务器得把 `index.html` 发回去,让前端路由自己解析路径。

静态托管平台都提供对应开关:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Netlify 用 `_redirects` 文件,一行 `/*  /index.html  200`;GitHub Pages 没有这个能力,靠复制一份 `404.html` 当兜底;nginx 用上面那条 `try_files`。

兜底规则要排除两类路径:API 前缀,和真实存在的静态文件。`try_files` 里的 `$uri` 先尝试命中文件,天然处理了第二类;`rewrites` 写在平台配置里,通常要把 `/api` 单独排除。多页站点不需要兜底,每张页面本来就是真实文件,加了反而会把真正的 404 变成首页。

## CI:构建与发布

构建放到 CI 上,本地只负责提交。好处是依赖版本、Node 版本、构建命令都写死在配置里,谁发都一样。

```yaml
name: deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

四个细节:

- `npm ci` 而不是 `npm install`。前者严格按 lockfile 装,后者可能顺手升级小版本,构建结果就不可复现了;
- `cache: npm` 缓存依赖下载,一次构建能省几十秒;
- `concurrency` 让新提交取消上一个未完成的发布,避免旧构建后完成、把新版本盖回去;
- 发布权限单独列出,`pages: write` 与 `id-token: write` 缺一个就会在 deploy 步骤失败。

失败时先分辨是 build 挂了还是 deploy 挂了:前者是代码或依赖问题,后者多是权限、产物路径或平台配额。

## 回滚

回滚不是「把代码改回去再发一次」。重新构建会重新解析依赖,可能装到新的小版本,也可能因为外部接口变了而构建失败。要的是回到那个已知能用的产物,常见两种做法:

- 不可变产物:每次构建产出带版本号的目录,比如 `releases/2026-11-19-a1b2c3/`,用软链或平台配置指向当前版本。回滚就是改指向,秒级生效;
- 平台版本:Vercel、Netlify、Cloudflare Pages 都保留历史部署,控制台点一下 Promote 或 Rollback 即可。

配合 hash 文件名,回滚不会撞上缓存:旧的 `index.html` 引用的是一批旧 hash 文件,那些文件还在,浏览器直接拿得到。回滚之后要记得在前向分支上修,否则下一次正常发布会把问题带回来,同时把触发条件记进 issue,这类故障通常会重复出现。

## 上线前的检查单

| 检查项 | 怎么看 |
| --- | --- |
| 资源路径带对前缀 | Network 里 JS 请求返回 200 而不是 404 |
| HTML 不被长缓存 | 响应头 `Cache-Control` 为 `no-cache` |
| 静态资源长缓存 | 带 hash 的文件 `max-age` 一年 |
| 深链接刷新不 404 | 直接打开 `/orders/42` 再按 F5 |
| 接口没被兜底 | 请求 API 时返回 JSON,不是 HTML |

首屏体积没有统一标准:内容站 300KB 已偏大,后台系统 800KB 也能接受,取决于用户网络与场景,第 15 章给过按指标定目标的办法。

## 小结

- 部署传 `dist`,不传源码;`dist` 也不进仓库,由 CI 生成;
- 子路径部署必须配 `base`,现象是白屏加一堆 404,本地无法复现;
- HTML 用 `no-cache` 每次校验,带 hash 的资源用一年 `immutable`,两者策略相反;
- SPA 的深链接刷新靠 fallback 兜底,但要把 `/api` 排除在外;
- CI 用 `npm ci`、固定 Node 版本、加 `concurrency`,保证可复现;
- 回滚指向旧产物,不重新构建;历史版本与 hash 文件名要一起保留。
