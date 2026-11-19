---
title: 排查命令与常用参数
summary: '线上 JVM 问题先用 jps 定位进程,再用 jstat 看 GC 频率、jstack 抓线程栈与死锁、jmap 查对象分布并导出堆转储,jcmd 统一调用;配合 -XX:+HeapDumpOnOutOfMemoryError 与 -Xlog:gc* 保留现场,即可按 CPU 高、内存上涨、线程卡住三条线索定位根因。'
category: java
node: java-jvm-tools
order: 64
level: 深入
tags: [jps, jstack, jmap, JVM 参数]
updated: 2026-11-19
mindmap: jvm-tools.mindmap.json
terms: ["jvm", "jdk", "garbage-collection"]
sources:
  - title: JDK 21 工具命令文档
    url: https://docs.oracle.com/en/java/javase/21/docs/specs/man/index.html
    note: jps、jstat、jstack、jmap、jcmd、jinfo 的官方用法。
  - title: java.lang.management 包 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.management/java/lang/management/package-summary.html
    note: JMX 管理接口与运行时监控指标。
---

上一篇说明了 GC 的停顿成因与收集器选择;线上 JVM 出现 CPU 升高、内存上涨或线程卡住时,还需要用 JDK 自带的工具取现场数据,再回到内存与 GC 的原理上分析。这一篇整理常用命令、关键参数与排查顺序。

## jps:先定位进程

```bash
jps -l
# 12345 com.example.OrderApplication
# 12680 jdk.jcmd/sun.tools.jps.Jps
```

-l 输出主类全名,第一列是 PID,后续命令都用它。加 -v 可同时看到启动参数,用来确认线上实际生效的 -Xmx 与收集器。

## jstat:看 GC 频率与各区占用

```bash
jstat -gcutil 12345 1000 5
```

```text
  S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT    CGC    CGCT     GCT
  0.00  96.88  41.20  12.55  95.31  92.14     12    0.152     0    0.000     8    0.031    0.183
```

- E、O、M 分别是新生代、老年代、元空间使用百分比;YGC/YGCT 与 FGC/FGCT 是回收次数与总耗时;末尾两个数字是采样间隔(毫秒)与次数。

老年代使用率在 Full GC 后仍不下降,说明对象确实存活或存在泄漏。

## jstack:线程栈与死锁

```bash
jstack -l 12345 > thread.txt
```

输出每个线程的栈帧、状态(RUNNABLE、BLOCKED、WAITING、TIMED_WAITING)与锁信息。-l 额外打印锁与死锁检测结果:

```text
"Thread-1" #12 prio=5 os_prio=0 tid=0x00007f... nid=0x3a2c waiting for monitor entry
   java.lang.Thread.State: BLOCKED (on object monitor)
        at com.example.Counter.increment(Counter.java:18)
        - waiting to lock <0x000000076ab1c2d8> (a com.example.Counter)

Found one Java-level deadlock:
=============================
"Thread-1":
  waiting to lock monitor 0x00007f... (object 0x000000076ab1c2d8, a com.example.Counter)
```

定位 CPU 高的线程时,把 top 里的线程号转成十六进制,再与栈里的 nid 对应:

```bash
top -Hp 12345            # 找出占用最高的线程,记下 TID
printf '%x\n' 15148      # 转十六进制,如 3b2c
jstack 12345 | grep -A 20 'nid=0x3b2c'
```

## jmap:对象分布与堆转储

```bash
jmap -histo:live 12345 | head -20
```

```text
 num     #instances         #bytes  class name (module)
-------------------------------------------------------
   1:        402133        9667192  [B (java.base@21)
   2:         88211        2822752  java.lang.String (java.base@21)
```

#instances 是实例数,#bytes 是总字节数,[B 表示 byte 数组。:live 会先触发一次 Full GC,线上慎用,可改用 jcmd 的版本。

