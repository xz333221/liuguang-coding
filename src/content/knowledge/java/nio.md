---
title: NIO:Buffer / Channel / Selector
summary: 'NIO 面向缓冲与通道:Buffer 用 position/limit/capacity 管理读写,flip 切换读写模式;Channel 双向传输;Selector 单线程监听多通道就绪事件,是非阻塞网络 IO 的基础。'
category: java
node: java-io-nio
order: 54
level: 深入
tags: [NIO, Buffer, Channel, Selector, 非阻塞]
updated: 2026-11-18
mindmap: java-io-nio.mindmap.json
terms: ["runtime", "reference-type"]
sources:
  - title: java.nio 包 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html
    note: Buffer/Channel/Selector 三大组件的官方定义。
  - title: java.nio.Buffer javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/Buffer.html
    note: position/limit/capacity 与 flip/clear 语义的依据。
---

传统 IO(BIO)是面向流、阻塞的:一个连接一个线程,read 没数据就挂起。NIO(New IO)改为面向**缓冲**与**通道**,并支持非阻塞与多路复用,用少量线程服务大量连接。这一篇讲三大组件。

## Buffer:带状态的数据块

Buffer 是一块内存加三个指针:

- **capacity**:容量,创建后不变;
- **position**:下一个读/写的位置;
- **limit**:读/写的边界(最多到哪)。

写模式:position 从 0 递增,limit = capacity。写完后调 **flip()**:limit = 当前 position,position = 0,切换为读模式。读完调 **clear()**(position=0, limit=capacity)或 **compact()**(保留未读数据)准备再写。

```java
ByteBuffer buf = ByteBuffer.allocate(1024);
buf.put("hi".getBytes());   // 写:position=2
buf.flip();                 // 读模式:limit=2, position=0
byte[] dst = new byte[buf.remaining()];
buf.get(dst);               // 读
buf.clear();                // 复位准备再写
```

忘记 flip 是最常见错误:读模式没切换,读到空或越界。

## Channel:双向通道

Channel 是数据传输的端点,可向 Buffer 读/写(双向),区别于单向的流:

- FileChannel:文件读写,支持 map(内存映射)、transferTo(零拷贝);
- SocketChannel / ServerSocketChannel:TCP 客户端/服务端,可配置非阻塞;
- DatagramChannel:UDP。

```java
try (FileChannel ch = FileChannel.open(Path.of("a.txt"), StandardOpenOption.READ)) {
    ByteBuffer buf = ByteBuffer.allocate(8192);
    while (ch.read(buf) != -1) {
        buf.flip();
        // 处理 buf
        buf.clear();
    }
}
```

## Selector:多路复用

Selector 让**一个线程**监听多个 Channel 的就绪事件(可读/可写/可连接),避免一连接一线程:

1. Channel 配置非阻塞 `configureBlocking(false)`;
2. 注册到 Selector,指定感兴趣的事件(OP_READ / OP_WRITE / OP_ACCEPT / OP_CONNECT);
3. 线程循环 `selector.select()` 阻塞直到有事件就绪;
4. 遍历 `selectedKeys()` 处理就绪通道,处理后移除 key。

```java
Selector sel = Selector.open();
serverChannel.configureBlocking(false);
serverChannel.register(sel, SelectionKey.OP_ACCEPT);

while (true) {
    sel.select();
    Iterator<SelectionKey> it = sel.selectedKeys().iterator();
    while (it.hasNext()) {
        SelectionKey key = it.next();
        if (key.isAcceptable()) { /* accept 新连接并注册 OP_READ */ }
        if (key.isReadable())   { /* 读数据 */ }
        it.remove();   // 必须移除,否则下次重复处理
    }
}
```

这就是 Reactor 模型的雏形,Netty、Tomcat NIO connector 都建立在此之上。

## BIO vs NIO

| 维度 | BIO | NIO |
| --- | --- | --- |
| 面向 | 流 | 缓冲 + 通道 |
| 阻塞 | 阻塞 | 可非阻塞 |
| 线程模型 | 一连接一线程 | 单线程多路复用 |
| 适用 | 连接少、逻辑重 | 连接多、IO 密集 |

NIO 编程复杂(状态指针、事件循环),业务网络开发通常用 Netty 等封装,而非裸写 Selector。

## 小结

- Buffer 三指针 capacity/position/limit;flip 切读、clear/compact 复位;
- Channel 双向传输;FileChannel 支持映射与零拷贝;
- Selector 单线程监听多通道就绪事件,Reactor 模型基础;
- 非阻塞 + 多路复用使少量线程服务大量连接;
- 裸 NIO 复杂,业务用 Netty 等封装。

下一篇讲 Socket 与 JDK 内置 HTTP 客户端。