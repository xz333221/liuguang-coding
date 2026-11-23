---
title: 可视化：matplotlib 速览
summary: 'pyplot 与面向对象两套 API;Figure 与 Axes 的关系;折线、散点、柱状、直方;中文与负号显示;保存图片的 dpi 与 bbox;seaborn 的定位。'
category: python
node: python-data-plot
order: 54
level: 入门
tags: [matplotlib, 可视化, pyplot, seaborn, 图表]
updated: 2026-11-23
mindmap: python-data-plot.mindmap.json
terms: ["dataframe", "ndarray", "value", "module"]
sources:
  - title: matplotlib 官方文档 · 快速入门
    url: https://matplotlib.org/stable/users/explain/quick_start.html
    note: Figure、Axes 与绘图流程。
  - title: matplotlib 官方文档 · pyplot 教程
    url: https://matplotlib.org/stable/tutorials/pyplot.html
    note: pyplot 接口与常用图表类型。
---

matplotlib 有两套 API:`pyplot` 的全局状态接口与面向对象的 Figure/Axes 接口。前者适合交互式快速出图,后者适合脚本、报告与多子图。生产代码优先面向对象。

## Figure 与 Axes

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(6, 4))
ax.plot([1, 2, 3], [2, 4, 1], marker="o")
ax.set_title("示例")
ax.set_xlabel("x")
ax.set_ylabel("y")
fig.savefig("plot.png", dpi=150, bbox_inches="tight")
```

- Figure 是整张画布,可包含多个 Axes;
- Axes 是一个坐标系,绝大部分绘图方法挂在它上面;
- `subplots` 同时创建两者,是标准入口。

```mermaid
flowchart LR
  A["fig, ax = plt.subplots()"] --> B["Figure 画布"]
  B --> C["Axes 坐标系"]
  C --> D["plot / scatter / bar / hist"]
  D --> E["set_title / legend / grid"]
  E --> F["savefig 或 show"]
```

## 常用图表

```python
ax.plot(x, y)                         # 折线,趋势
ax.scatter(x, y, s=10, alpha=0.6)     # 散点,相关性
ax.bar(categories, values)            # 柱状,对比
ax.hist(values, bins=30)              # 直方,分布
ax.boxplot(values)                    # 箱线,离群点
ax.imshow(matrix, cmap="viridis")     # 热力图
```

选择图表按问题类型:

| 问题 | 图表 |
| --- | --- |
| 随时间变化 | 折线 |
| 两变量关系 | 散点 |
| 类别对比 | 柱状 |
| 分布 | 直方 / 箱线 |
| 矩阵与相关性 | 热力图 |

类型选错,图画得再漂亮也回答不了问题。

## 中文与负号

matplotlib 默认字体不含中文,直接渲染会出现方框;负号也常显示异常。显式配置字体:

```python
plt.rcParams["font.sans-serif"] = ["Microsoft YaHei", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False
```

字体名要与系统实际安装的一致。Linux 服务器上通常没有中文字体,部署环境应把字体文件一并安装,或在容器镜像里预置。

## 多子图与布局

```python
fig, axes = plt.subplots(2, 2, figsize=(10, 8))
axes[0, 0].plot(x, y)
axes[0, 1].hist(values)
axes[1, 0].scatter(x, y)
axes[1, 1].bar(cats, vals)
fig.tight_layout()          # 自动调整间距
```

`tight_layout` 或 `constrained_layout=True` 解决标题与标签重叠。子图数量多时,面向对象接口比 `plt.subplot(2,2,1)` 更清晰。

## 保存与显示

```python
fig.savefig("report.png", dpi=200, bbox_inches="tight")
plt.close(fig)
```

- `dpi` 决定像素密度,屏幕预览 100 左右,打印/报告 200 以上;
- `bbox_inches="tight"` 去掉多余白边;
- 批量生成图片时必须 `plt.close(fig)`,否则 Figure 一直占用内存,循环几百张就会耗尽;
- 服务器环境通常没有图形界面,用 Agg 后端即可正常保存文件。

```python
import matplotlib
matplotlib.use("Agg")       # 无界面环境,必须在导入 pyplot 前设置
```

## 与 pandas 的配合

pandas 的 `plot` 方法本质是调用 matplotlib,适合快速查看:

```python
df.plot(x="date", y="value", kind="line", figsize=(8, 4))
df.groupby("city")["score"].mean().plot(kind="bar")
```

需要精细控制时,拿到返回的 `ax` 继续操作:

```python
ax = df.plot(kind="line")
ax.set_title("趋势")
ax.grid(alpha=0.3)
```

## seaborn 的定位

seaborn 在 matplotlib 之上提供统计图与更好看的默认样式,适合探索性分析:

```python
import seaborn as sns

sns.set_theme(style="whitegrid")
sns.scatterplot(data=df, x="x", y="y", hue="group")
sns.boxplot(data=df, x="group", y="score")
```

它擅长分布、类别与相关性,底层仍是 matplotlib 对象,需要时可继续用 Axes 调整。生产报告要求可控样式时,直接用 matplotlib 的面向对象接口更稳定。

## 常见问题

- **混用 pyplot 全局状态与多图**:当前图被意外覆盖,统一用 fig/ax;
- **中文显示为方块**:字体未配置或运行环境缺字体;
- **循环里不 close**:内存持续增长;
- **`show()` 在服务器上阻塞或报错**:用 Agg 后端并保存文件;
- **图例与标签重叠**:`tight_layout` 或 `constrained_layout`;
- **坐标轴范围失真**:柱状图不从 0 开始会夸大差异,按语义设置 `set_ylim`。

## 小结

- 生产代码用 Figure/Axes 面向对象接口,`subplots` 是标准入口;
- 图表类型按问题选择:趋势折线、关系散点、对比柱状、分布直方;
- 中文与负号需要显式配置字体;
- `savefig` 指定 dpi 与 `bbox_inches`,批量出图必须 `close`;
- 无界面环境用 Agg 后端,seaborn 适合探索性统计图。
