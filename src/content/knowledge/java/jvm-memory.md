---
title: 内存区域：堆 / 栈 / 方法区
summary: 'JVM 运行时数据区分线程私有(程序计数器/虚拟机栈/本地方法栈)与共享(堆/方法区);对象在堆、引用在栈;元空间取代永久代;栈溢出 StackOverflowError 与堆溢出 OutOfMemoryError 的成因与参数。'
category: java
node: java-jvm-memory
order: 61
level: 深入
tags: [JVM, 堆, 栈, 方法区, 元空间, OOM]
updated: 2026-11-18
mindmap: java-jvm-memory.mindmap.json
terms: ["stack-and-heap", "reference-type", "garbage-collection"]
sources:
  - title: JVM 规范 · 2.5 Run-Time Data Areas
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html#jvms-2.5
    note: 运行时数据区划分的规范依据。
  - title: Oracle Java 教程 · JVM 内存与垃圾回收概述
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-2.html#jvms-2.5.4
    note: 方法区与运行时常量池的参照。
---

理解内存分区是排查 OOM、栈溢出、GC 问题的前提。JVM 运行时数据区按"线程私有/共享"划分,各存什么、溢出报什么错,一一对应。

## 线程私有区

- **程序计数器(PC)**:当前线程执行字节码的行号指示器,分支/循环/异常恢复靠它。唯一不会 OOM 的区域;
- **虚拟机栈**:每个方法调用创建一个**栈帧**,存局部变量表(基本类型值 + 对象引用)、操作数栈、动态链接、返回地址。方法调用即压帧,返回即弹帧。递归过深 → **StackOverflowError**(-Xss 调单线程栈大小);
- **本地方法栈**:为 native 方法服务,HotSpot 与虚拟机栈合一。

## 线程共享区

- **堆(Heap)**:对象实例与数组的分配区,GC 主战场。分代:新生代(Eden + 两个 Survivor)+ 老年代。-Xms 初始 / -Xmx 最大。对象太多/泄漏 → **OutOfMemoryError: Java heap space**;
- **方法区**:类元信息、运行时常量池、静态变量(JDK7 起静态变量与字符串常量池移到堆)。JDK8 用**元空间(Metaspace)**实现,使用本地内存而非堆,-XX:MaxMetaspaceSize 限制。类加载过多(动态代理/CGLIB 滥用)→ OOM: Metaspace。

## 对象在哪、引用在哪

```java
void m() {
    int a = 1;              // 基本类型值在栈帧局部变量表
    User u = new User();    // 引用 u 在栈,对象实例在堆
}
```

方法返回栈帧弹出,u 引用消失;堆对象若无其它引用可达,下次 GC 回收。这解释了"引用在栈、对象在堆"与 pass-by-value 的关系(第 3 章)。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 320" role="img" aria-label="JVM 运行时数据区分为线程私有的栈与共享的堆、方法区">
    <rect x="6" y="6" width="748" height="308" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="32" y="32" width="300" height="244" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="56" y="58" font-size="13" font-weight="700" fill="var(--ink)">线程私有</text>
    <text x="140" y="58" font-size="11" fill="var(--muted)">每个线程各一份</text>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, monospace">
      <rect x="52" y="72" width="260" height="54" rx="10" fill="var(--panel)" stroke="var(--line)" />
      <text x="182" y="94" font-size="12" fill="var(--ink)" text-anchor="middle">程序计数器</text>
      <text x="182" y="112" font-size="10.5" fill="var(--muted)" text-anchor="middle">当前执行到哪条指令</text>
      <rect x="52" y="138" width="260" height="54" rx="10" fill="var(--panel)" stroke="var(--line)" />
      <text x="182" y="160" font-size="12" fill="var(--ink)" text-anchor="middle">虚拟机栈</text>
      <text x="182" y="178" font-size="10.5" fill="var(--muted)" text-anchor="middle">栈帧:局部变量、操作数栈</text>
      <rect x="52" y="204" width="260" height="54" rx="10" fill="var(--panel)" stroke="var(--line)" />
      <text x="182" y="226" font-size="12" fill="var(--ink)" text-anchor="middle">本地方法栈</text>
      <text x="182" y="244" font-size="10.5" fill="var(--muted)" text-anchor="middle">native 方法用</text>
    </g>
    <rect x="356" y="32" width="372" height="244" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="380" y="58" font-size="13" font-weight="700" fill="var(--ink)">线程共享</text>
    <text x="452" y="58" font-size="11" fill="var(--muted)">整个进程一份</text>
    <rect x="380" y="72" width="324" height="96" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="542" y="102" font-size="12.5" font-weight="700" fill="var(--ink)" text-anchor="middle">堆</text>
    <text x="542" y="124" font-size="11" fill="var(--muted)" text-anchor="middle">几乎所有的对象实例与数组</text>
    <text x="542" y="146" font-size="11" fill="var(--muted)" text-anchor="middle">GC 的主战场</text>
    <rect x="380" y="180" width="324" height="78" rx="10" fill="var(--panel)" stroke="var(--line)" />
    <text x="542" y="206" font-size="12.5" fill="var(--ink)" text-anchor="middle">方法区 / 元空间</text>
    <text x="542" y="228" font-size="11" fill="var(--muted)" text-anchor="middle">类元信息、运行时常量池、静态变量</text>
    <text x="32" y="304" font-size="12" fill="var(--muted)">栈溢出抛 StackOverflowError;堆与方法区不足抛 OutOfMemoryError,两者的排查手段完全不同。</text>
  </svg>
  <figcaption>私有区随线程生死,共享区随进程生死;问「变量存在哪」之前先分清楚是哪种变量。</figcaption>
</figure>

## 直接内存

NIO 的 DirectByteBuffer 分配**堆外直接内存**,-XX:MaxDirectMemorySize 限制,不受 -Xmx 约束但受物理内存限制;泄漏同样 OOM: Direct buffer memory。零拷贝场景用它减少堆内外复制。

## 溢出对照

| 错误 | 区域 | 常见原因 | 参数 |
| --- | --- | --- | --- |
| StackOverflowError | 虚拟机栈 | 递归过深/栈帧过大 | -Xss |
| OOM: Java heap space | 堆 | 对象过多/泄漏 | -Xmx |
| OOM: Metaspace | 元空间 | 类加载过多 | -XX:MaxMetaspaceSize |
| OOM: Direct buffer | 直接内存 | NIO 缓冲泄漏 | -XX:MaxDirectMemorySize |
| OOM: unable to create native thread | 线程 | 线程数超系统限制 | 减小 -Xss/限线程数 |

## 小结

- 私有:PC(不 OOM)、虚拟机栈(栈帧,SOE)、本地方法栈;
- 共享:堆(对象,分代,heap OOM)、方法区(JDK8 元空间,本地内存);
- 引用在栈、对象在堆;方法返回引用消失,对象靠可达性回收;
- 直接内存堆外,NIO 用,单独限制;
- 按错误信息定位区域与参数。

下一篇讲类加载机制:一个 class 文件如何变成可用的 Class 对象。