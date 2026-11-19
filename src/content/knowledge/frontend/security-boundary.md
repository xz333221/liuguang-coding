---
title: 能力边界：什么不该放在浏览器里
summary: '打包产物对用户完全可见,压缩不是加密。密钥、鉴权判定、价格计算、库存与限流都不能只放前端;前端校验只为首屏反馈,服务端必须原样再验一遍。判断标准很简单:这段逻辑被完全绕过时,损失由谁承担。'
category: frontend
node: frontend-security-boundary
order: 101
level: 进阶
tags: [安全, 权限, 信任边界, 校验]
updated: 2026-11-19
mindmap: security-boundary.mindmap.json
terms: []
sources:
  - title: OWASP · Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
    note: 权限判定必须在服务端执行的理由与做法。
  - title: OWASP · Input Validation Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
    note: 客户端校验只作为体验优化、服务端必须复验。
  - title: MDN · Content Security Policy
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CSP
    note: 前端防线能覆盖到与覆盖不到的范围。
---

前面四篇都在处理具体的攻击手法:XSS 管输出编码,CSRF 管请求来源,CSP 管执行来源,供应链管代码来源。这一篇退一步,问一个更基础的问题:哪些逻辑压根就不该由浏览器负责。

因为浏览器这一侧的代码,用户完全控制。

## 打包产物是公开文件

`dist/` 里的一切都会被下载到用户机器上。压缩(minify)只做三件事:去掉空白、缩短变量名、删掉无用分支。它不改变语义,也不改变字符串内容。

任何一个用户都能:

- 打开 DevTools 直接读源码,格式化后几乎与开发代码一样;
- 打断点、改内存里的变量、改函数的返回值;
- 在 Console 里直接调你暴露在全局的任何对象;
- 用代理工具改写任意一个响应,包括 JS 文件本身;
- 关掉 JS 直接发请求。

`source-map` 部署到线上更是把原始代码连同注释一起公开。即使不部署,变量名混淆也只增加几分钟阅读成本,字符串常量、接口路径、判断逻辑全都还在。

结论:前端代码的安全性等于零。它能保证的只有「正常用户看到正常的界面」,不能保证「用户只能做被允许的事」。

## 密钥没有「前端专用」这一说

```js
// 错:常量会被折叠进 bundle,用户在 main.js 里搜索 sk_live 就能找到
const SECRET = 'sk_live_9f8a7b6c5d4e3f2a1b';

// 同样错:VITE_ 前缀的含义是「允许公开」,不是「加密存放」
const key = import.meta.env.VITE_PAYMENT_SECRET;
```

构建工具会把常量折叠进产物。`VITE_`(或 CRA 的 `REACT_APP_`、Next 的 `NEXT_PUBLIC_`)这个前缀的含义就是「允许公开」。真正不该公开的变量不加前缀,它们只在服务端运行时可用。

服务端渲染时还有一条更容易忽视的路径:组件在服务端能读到 `process.env.SECRET`,但如果这个值被放进了传给客户端的 props 或者序列化的初始状态,它就跟着 HTML 到了浏览器。

```jsx
// 错:整个对象被序列化进 <script> 标签
return <Page initialProps={{ userId, secretKey: process.env.SECRET }} />;
```

需要用到密钥的操作,一律由前端调自己的接口,接口在服务端用密钥去调第三方。这样密钥不出内网,接口还能加限流和审计。

同类问题还有签名。前端算签名,`const sign = (payload) => hmacSha256(SECRET, payload)`,密钥必然在前端,等于没有签名:任何人都能拿到 `SECRET` 自己签一份。

需要防篡改就交给 HTTPS 加服务端会话。需要在客户端证明「这个请求来自我的 App」,用平台提供的证明机制(Android 的 Play Integrity、iOS 的 App Attest),不要自己在前端算哈希。

## 鉴权判定必须在服务端

这一条最常被违反,因为前端的权限代码写起来很自然:

```js
// 只在界面上生效,接口一点防护都没有
if (user.role !== 'admin') {
  router.replace('/403');
  return;
}
```

路由守卫、隐藏菜单、禁用按钮,做的都是「不给入口」,不是「不许操作」。用户打开 DevTools 改一下 `user.role`,或者在 Console 里直接 `fetch('/api/admin/users')`,整条前端防线就绕过去了。

正确的分工:

- 服务端在每个接口上判断「当前会话有没有权限做这件事」,判断依据来自会话或令牌,不来自请求体;
- 前端拿到的是「已过滤的结果」,服务端不该返回用户无权查看的字段再让前端隐藏;
- 前端隐藏入口,只是为了让界面不出现点了会报错的按钮。

```js
// 服务端:从会话拿身份,从路径拿资源,再判权限
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).end();
  if (order.userId !== req.session.userId) return res.status(404).end();  // 不返回 403
  res.json(order);
});
```

注意这里返回 404 而不是 403。403 会告诉攻击者「这个 ID 存在但你没权限」,可以用来枚举。对无权访问的资源统一回 404,信息量最小。

