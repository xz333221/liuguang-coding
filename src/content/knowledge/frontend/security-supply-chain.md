---
title: 依赖安全与供应链
summary: '前端项目的依赖树动辄几百个包，任何一个的 postinstall 都能在你机器上执行任意命令。lockfile 必须提交并用 npm ci 复现，npm audit 查已知漏洞、npm audit signatures 验签名，overrides 强制提升传递依赖，SRI 保护 CDN 脚本的完整性。'
category: frontend
node: frontend-security-supply-chain
order: 100
level: 进阶
tags: [安全, 供应链, npm, 依赖管理]
updated: 2026-11-19
mindmap: security-supply-chain.mindmap.json
terms: []
sources:
  - title: npm Docs · npm audit
    url: https://docs.npmjs.com/cli/v10/commands/npm-audit
    note: 漏洞扫描与 signatures 子命令的行为。
  - title: npm Docs · package-lock.json
    url: https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json
    note: lockfile 结构与 npm ci 的严格安装语义。
  - title: MDN · Subresource Integrity
    url: https://developer.mozilla.org/zh-CN/docs/Web/Security/Subresource_Integrity
    note: integrity 属性与 SRI 的适用范围。
---

前两篇的信任边界在「用户输入」和「浏览器行为」。这一篇的边界在你自己这边：写这几行代码的不是你，是几百个陌生人，而且它们在你的构建机和 CI 上都有执行权限。

供应链攻击的特点是不需要找漏洞，直接让你把恶意代码装进来。

## 依赖树比你想的深

一个中等规模的前端项目，`package.json` 里写 30 个直接依赖，`node_modules` 里通常有 800 到 1500 个包。多出来的都是传递依赖，你没选过，也没看过。

```bash
npm ls --all | wc -l          # 依赖树行数
npm ls postcss                # 某个包被谁引进来
npm explain postcss           # 同上,信息更全
```

问题在于每多一层就多一个信任点：

- 某个包被作者转手，新维护者加一段读环境变量的代码；
- 某个包被抢注(作者删号后别人用同名注册);
- 某个包的依赖范围写得太松，`^1.0.0` 自动升到一个被投毒的版本；
- 某个包的 `postinstall` 脚本在安装时执行任意命令。

最后一类最直接，因为它不需要你的代码调用它，`npm install` 就跑。

## audit 能查什么

```bash
npm audit                    # 全部依赖
npm audit --omit=dev         # 只看生产依赖
npm audit --audit-level=high # 只在 high 及以上时退出码非 0
npm audit fix                # 在 semver 范围内升级
npm audit fix --force        # 允许跨大版本,可能直接改坏
npm audit signatures         # 校验 registry 签名与来源证明
```

它比对的是 npm 的漏洞库(GitHub Advisory Database)，输出按 `low` / `moderate` / `high` / `critical` 分级。

局限要说清楚：

- 只覆盖「已登记编号」的漏洞，没人报的零日查不到；
- 一条 `high` 可能落在你根本没用到的代码路径上，报告数量不等于风险；
- `npm audit fix` 会改 `package.json` 的版本范围，`--force` 更会跨大版本，合并前必须跑一遍测试；
- 传递依赖的漏洞常常无法通过升级直接依赖解决，要靠 `overrides`。

CI 里把它当门禁时，别用默认阈值，否则一个 `low` 就能让流水线红掉，很快所有人都学会加 `|| true`。

## 验签名

`npm audit` 看的是漏洞库，`npm audit signatures` 验的是「这个包确实来自 npm registry 且发布后没被改过」。npm 从 2021 年起对包做 ECDSA 签名，9.x 起的 CLI 会校验 registry 签名与包的 `provenance`(构建来源证明)。前者保证下载到的 tarball 与 registry 上的一致，后者在使用 CI 的 OIDC 发布时能证明这个版本是从哪个仓库的哪次提交构建的。

它挡不住「作者自己发了恶意版本」，但能挡住镜像站篡改、中间人替换、以及本地缓存被改这几种情况。国内用私有镜像时，这一项尤其有意义。

## lockfile 必须提交

`package-lock.json`(或 `pnpm-lock.yaml`、`yarn.lock`)固定了每一个包的精确版本、下载地址和完整性哈希(`integrity` 字段，内容是 `sha512-...`)。提交它，构建才是可复现的。

| 命令 | 行为 | 用在 |
| --- | --- | --- |
| `npm install` | 按 lockfile 装，但允许更新 lockfile | 本地开发 |
| `npm ci` | 严格按 lockfile 装，不一致直接失败 | CI / 部署 |
| `npm install --no-save` | 不写回 lockfile | 临时试验 |

CI 里用 `npm ci`。它会先删掉 `node_modules` 再按 lockfile 整体安装，速度快，而且 `package.json` 与 lockfile 存在冲突时立即报错 `npm ci can only install packages when your package.json and package-lock.json are in sync`，不会像 `npm install` 那样悄悄把版本升上去。

lockfile 的冲突要走「删掉重装再提交」的流程，不要手工编辑，更不要在合并时随便选一边。选错一边的后果是某几个传递依赖被降级或升级，线上行为跟着变。

不要把它加进 `.gitignore`。只在仓库里放 `package.json` 的后果是：今天装的和明天装的不是同一套代码。

