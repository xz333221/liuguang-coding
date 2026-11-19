---
title: NIO:Buffer / Channel / Selector
summary: 'NIO 用 Buffer 承载数据、Channel 双向传输、Selector 多路复用,使少量线程就能监听大量连接;代价是状态管理与缓冲处理都要自己写,业务中通常由 Netty 封装。'
category: java
node: java-io-nio
order: 54
level: 深入
tags: [NIO, ByteBuffer, Channel, Selector, 多路复用]
updated: 2026-11-19
mindmap: nio.mindmap.json
terms: ["runtime"]
sources:
  - title: java.nio 包的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html
    note: Buffer 的 capacity、position、limit 与 flip/clear/compact 定义。
  - title: java.nio.channels 包的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html
    note: Channel、Selector 与选择键的语义。
---

上一篇结尾说到,缓冲流减少了系统调用的次数,但没有改变「一个连接一个线程」的阻塞模型。NIO 要解决的是后者:用少量线程管理大量连接。

## 阻塞 IO 的瓶颈

传统流模型里,`accept()` 会阻塞到有连接到达,`read()` 会阻塞到有数据可读。服务器通常这样写:主线程负责 accept,每接受一个连接就创建一个线程处理。连接空闲时,对应线程只能停在 read 上等待。

线程不是免费的:每个线程默认约 1MB 栈空间,上千个连接就是可观的虚拟内存;线程的创建、销毁与上下文切换也都消耗 CPU。而大多数连接的多数时间并没有数据可读,等待中的线程不产生任何价值。连接数一多,这个模型就难以扩展。

## Buffer:三个下标

NIO 的数据不再直接通过流读写,而是先放进 Buffer。Buffer 是一块连续内存加三个下标:

- **capacity**:容量,创建后不变;
- **position**:下一次读或写的位置;
- **limit**:读写的边界,超过它不可访问。

写模式下 position 随写入前移,limit 等于 capacity;读完要调用 `flip()` 切到读模式,position 归零、limit 置为刚才的 position;读完数据用 `clear()` 复位,或用 `compact()` 丢弃已读部分、把未读数据移到开头。

```java
ByteBuffer buf = ByteBuffer.allocate(8);
buf.put((byte) 1);
buf.put((byte) 2);
System.out.println(buf.position());   // 2

buf.flip();                            // 切到读模式:position=0, limit=2
System.out.println(buf.get());         // 1
System.out.println(buf.remaining());   // 1

buf.compact();                         // 丢弃已读,未读的 2 前移
System.out.println(buf.position());    // 1
```

`flip` 与 `clear` 是 NIO 最常见的易错点:写完数据忘记 flip,读到的 position 停在末尾,`remaining()` 为 0;读完忘记 clear 或 compact,下一轮写入就没有空间。

## Channel:双向通道

Channel 表示一个可以读也可以写的通道,与单向的 InputStream/OutputStream 不同,读写共用同一个对象。常用实现有三个:

- **FileChannel**:文件读写;
- **SocketChannel**:客户端 TCP 连接;
- **ServerSocketChannel**:服务端监听,对应 ServerSocket。

Channel 总是与 Buffer 配合:读时把数据读进 Buffer,写时把 Buffer 交给 Channel。

```java
try (FileChannel ch = FileChannel.open(Path.of("a.txt"), StandardOpenOption.READ)) {
    ByteBuffer buf = ByteBuffer.allocate(1024);
    while (ch.read(buf) != -1) {       // -1 表示到达文件末尾
        buf.flip();
        while (buf.hasRemaining()) {
            System.out.print((char) buf.get());
        }
        buf.clear();                   // 复位,供下一轮读取
    }
}
```

## Selector 与多路复用

Selector 是多路复用器:一个线程把多个 Channel 注册进来,由 Selector 代为等待事件,只有事件就绪时才返回。使用步骤固定:

1. 把 Channel 设为非阻塞:`configureBlocking(false)`;
2. 向 Selector 注册感兴趣的事件:`OP_ACCEPT`、`OP_READ`、`OP_WRITE`、`OP_CONNECT`;
3. 调用 `select()`,阻塞到至少一个事件就绪;
4. 遍历 `selectedKeys()` 逐个处理;
5. 处理完必须从迭代器中 `remove()`,否则该键会一直留在集合里被重复处理。

```java
Selector selector = Selector.open();
ServerSocketChannel server = ServerSocketChannel.open();
server.bind(new InetSocketAddress(8080));
server.configureBlocking(false);
server.register(selector, SelectionKey.OP_ACCEPT);

while (true) {
    selector.select();                 // 阻塞到有就绪事件
    Iterator<SelectionKey> it = selector.selectedKeys().iterator();
    while (it.hasNext()) {
        SelectionKey key = it.next();
        it.remove();                   // 必须移除
        if (key.isAcceptable()) {
            SocketChannel client = ((ServerSocketChannel) key.channel()).accept();
            client.configureBlocking(false);
            client.register(selector, SelectionKey.OP_READ);
        } else if (key.isReadable()) {
            ByteBuffer buf = ByteBuffer.allocate(1024);
            int n = ((SocketChannel) key.channel()).read(buf);
            if (n == -1) {             // 对端关闭
                key.cancel();
                key.channel().close();
            }
            // n > 0 时 flip 后从 Buffer 读取数据
        }
    }
}
```

## 阻塞与非阻塞模式

阻塞模式下 `accept()` 没有连接就等待,`read()` 没有数据也等待;非阻塞模式下两者立即返回,`accept()` 返回 null,`read()` 返回 0,调用方需要自行判断并稍后再试。Selector 只能注册非阻塞 Channel,这正是它能把等待集中到自己身上的前提。

## 零拷贝

`FileChannel.transferTo` 可以把文件数据传输到另一个 Channel(例如 SocketChannel),数据在内核中直接流转,不必先读进用户态 Buffer 再写出,减少了一次拷贝和一次上下文切换,通常称为零拷贝。这里只点到,实现细节属于操作系统层面的能力。

## NIO 适合什么

NIO 用少量线程支撑大量并发连接,适合连接多、单连接数据量小的场景,例如即时通信、消息推送、网关。代价是代码复杂度:连接状态、半包与粘包、读写缓冲的切换在运行时都要应用自己维护。多数业务代码不会直接操作 Selector,而是使用 Netty 这类框架封装这些细节(本篇不展开)。FileChannel 和内存映射是另一类用途,与多路复用无关,处理大文件时更常见。

## 小结

- 阻塞 IO 一连接一线程,线程多数时间在等待,连接数上升后内存与切换开销明显;
- Buffer 用 capacity/position/limit 描述状态,flip 切到读模式,clear 复位,compact 保留未读数据;
- Channel 双向,数据经 Buffer 进出,FileChannel、SocketChannel、ServerSocketChannel 是常用实现;
- Selector 用少量线程监听多个 Channel,select 返回就绪事件,selectedKeys 处理完必须移除;
- transferTo 实现零拷贝;NIO 适合高并发连接,业务中多用 Netty 封装。

下一篇看网络编程更直接的入口:TCP 的 Socket,以及 JDK 11 起自带的 HttpClient。
