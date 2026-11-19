---
title: 可访问性测试与视觉回归
summary: 'axe-core 能查的是规则层面的硬错误:缺 alt、label 没关联、按钮没有可访问名称、ARIA 属性值不合法、对比度不足。alt 写得有没有意义、Tab 顺序合不合理、屏幕阅读器读起来通不通,它查不出来。视觉回归用 toHaveScreenshot 比对像素,阈值放宽一点,但字体渲染跨平台不同,得固定在同一个镜像里跑。'
category: frontend
node: frontend-testing-a11y
order: 95
level: 进阶
tags: [可访问性, axe-core, 视觉回归, Playwright, 截图]
updated: 2026-11-19
mindmap: testing-a11y.mindmap.json
terms: []
sources:
  - title: Playwright · Accessibility testing
    url: https://playwright.dev/docs/accessibility-testing
    note: 接入 @axe-core/playwright 扫描页面违规的写法。
  - title: Deque · axe-core rule descriptions
    url: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md
    note: 全部规则清单,以及每条规则检查的具体条件。
  - title: Playwright · Visual comparisons
    url: https://playwright.dev/docs/test-snapshots
    note: toHaveScreenshot 的阈值参数与快照更新方式。
---

上一篇的端到端已经在真浏览器里跑完了整条链路。同一套浏览器开着,顺手还能做两类自动检查: 一是不用眼睛就能判定的可访问性规则,二是把页面拍下来和下个版本比像素。两者都便宜,但都不该被当成「做过了」。

## axe 能查什么

axe-core 是一套规则引擎,把 WCAG 里能机械判定的条目写成检查项,挂在 DOM 上跑。

| 问题 | 能否自动查 | 说明 |
| --- | --- | --- |
| 图片缺 `alt` | 能 | `image-alt` 规则 |
| 表单控件没有关联 label | 能 | `label` 规则 |
| 按钮没有可访问名称 | 能 | `button-name`,图标按钮最容易踩 |
| ARIA 属性名或值不合法 | 能 | `aria-*` 系列规则 |
| 文字与背景对比度不足 | 部分 | 背景色能算出来时才算得准 |
| 标题层级跳级 | 部分 | `heading-order` 属于 best-practice,只带 wcag 标签时不会跑 |
| `alt` 写得有没有意义 | 不能 | 写「图片1」也能通过 |
| Tab 顺序是否合理 | 不能 | 要人按着键盘走一遍 |
| 屏幕阅读器读起来通不通 | 不能 | 得上真机 |
| 焦点有没有被困在弹窗里 | 不能 | 需要交互验证 |

自动检查覆盖的是「语法错误」这一层。写错了属性名、漏了 label,机器一眼看得出;内容对不对、顺序顺不顺,只有人能判断。

