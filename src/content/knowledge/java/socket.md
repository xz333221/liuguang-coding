---
title: 网络编程:Socket 与 HTTP 客户端
summary: 'TCP 用 Socket/ServerSocket 面向连接可靠传输,UDP 用 DatagramSocket 无连接;JDK11 的 java.net.http.HttpClient 支持同步/异步与 HTTP/2,取代 HttpURLConnection。'
category: java
node: java-io-socket
order: 55
level: 进阶
tags: [Socket, TCP, UDP, HttpClient]
updated: 2026-11-18
mindmap: java-io-socket.mindmap.json
terms: ["runtime", "reference-type"]
sources:
  - title: java.net.http.HttpClient javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/HttpClient.html
    note: 同步/异步发送与 HTTP/2 支持的依据。
  - title: Oracle Java 教程 · All About Sockets
    url: https://docs.oracle.com/javase/tutorial/networking/sockets/index.html
    note: TCP Socket 客户端/服务端模型的参照。
---

IO 流解决本地读写,网络编程把流延伸到远端。这一篇讲 TCP/UDP 两种 Socket,以及 JDK11 起内置的现代 HTTP 客户端。

## TCP:Socket / ServerSocket

TCP 面向连接、可靠、有序。服务端监听端口,客户端发起连接,双方通过输入/输出流交换字节:

```java
// 服务端
try (ServerSocket server = new ServerSocket(8080)) {
    while (true) {
        try (Socket client = server.accept();          // 阻塞等待连接
             BufferedReader in = new BufferedReader(
                     new InputStreamReader(client.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter out = new PrintWriter(
                     new OutputStreamWriter(client.getOutputStream(), StandardCharsets.UTF_8), true)) {
            String line = in.readLine();
            out.println("echo: " + line);
        }
    }
}

// 客户端
try (Socket s = new Socket("localhost", 8080);
     PrintWriter out = new PrintWriter(
             new OutputStreamWriter(s.getOutputStream(), StandardCharsets.UTF_8), true);
     BufferedReader in = new BufferedReader(
             new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8))) {
    out.println("hello");
    System.out.println(in.readLine());   // echo: hello
}
```

accept 与 read 都阻塞,因此一连接一线程;高并发用 NIO/Netty(上一篇)。务必设置超时 `setSoTimeout`,避免永久挂起。

## UDP:DatagramSocket

UDP 无连接、不保证可靠与顺序,以数据报(DatagramPacket)为单位,开销小,适合实时音视频、DNS:

```java
try (DatagramSocket ds = new DatagramSocket()) {
    byte[] data = "hi".getBytes(StandardCharsets.UTF_8);
    DatagramPacket p = new DatagramPacket(data, data.length,
            InetAddress.getByName("localhost"), 9090);
    ds.send(p);
}
```

接收方 bind 端口后 receive(packet)。丢包、乱序由应用层自行处理。

## HttpClient:JDK11 内置

HttpURLConnection 陈旧难用;JDK11 的 java.net.http.HttpClient 支持 HTTP/1.1 与 HTTP/2、同步与异步、WebSocket:

```java
HttpClient client = HttpClient.newHttpClient();
HttpRequest req = HttpRequest.newBuilder()
        .uri(URI.create("https://example.com/api"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString("{\"k\":1}"))
        .timeout(Duration.ofSeconds(5))
        .build();

HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(resp.statusCode() + " " + resp.body());

// 异步
client.sendAsync(req, HttpResponse.BodyHandlers.ofString())
      .thenApply(HttpResponse::body)
      .thenAccept(System.out::println);
```

BodyPublishers 提供 ofString/ofByteArray/ofFile;BodyHandlers 提供 ofString/ofByteArray/ofFile/discarding。客户端可复用(线程安全),不要每请求新建。

## 选型

- 简单 HTTP 调用:HttpClient;
- 复杂需求(连接池、拦截器、重试):OkHttp / Apache HttpClient;
- 自定义二进制协议 / 长连接:Socket 或 Netty;
- 实时不可靠传输:UDP。

## 小结

- TCP Socket/ServerSocket 面向连接可靠,accept/read 阻塞,设超时;
- UDP DatagramSocket 无连接数据报,丢包乱序应用层处理;
- HttpClient(JDK11)支持 HTTP/2、同步/异步,BodyPublishers/BodyHandlers 组合;
- 客户端复用;复杂需求用 OkHttp 等;自定义协议用 Socket/Netty。

下一章进入多线程与并发:线程、锁与内存模型。