---
title: 内存区域:堆 / 栈 / 方法区
summary: 'JVM 在运行时把内存划分为程序计数器、虚拟机栈、本地方法栈、堆、方法区(JDK 8 起为元空间)与直接内存,前三者线程私有、后两者线程共享;对象在堆上分配,栈帧随方法调用出入,越界时分别抛 OutOfMemoryError 与 StackOverflowError。'
category: java
node: java-jvm-memory
order: 61
level: 深入
tags: [JVM, 堆栈, 元空间, 栈帧]
updated: 2026-11-19
mindmap: jvm-memory.mindmap.json
terms: ["jvm", "stack-and-heap", "runtime", "reference-type"]
sources:
  - title: The Java Virtual Machine Specification, Java SE 21 · Chapter 2
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/index.html
    note: 运行时数据区的官方划分与各区域职责。
  - title: java.lang.ref 包 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html
    note: 引用类型与可达性相关的官方说明。
---

上一篇的并发集合与原子类把线程安全封装在类内部;这些机制能成立,前提是 JVM 对内存与线程有一套明确的组织方式。这一篇按规范划分,逐个说明运行时数据区存放什么、哪些线程共享、越界时抛哪种错误。

## 运行时数据区:先分私有与共享

JVMS 第 2 章把运行时数据区分为五块,外加一块不受规范约束的直接内存:

- **程序计数器、虚拟机栈、本地方法栈**:线程私有,随线程创建与销毁;
- **堆、方法区**:所有线程共享,随虚拟机启动创建;
- **直接内存**:不属于运行时数据区,由 NIO 通过本地内存分配。

线程私有意味着同一份数据不需要同步,这是理解后续并发问题的起点。

## 程序计数器

程序计数器(Program Counter Register)是一块很小的内存,记录当前线程正在执行的字节码指令地址。JVM 的多线程靠轮流切换处理器核心实现,切换后要恢复执行位置,所以每个线程都需要独立的计数器。

- 唯一不会抛 OutOfMemoryError 的区域;
- 执行 native 方法时值为空(undefined);
- 分支、循环、异常处理都依赖它确定下一条指令。

## 虚拟机栈与栈帧

虚拟机栈(VM Stack)描述 Java 方法执行的内存模型:每次方法调用创建一个栈帧(frame),方法返回时弹出。栈帧包含四部分:

- **局部变量表**:以槽(slot)为单位存放方法参数与局部变量,基本类型直接存值,引用类型存指向堆对象的引用;
- **操作数栈**:字节码指令的运算工作区,如 iadd 从栈顶弹出两个 int、相加后压回;
- **动态链接**:指向运行时常量池中该方法的符号引用,支持运行期解析;
- **返回地址**:方法正常返回或异常退出后,回到调用者的下一条指令。

栈深度由 -Xss 决定(64 位默认约 1MB)。调用层级过深、无法再分配栈帧时抛 StackOverflowError:

```java
public class StackDemo {
    static int depth;

    static void recurse() {
        depth++;
        recurse();          // 不断调用自身,直至栈帧耗尽
    }

    public static void main(String[] args) {
        try {
            recurse();
        } catch (StackOverflowError e) {
            System.out.println(depth);   // 约 1 万~2 万,随 -Xss 变化
        }
    }
}
```

运行 `java -Xss512k StackDemo`。若栈可以动态扩展却申请不到本地内存,抛的是 OutOfMemoryError;StackOverflowError 表示深度超过上限,两者来源不同。

## 本地方法栈

本地方法栈(Native Method Stack)服务于 native 方法,结构与虚拟机栈类似,具体实现由虚拟机决定(HotSpot 把两者合并实现)。它同样可能抛 StackOverflowError 与 OutOfMemoryError。日常 Java 代码很少直接接触,写 JNI 或调用 System.loadLibrary 时才进入这块。

## 堆:对象的主要存放地

堆(Heap)是虚拟机管理的内存中最大的一块,所有线程共享,几乎所有对象实例与数组都在这里分配。

- **分代**:多数收集器把堆分为新生代(Eden、两个 Survivor)与老年代,新对象先在 Eden 分配,经历多次 Minor GC 仍存活的对象晋升到老年代;
- **TLAB**:Thread Local Allocation Buffer,线程私有的分配缓冲区,每个线程在 Eden 中先划一小块独占,分配对象时不用加锁,用尽再换;
- **字符串常量池**:JDK 7 起从永久代移到堆中,所以 `new String("a").intern()` 返回的是堆里的对象;
- **OOM**:堆中没有足够空间、且收集器反复回收仍无法满足分配时,抛 OutOfMemoryError: Java heap space。

```java
public static void main(String[] args) {
    List<byte[]> list = new ArrayList<>();
    while (true) {
        list.add(new byte[1024 * 1024]);   // -Xmx64m 下很快 OutOfMemoryError: Java heap space
    }
}
```

堆大小由 -Xms(初始值)与 -Xmx(最大值)控制,生产环境通常把两者设为相等,避免运行期反复扩缩。

## 方法区与元空间

方法区(Method Area)存储已被虚拟机加载的类信息、字段与方法描述、静态变量、即时编译后的代码等,所有线程共享。

JDK 8 之前用永久代(PermGen)实现,大小受 -XX:MaxPermSize 限制,动态生成类过多时抛 OutOfMemoryError: PermGen space。JDK 8 起改为元空间(Metaspace),使用本地内存,默认不设上限,可用 -XX:MaxMetaspaceSize 限制。

方法区中还包含运行时常量池(Runtime Constant Pool):每个类或接口的常量池表在类加载后进入这里,存放字面量与符号引用,并支持运行期解析。`String.intern()` 把字符串登记进字符串常量池,属于典型的运行期行为。

元空间耗尽同样抛 OutOfMemoryError: Metaspace,常见于大量反射、动态代理、热部署场景下类不断加载而无法卸载。

## 直接内存

直接内存(Direct Memory)不受运行时数据区规范约束,是 JVM 通过 Unsafe 向操作系统申请的本地内存,NIO 的 DirectByteBuffer 使用它减少一次数据复制。分配与回收成本高于堆内存,容量受物理内存与 -XX:MaxDirectMemorySize 限制,超限抛 OutOfMemoryError: Direct buffer memory。

## 两类错误的典型来源

- StackOverflowError:方法无限自我调用、调用层级过深、-Xss 过小;
- OutOfMemoryError: Java heap space:对象泄漏、缓存无界、一次性加载大文件;
- OutOfMemoryError: Metaspace:动态生成类过多、类加载器无法释放;
- OutOfMemoryError: Direct buffer memory:Netty 或 NIO 分配的直接缓冲区未释放。

错误类型与区域一一对应,看到消息就能判断该查哪块内存。

## 小结

- 运行时数据区中,程序计数器、虚拟机栈、本地方法栈线程私有,堆与方法区线程共享;
- 栈帧含局部变量表、操作数栈、动态链接与返回地址,深度超限抛 StackOverflowError;
- 对象主要在堆上分配,分新生代与老年代,TLAB 降低分配竞争,字符串常量池位于堆;
- 方法区在 JDK 8 起由元空间实现,使用本地内存,保存类元数据与运行时常量池;
- 堆、元空间、直接内存耗尽都抛 OutOfMemoryError,区别在错误消息。