## 在端到端里跑 axe

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('结账页没有严重违规', async ({ page }) => {
  await page.goto('/checkout')
  await page.getByRole('heading', { name: '确认订单' }).waitFor()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
```

`withTags` 限定检查范围,`wcag2a` 与 `wcag2aa` 是绝大多数项目的底线。只扫当前渲染出来的 DOM,所以先等页面稳定,否则扫到的是骨架屏。

第三方面板、地图、编辑器这类拿不到控制权的区域,用 `exclude` 排除,不要用 `disableRules` 把整条规则关掉,那会把自家代码里的同类问题一起放过。

组件测试里可以用 `jest-axe`,它和 Vitest 通用:

```tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('注册表单没有违规', async () => {
  const { container } = render(<SignupForm />)
  expect(await axe(container)).toHaveNoViolations()
})
```

在 jsdom 里跑,布局与颜色算不出来,对比度这类规则会直接跳过。它的价值是快,能在每次改组件时都跑;真正的对比度检查留给端到端。

## 自动检查之外的部分

几条只有人能判断的:

- `alt` 的语义。装饰性图片该写 `alt=""`,内容性图片要描述它传达的信息。机器只检查「有没有」。
- 标题是不是真的表达了层级。一个页面只有 `h1` 和一个 `h3`,结构上通过了,但内容里那段其实是并列的两组,机器看不出。
- 键盘可达。所有交互元素能不能用 Tab 到达、Enter 与 Space 能不能触发、弹窗打开后焦点有没有移进去、关掉后有没有还回去。这些要手动走一遍。
- 错误提示的播报。表单提交失败时,提示是通过 `aria-live` 播报的,还是只变成红色。前者要听。

实践中比较省力的做法: CI 里跑 axe 卡住新增的硬错误,发布前人工过一遍关键流程的键盘操作。

## 对比度的边界

`color-contrast` 规则会算出元素的实际前景色与背景色,套 WCAG 的比值: 正文 4.5:1,大字号 3:1。算不出来的情况它会标成 `incomplete`,不是 `violation`。

算不出来的典型: 背景是图片、渐变、半透明叠层,或者文字在 canvas 里。半透明背景叠在另一层半透明上,引擎只能按最近的祖先估一个值,结果可能误报,也可能是漏报。这类要用取色工具实测。

```tsx
// 通过:纯色背景,白字对比度 4.6:1
<div className="bg-slate-700 text-white">提交</div>

// 查不出:背景图上的文字
<div style={{ backgroundImage: 'url(/hero.jpg)' }}>限时优惠</div>
```

## 视觉回归

把组件的截图存成基准图,下次运行重新截一张,超过阈值就失败。

```ts
test('价格卡片视觉无变化', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByTestId('price-card')).toHaveScreenshot('price-card.png', {
    maxDiffPixelRatio: 0.01,
    animations: 'disabled',
  })
})
```

三个参数管不同的事:

| 参数 | 含义 | 什么时候调 |
| --- | --- | --- |
| `threshold` | 单个像素的颜色差异容忍度,按 YIQ 色彩空间算,默认 0.2 | 抗渐变、抗轻微压缩噪点 |
| `maxDiffPixels` | 允许不同的像素个数上限 | 区域大小固定时更直观 |
| `maxDiffPixelRatio` | 允许不同的像素占比 | 区域大小会变时用它 |

第一次运行会生成基准图,提交进仓库。之后每次失败都会产出实际截图与 diff 图,放在 `test-results/` 下。

## 字体渲染的差异

同一份 CSS,在 macOS 和 Linux 上截出来的字宽能差一两个像素,抗锯齿的灰度也不一样。差异累计到整段文字上,`maxDiffPixelRatio` 设成 0 就会天天红。

三条应对:

- 本地和 CI 用同一个 Playwright 官方镜像跑,容器里装的字体一致。本地想复现就 `docker run` 同一个镜像。
- 截图区域收窄,只截卡片与弹窗,不截整页。整页里任何一个广告位、时间戳、头像都能让 diff 爆掉。
- 存在随机或时间相关的内容时,先固定住。Playwright 的 `page.clock` 能把 `Date.now()` 与定时器钉在一个时刻,列表数据则用固定的夹具。

只截整页是个常见的误用: 一次布局微调让四处联动,截图红一片,diff 图里全是噪点,最后大家都学会了直接 `--update-snapshots`。

## 几个常见的坑

- 跑通 axe 就宣布达标: 它查不出语义、键盘与朗读。写在 README 里的话,最多写「无 axe 违规」。
- 因为误报把 `color-contrast` 全局关掉: 背景图上的文字确实算不准,但纯色区域的问题也一起放过了。用 `exclude` 缩小范围。
- 视觉回归覆盖整页: 任何一个动态区块都会让结果不稳定,最后变成定期更新快照的仪式。
- 无脑更新快照: `--update-snapshots` 会把真实回归一起写进基准图。每次更新都要看 diff 图,确认变化是有意的。
- 截图里带时间戳: 「3 分钟前」「2026-11-19」这类文案每跑一次都不同,固定时钟或在截图前遮掉。
- 只在本地跑: 本地 pass、CI 红,基本都是字体与渲染差异,固定镜像就能消掉。

## 小结

- axe 只能查规则层面的硬错误,语义、键盘与朗读要人判断;
- 端到端里用 `@axe-core/playwright` 扫全页,组件测试里用 `jest-axe` 扫局部;
- `withTags(['wcag2a', 'wcag2aa'])` 是常见范围,`exclude` 优于 `disableRules`;
- 对比度在背景图、渐变、半透明上算不准,会标成 `incomplete`;
- 视觉回归的阈值按区域调,`threshold` 管单像素,`maxDiffPixelRatio` 管占比;
- 字体渲染跨平台不同,本地与 CI 用同一个镜像跑截图。