```bash
jmap -dump:live,format=b,file=heap.hprof 12345
```

导出后用 MAT 或 VisualVM 打开,查看 dominator tree 与引用路径,确认占用最大的对象是缓存还是泄漏。

## jcmd:统一入口

jcmd 把多数诊断命令收拢到一个入口,JDK 7 起可用:

```bash
jcmd 12345 VM.flags
jcmd 12345 GC.heap_info
jcmd 12345 Thread.print
jcmd 12345 GC.class_histogram
```

GC.class_histogram 统计对象分布时不强制 Full GC,线上比 jmap -histo:live 更安全。

## jinfo:查看与调整参数

```bash
jinfo -flag MaxHeapSize 12345
# -XX:MaxHeapSize=4294967296
```

显示当前生效值。部分标记为 manageable 的参数可以在运行期修改,其余参数重启才生效。

## OOM 自动 dump

```bash
java -Xms512m -Xmx512m \
     -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/data/dump \
     -jar app.jar
```

堆溢出时自动把 hprof 写到指定目录,文件名默认为 java_pid<pid>.hprof。线上应开启,否则 OOM 发生后现场丢失,只能靠复现。

## 常用启动参数

```bash
java -Xms1g -Xmx1g \
     -XX:MetaspaceSize=128m \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -Xlog:gc*:file=gc.log:time,uptime,level,tags \
     -XX:+HeapDumpOnOutOfMemoryError \
     -jar app.jar
```

- **-Xms / -Xmx / -Xmn**:堆初始值、最大值与新生代大小,前两者设为相等可避免运行期扩缩;G1 下不固定新生代,改用 -XX:MaxGCPauseMillis 让收集器自行调整;
- **-XX:MetaspaceSize**:元空间首次扩容的阈值,不是上限,上限用 -XX:MaxMetaspaceSize;
- **-XX:+UseG1GC**:显式指定 G1,便于不同环境保持一致;
- **-Xlog:gc***:统一输出 GC 日志,便于事后分析停顿。

## 图形工具与 Arthas

- **jconsole / VisualVM / JMC**:分别覆盖 MBean 与堆监控、CPU 与内存采样、JFR 持续记录;
- **Arthas**:开源在线诊断工具,支持 dashboard、thread、heapdump、watch 等命令,适合不便重启的线上排查。

## 排查顺序清单

**CPU 高。**

1. top -Hp <pid> 找到占用最高的线程;
2. 线程号转十六进制,jstack 匹配 nid,查看栈顶方法;
3. 若热点在 GC 线程,用 jstat 确认是否频繁 Full GC。

**内存持续上涨。**

1. jstat -gcutil 看老年代使用率,Full GC 后是否回落;
2. jmap -histo:live 或 jcmd GC.class_histogram 找大对象;
3. 导出 hprof,用 MAT 查看 dominator tree 与引用路径,区分泄漏与缓存过大。

**线程卡住或无响应。**

1. jstack 连续采样 2 到 3 次,间隔几秒,对比线程是否停在同一个栈;
2. 查 BLOCKED 状态与 waiting to lock,确认锁竞争;
3. 搜索 "Found one Java-level deadlock",按输出定位互相等待的线程。

## 小结

- jps 定位进程,jstat -gcutil 看 GC 频率与各区占用,jstack 抓线程栈与死锁;
- jmap -histo 查对象分布,-dump 导出堆转储,jcmd 是更安全的统一入口;
- 开启 HeapDumpOnOutOfMemoryError 保留 OOM 现场,GC 日志用 -Xlog:gc* 统一输出;
- -Xms 与 -Xmx 设为相等,-Xmn 只对 Parallel 有意义,G1 用 MaxGCPauseMillis 控制停顿;
- 排查按 CPU 高、内存上涨、线程卡住三条线索分别取数,再结合原理定位根因。

下一篇进入工程化:用 Maven 的坐标、依赖与生命周期把项目组织起来。
