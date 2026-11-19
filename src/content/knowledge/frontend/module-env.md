---
title: 环境变量与多环境构建
summary: '同一份源码要跑在本地、预发与生产,差异只能靠配置注入。Vite 在构建时把 import.meta.env 静态替换成字面量,只有 VITE_ 前缀会进客户端;理清 .env 文件的优先级与 --mode、NODE_ENV 的区别,才能安全地切换接口地址而不泄露密钥。'
category: frontend
node: frontend-module-env
order: 58
level: 进阶
tags: [环境变量, Vite, 多环境, 构建]
updated: 2026-11-19
mindmap: module-env.mindmap.json
terms: []
sources:
  - title: Vite 中文文档 · 环境变量和模式
    url: https://cn.vite.dev/guide/env-and-mode.html
    note: import.meta.env 的内置常量、.env 文件优先级与 --mode 的行为。
  - title: Vite 中文文档 · 共享配置
    url: https://cn.vite.dev/config/shared-options
    note: base、envPrefix 与 define 三个选项的语义。
---

上一篇的钩子保证进入仓库的代码符合规范,但同一份代码还要跑在不同后端上:本地连 mock,预发连测试库,生产连正式接口。地址与开关不能写死在源码里,否则每次发布都要改代码。环境变量就是这层注入。

## 构建时替换,不是运行时读取

Vite 项目通过 import.meta.env 访问环境变量:

```js
const base = import.meta.env.VITE_API_BASE;
fetch(`${base}/orders`);
```

打包后这一行会变成 `const base = "https://api.example.com";`,产物里连变量名都不剩。替换发生在构建阶段,带来两个直接后果:

- 改了 .env 文件必须重启开发服务器或重新构建,刷新页面不会生效;
- 浏览器里没有 process.env,前端源码写 `process.env.VITE_API_BASE` 只会得到 undefined。

后者是 CommonJS 时代的习惯。Node 脚本与 vite.config.ts 仍然用 process.env,浏览器侧的代码不行。

## 四个内置字段

不配置任何 .env,import.meta.env 也有固定字段:

| 字段 | 类型 | 含义 | dev 下 | build 下 |
| --- | --- | --- | --- | --- |
| MODE | string | 当前模式 | development | production |
| BASE_URL | string | 部署基路径,由 base 决定 | / | / 或配置值 |
| DEV | boolean | 是否为开发环境 | true | false |
| PROD | boolean | 是否为生产环境 | false | true |

DEV 与 PROD 永远相反,判断依据是 NODE_ENV,不是 MODE。执行 `vite build --mode staging` 时,MODE 是 staging,PROD 仍然是 true。另外还有一个 SSR 字段,表示代码是否运行在服务端。

BASE_URL 默认是 `/`。部署在子路径(例如 https://example.com/shop/)时,配置里写 `base: '/shop/'`,静态资源与路由的基路径都从这里取。

## 只有 VITE_ 前缀会进客户端

.env 里的变量默认只在 Node 侧可见,vite.config.ts 能读到;要让浏览器通过 import.meta.env 使用,名字必须带 VITE_ 前缀:

```text
# .env
VITE_API_BASE=https://api.example.com
DB_PASSWORD=change-me
```

前一行在代码里读到的是 `"https://api.example.com"`,后一行读到 undefined:没有前缀的变量不会出现在客户端的 import.meta.env 上。

前缀不是命名习惯,是安全边界。带前缀的值会被写进 JS,任何人打开 DevTools 都能看到;DB_PASSWORD 这类变量留在 Node 侧,前端拿不到,也不该拿到。

envPrefix 配置可以改前缀,但改了之后插件、文档与团队约定都要跟着改,收益很小。保持 VITE_ 默认值。

## 不要把密钥写进前端

前端没有秘密。值一旦进了 bundle,无论拆成几个 chunk、混淆成什么名字,都能从网络面板或 dist 目录里找回来。把 `VITE_STRIPE_SECRET` 这种名字写进源码,等于把密钥公开发布。

正确做法是把调用放到服务端:前端请求自己的接口,由服务端携带密钥访问第三方;或者使用第三方的短期令牌、签名 URL,让浏览器拿到的凭证只在限定范围与时间内有效。

VITE_ 前缀适合放公开配置:接口地址、CDN 域名、功能开关、埋点 appId。判断标准很简单,这个值出现在网页源码里是否可接受。

## .env 文件的加载顺序

Vite 从项目根目录(envDir)按固定顺序加载四类文件:

| 文件 | 加载条件 | 用途 |
| --- | --- | --- |
| .env | 所有模式 | 团队默认值 |
| .env.local | 所有模式 | 个人覆盖,不进 Git |
| .env.[mode] | 指定模式 | 例如 .env.staging |
| .env.[mode].local | 指定模式 | 个人覆盖,不进 Git |

后加载的覆盖先加载的,优先级从高到低是:已存在的进程环境变量 > .env.[mode].local > .env.[mode] > .env.local > .env。CI 里用 `VITE_API_BASE=... npm run build` 可以临时覆盖文件里的值。

`*.local` 要写进 .gitignore,否则个人配置被提交,会盖掉其他同事的默认值。变量值都是字符串,`VITE_ENABLE_X=false` 读出来是 `"false"`,直接放进 if 判断会得到 true;数字也要 `Number()` 转换。

## --mode 与 NODE_ENV

mode 是 Vite 自己的概念,NODE_ENV 是 Node 的,两者独立:

| 命令 | NODE_ENV | MODE | 加载的文件 |
| --- | --- | --- | --- |
| `vite` | development | development | .env、.env.local、.env.development |
| `vite build` | production | production | .env、.env.local、.env.production |
| `vite build --mode staging` | production | staging | .env、.env.local、.env.staging |

预发环境加一个脚本,再补一份 .env.staging:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:staging": "vite build --mode staging",
    "preview": "vite preview"
  }
}
```

.env.staging 里写 `VITE_API_BASE=https://api-staging.example.com`,构建时自动加载,不需要额外参数。

`--mode staging` 只改变 MODE 与加载的文件,不会把 NODE_ENV 改成 staging,产物仍是生产构建,压缩与 tree-shaking 照常执行。想让某次构建走开发语义,要同时设置 `NODE_ENV=development`,一般只在测试包里这么做。

## 配置与类型声明

vite.config.ts 在 Node 里执行,不能直接用 import.meta.env。用 loadEnv 按 mode 读取:

```ts
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || '/',
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});
```

loadEnv 的第三个参数是前缀过滤,传空字符串表示读取全部变量,包括没有 VITE_ 前缀的。这些值只用于配置,不会自动出现在客户端;确实要注入时用 define 显式声明,但要清楚它会进产物。

TypeScript 不认识自定义变量,import.meta.env.VITE_API_BASE 会被推断成 any 或直接报错。在 src/vite-env.d.ts 里补充声明:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_SENTRY_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

文件里不要出现 import 语句,否则它变成模块,全局声明失效。

## 小结

- import.meta.env 在构建时被静态替换,改环境变量要重启或重建,浏览器里没有 process.env;
- MODE、BASE_URL、DEV、PROD 是内置字段,DEV 与 PROD 取决于 NODE_ENV;
- 只有 VITE_ 前缀的变量会进客户端,前缀是安全边界,不是命名习惯;
- 前端没有密钥,敏感调用放服务端,或换成短期令牌与签名 URL;
- .env.[mode].local 优先级最高,进程环境变量更高,`*.local` 不入库;
- --mode 只改 MODE 与加载的文件,不改 NODE_ENV。