这类漏洞叫 IDOR(Insecure Direct Object Reference,越权访问),常年排在 OWASP Top 10 里。它不需要任何技巧,把 URL 里的 `id` 从 1001 改成 1002 就够了。

还有一类:`userId` 从请求体里取,写成 `await db.order.create({ data: { ...req.body } })`。身份只能从会话推导,不能从请求体接收。这种展开进数据库是最危险的写法之一,它同时打开了批量赋值(把 `role: 'admin'` 塞进来)和越权两个洞。服务端要显式列出允许的字段。

## 价格、库存与优惠券

凡是涉及钱的数字,前端传来的只能是「用户选了什么」,不能是「应该收多少」。把 `price`、`total` 一起 `JSON.stringify` 发给服务端,改一个数字就能一分钱下单。正确做法是只传 `sku` 和 `qty`,价格由服务端按当前商品表查:

```js
// 服务端:金额自己算,前端传的金额一律忽略
const product = await db.product.findUnique({ where: { sku } });
if (!product || !product.onSale) throw new Error('unavailable');

const subtotal = product.price * qty;
const discount = await calcDiscount(userId, product, qty);  // 服务端规则
const total = Math.max(0, subtotal - discount);
```

三个连带问题:

- 库存:前端显示「仅剩 2 件」只是展示,扣减要在数据库里用条件更新或行锁,`UPDATE stock SET n = n - 1 WHERE sku = ? AND n >= 1`,影响行数为 0 就是卖完了。先查后减会有并发超卖。
- 优惠券:可用性判断要在同一个事务里做,并且用唯一约束防止同一张券被用两次。前端那句「已使用过」的提示不可信。
- 展示价格:列表页的价格可以是缓存,下单时必须重新读一次。缓存过期导致的「页面显示 99,实际 129」要在下单前明确提示,而不是静默改价。

## 前端校验只买体验

必填、长度、格式、两次密码一致,这些校验前端做,目的是减少无效请求、即时反馈。它们全部可以被绕过:

- `required`、`maxlength`、`pattern` 都是 DOM 属性,DevTools 里删掉即可;
- 校验函数在内存里,可以把返回值改成 `true`;
- 请求根本不经过页面,`curl` 直接发。

所以服务端必须原样再验一遍,而且用的是自己的规则,不是复用前端传过来的结果。

```ts
// 服务端:同一份 schema,来源是请求体而不是前端结论
import { z } from 'zod';

const CreateUser = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  nickname: z.string().trim().min(1).max(32),
});

const parsed = CreateUser.safeParse(req.body);
if (!parsed.success) return res.status(422).json({ errors: parsed.error.issues });
```

同一份 schema 在前后端共享是可取的,能保证规则一致;但执行点必须在服务端。前端跑同一份 schema,只是为了在用户敲键盘时就告诉他邮箱格式不对。

还有一类「看起来是安全校验」的东西,实际只是格式约束:文件扩展名、`Content-Type`、图片尺寸。这些都可以伪造,上传接口要按真实字节判断类型,并且把文件存在独立域名或不带 Cookie 的对象存储上,避免上传的 HTML 在同源下被执行。

## 一条判断标准

拿不准某段逻辑放哪边时,问一句:如果这段逻辑被完全绕过,损失由谁承担。

| 能力 | 前端 | 服务端 |
| --- | --- | --- |
| 表单格式校验 | 做,给即时反馈 | 必须重做 |
| 是否管理员 | 只用于隐藏入口 | 每个请求校验 |
| 商品价格 | 只用于展示 | 下单时按 sku 重算 |
| 库存是否充足 | 只用于展示 | 扣减时条件更新 |
| 优惠券可用 | 只用于提示 | 事务内校验并占用 |
| 限流 / 防刷 | 按钮防抖 | 按用户与 IP 计数 |
| 密钥 / 签名 | 不放 | 环境变量或 KMS |
| 幂等控制 | 生成 requestId | 唯一索引兜底 |

左列能做的都是「让正常路径更顺」,右列才承担安全责任。左列缺了体验变差,右列缺了数据出错。

前端的定位是「不可信客户端」,和手机 App、桌面客户端、第三方接入方一样。把它当成一个会撒谎的调用方来设计接口,边界自然就清楚了。

## 小结

- 打包产物对用户完全可见,压缩与混淆都不是加密,`VITE_` / `NEXT_PUBLIC_` 前缀意味着公开;
- 密钥、签名密钥不出服务端,前端调自己的接口,由接口去调第三方;
- 路由守卫与隐藏菜单只挡入口,权限判定必须在每个接口上按会话做;
- 身份从会话取,不从请求体取,避免 `{ ...req.body }` 展开写库;
- 价格、优惠、库存由服务端重算与条件更新,前端只传 sku 和数量;
- 前端校验买的是体验,服务端必须用同一份规则重新执行;
- 判断标准是「逻辑被绕过时谁承担损失」,承担方决定代码放哪边。
