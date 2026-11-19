---
title: transform、3D 与合成
summary: 'transform 用矩阵对元素做平移、缩放、旋转与倾斜,多个函数按从右到左的顺序作用于元素坐标系;3D 变换依赖 perspective 与 preserve-3d,而非 none 的 transform 会创建包含块与层叠上下文。'
category: frontend
node: frontend-css-transform
order: 25
level: 进阶
tags: [CSS, transform, 3D, 合成层]
updated: 2026-11-19
mindmap: css-transform.mindmap.json
terms: []
sources:
  - title: MDN · transform
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/transform
    note: 变换函数、组合顺序与包含块行为。
  - title: MDN · perspective
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/perspective
    note: 透视距离与 3D 渲染上下文。
  - title: MDN · will-change
    url: https://developer.mozilla.org/zh-CN/docs/Web/CSS/will-change
    note: 提前声明变化属性与合成层的资源代价。
---

上一篇的过渡与关键帧负责时间,真正被插值的多是 transform;这一篇单独看这个属性。

## 四个基本函数

`transform` 接受一组变换函数,常用四类:

```css
.avatar:hover {
  transform: translateY(-4px) scale(1.04);
}

.badge {
  transform: rotate(-6deg) skewX(-4deg);
}
```

- `translate(x, y)`: 平移,`translateX` / `translateY` / `translate3d` 是分项形式;
- `scale(sx, sy)`: 缩放,单参数表示等比;
- `rotate(angle)`: 旋转,正值为顺时针;
- `skew(ax, ay)`: 倾斜,单位为角度。

百分比参照元素自身尺寸: `translateX(50%)` 移动自身宽度的一半,与 `left: 50%` 参照包含块不同。这个差异常用于居中: `left: 50%; transform: translateX(-50%)`。

## transform-origin

变换围绕 `transform-origin` 进行,默认 `50% 50%`,即元素中心:

```css
.card { transform-origin: left bottom; }
.card.is-open { transform: rotate(-2deg); }
```

旋转与缩放受原点影响,平移不受。原点也可以写成关键词或长度值,`transform-origin: 0 0` 等价于左上角。改变原点会改变视觉结果,不会改变元素占位。

## 组合顺序从右到左

`transform` 的函数列表按矩阵乘法组合,最右边的函数先作用于元素:

```css
.a { transform: translateX(100px) rotate(45deg); }
.b { transform: rotate(45deg) translateX(100px); }
```

`.a` 先把元素旋转 45 度,再沿父坐标系的 x 轴平移 100px;`.b` 先平移 100px,再旋转 45 度,平移方向随坐标系一起转过 45 度,落点不同。写出多个函数前,先明确「先对元素做什么」,再把它放在列表右边。

## 3D 变换

3D 需要透视距离,否则 `rotateY` 看起来只是水平压扁:

```css
.stage {
  perspective: 800px;
}

.card-3d {
  transform: rotateY(24deg) rotateX(8deg);
  transform-style: preserve-3d;
}
```

- `perspective` 加在父元素上,给子元素提供统一视点;`transform: perspective(800px)` 加在元素自身,只影响自己;
- `rotateX` / `rotateY` 绕水平轴 / 垂直轴旋转,`translateZ` 沿观察方向移动;
- `transform-style: preserve-3d` 让子元素保留在父元素的三维空间里,默认 `flat` 会把子元素压回平面。

透视距离越小,近大远小的效果越强。`perspective-origin` 控制视点位置,默认在父元素中心。

## 翻转卡片示例

```html
<div class="flip">
  <div class="flip__inner">
    <div class="flip__face flip__face--front">正面</div>
    <div class="flip__face flip__face--back">背面</div>
  </div>
</div>
```

```css
.flip {
  width: 240px;
  height: 160px;
  perspective: 800px;
}

.flip__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 400ms ease;
}

.flip:hover .flip__inner,
.flip:focus-within .flip__inner {
  transform: rotateY(180deg);
}

.flip__face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 8px;
  backface-visibility: hidden;
}

.flip__face--front {
  background: #2f6fed;
  color: #ffffff;
}

.flip__face--back {
  background: #14171a;
  color: #e6edf3;
  transform: rotateY(180deg);
}
```

预期结果:指针悬停或内部元素获得焦点时,容器绕 y 轴转半圈;背面预先旋转 180 度,转到正面时方向正确。`backface-visibility: hidden` 隐藏朝向观察者的背面,避免两层文字重叠。`:focus-within` 让键盘操作也能触发。

## will-change 与合成层

浏览器可以把 `transform` 与 `opacity` 的动画放到合成阶段,`will-change: transform` 提前告知即将变化的属性。它会长期占用内存与合成层资源,只给即将动画的元素加,动画结束后移除;对列表里的每个元素都加,反而降低性能。多数情况下浏览器已能自动优化,先测量再决定。

## 包含块与层叠上下文

`transform` 不为 `none` 时,元素会成为 `position: fixed` 后代的包含块,也会创建层叠上下文:

```css
.wrapper { transform: translateZ(0); }
.modal { position: fixed; inset: 0; }
```

`.modal` 不再相对视口定位,而是相对 `.wrapper` 的 padding box;如果 `.wrapper` 有尺寸限制,遮罩只覆盖它。`filter`、`perspective`、`contain: paint` 也会产生类似效果。调试 fixed 定位异常时,先检查祖先链上是否存在这些属性。

## 小结

- `translate` / `scale` / `rotate` / `skew` 按矩阵组合,最右的函数先作用;
- 百分比参照元素自身尺寸,`transform-origin` 影响旋转与缩放;
- 3D 需要 `perspective`,子元素的三维关系由 `preserve-3d` 维护;
- 翻转卡片用两个面加 `backface-visibility: hidden` 实现;
- `will-change` 只在动画前后短暂使用,长期开启会占用资源;
- 非 `none` 的 `transform` 会创建包含块与层叠上下文,影响 `fixed` 后代。