## postinstall 是主要入口

`npm install` 会执行依赖里声明的 `preinstall`、`install`、`postinstall` 脚本。这个机制本来是给需要编译原生模块的包用的(比如 `node-sass`、`sharp` 下载预编译二进制)，但它是供应链攻击最省事的方式：一句 `curl` 就能把 `~/.ssh` 里的东西传走。

2018 年的 `event-stream` 事件就是这条路径：`postinstall` 引入了一个比特币钱包相关的包，目标是窃取私钥。

关掉它：

```ini
# .npmrc
ignore-scripts=true
```

代价是 `esbuild`、`puppeteer`、`sharp`、`husky` 这类依赖脚本的包会装不上或功能缺失。实际操作上分环境：

- CI 与生产构建：开 `ignore-scripts=true`，只在确知需要的项目上按包放行；
- 本地开发：默认关闭，新装依赖后手动跑一次 `npm rebuild <pkg>`;
- 用 `npm ci --ignore-scripts` 做一次干净安装，再按需 `npm rebuild` 指定的几个包。

pnpm 10 起默认就不执行依赖的生命周期脚本，需要显式在 `pnpm.onlyBuiltDependencies` 里列出放行的包名，这个默认值更合理。

## 名字相近的包

typosquatting 指注册与热门包拼写相近的名字，等人装错：

| 真实包 | 常见的仿冒 |
| --- | --- |
| `cross-env` | `crossenv`、`cross-env.js` |
| `react-dom` | `reactdom`、`react.dom` |
| `chalk` | `chalkk`、`node-chalk` |
| `lodash` | `lodashs`、`lodash-utils` |

这些包通常只有几十次下载、发布没几天、README 是从真包复制的。装之前看一眼下载量和发布时间，成本只有几秒。

依赖膨胀是另一面。为一个 `is-odd` 之类的 5 行函数引入一棵 40 个包的子树，每个包都是潜在的攻击面，也都进 bundle。`npx howfat <pkg>` 能看某个包的体积与子依赖数量，`npx npm-check-updates` 能看哪些依赖落后大版本。

小工具函数优先自己写，或者从 `node:` 内置模块里找替代。`node:path`、`node:fs/promises`、`structuredClone`、`Array.prototype.at` 这些已经覆盖了很多历史上的小包。

私有范围用 scope 隔离，避免公共 registry 上的同名包被解析进来：

```ini
# .npmrc
@corp:registry=https://npm.corp.example.com/
```

`@corp/*` 只会从这个地址解析，不会去公共源找。

## 用 overrides 锁传递依赖

传递依赖的漏洞没法直接升级时，用 `overrides` 强制指定版本：

```json
{
  "overrides": {
    "minimist": "^1.2.8",
    "postcss@^7": {
      "nanoid": "^3.3.8"
    }
  }
}
```

`postcss@^7` 这种写法只在父依赖匹配该范围时生效，适合「同一个包的两个大版本要分别锁」的场景。pnpm 用 `pnpm.overrides`,yarn 用 `resolutions`，字段名不同，语义一样。

用它的前提是知道自己在做什么：强制提升可能让某个包拿到与它声明范围不符的版本，运行时行为可能变。改完要跑测试，并且在下一次升级依赖时重新审视——这些 override 应该随着上游修复而删除，攒着不管就成了技术债。

## SRI:锁住 CDN 上的脚本

第三方 CDN 上的脚本(`<script src="https://cdn.example.com/lib.js">`)完全在对方控制下，对方被入侵你就跟着中招。SRI(Subresource Integrity，子资源完整性)用哈希锁住内容：

```html
<script
  src="https://cdn.example.com/lib@2.1.0/dist/lib.min.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPz5B4HcLwJ4kPDA"
  crossorigin="anonymous"
></script>
```

浏览器下载后先算哈希，不匹配就拒绝执行，控制台报 `Failed to find a valid digest in the 'integrity' attribute`。

两个条件必须满足：

- `crossorigin="anonymous"`，否则跨源请求拿不到响应体，SRI 无法校验；
- 资源版本固定，URL 里不要用 `latest`。内容一变哈希就变，升级时要同步改哈希。

代价是升级麻烦。所以 SRI 适合「引入一次就不再动」的第三方脚本：统计、客服挂件、支付 SDK。这类脚本恰恰是最不该无条件信任的。

SRI 保护的是「CDN 上的内容被换」，保护不了「你构建时引入的依赖本身有问题」。后者只能靠依赖审查。

## 小结

- 依赖树里绝大多数包你没选过，每个 `postinstall` 都是在你机器上执行任意命令的机会；
- `npm audit` 只覆盖已登记的漏洞，CI 里要设阈值，别用默认值；
- `npm audit signatures` 验的是 registry 签名与来源证明，挡不住作者自己发恶意版本；
- lockfile 必须提交，CI 用 `npm ci`，冲突要重装而不是手改；
- `ignore-scripts=true` 关掉安装脚本，按包放行需要的；
- 提防名字相近的包与依赖膨胀，私有 scope 指向私有源；
- 传递依赖用 `overrides` 锁版本，记得随后续升级清理；
- 固定版本的第三方 CDN 脚本加 `integrity` 与 `crossorigin`。
