---
title: 网络编程:Socket 与 HTTP 客户端
summary: 'TCP 的 Socket/ServerSocket 提供阻塞式连接读写,一连接一线程的模型在连接多时线程开销明显;JDK 11+ 的 HttpClient 以 send 同步、sendAsync 异步发起 HTTP 调用,并分别控制连接超时与请求超时。'
category: java
node: java-io-socket
order: 55
level: 进阶
tags: [Socket, TCP, HttpClient, 网络编程]
updated: 2026-11-19
mindmap: socket.mindmap.json
terms: ["protocol"]
sources:
  - title: Oracle Java 教程 · Socket 与 ServerSocket
    url: https://docs.oracle.com/javase/tutorial/networking/sockets/
    note: 阻塞式 Socket 服务端与客户端的标准写法。
  - title: java.net 包的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/net/package-summary.html
    note: Socket、ServerSocket 与 soTimeout 的定义。
  - title: java.net.http 包的 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/package-summary.html
    note: HttpClient、HttpRequest 与 BodyHandlers 的用法。
---

上一篇的 Buffer、Channel 和 Selector 是高并发服务器的底层设施,日常代码更常直接使用 TCP 的 Socket 和 JDK 自带的 HttpClient。这一篇从阻塞式 Socket 讲起,再给出 HTTP 客户端的用法。

## TCP 与 Socket

TCP 是面向连接的传输层协议:通信前先建立连接,数据按序到达,丢失会重传,对上层表现为一条可靠的字节流。Socket 是操作系统提供的编程接口,在 Java 里用 Socket 表示一条已建立的连接,用 ServerSocket 监听端口等待连接。HTTP/1.1 就建立在 TCP 之上。

## echo 服务端

`ServerSocket.accept()` 阻塞到有客户端连入,返回一个新的 Socket 代表这条连接。下面的服务端把每个连接交给一个线程处理,收到一行就回一行(echo):

```java
public class EchoServer {
    public static void main(String[] args) throws IOException {
        try (ServerSocket server = new ServerSocket(9000)) {
            while (true) {
                Socket socket = server.accept();            // 阻塞到有连接
                new Thread(() -> handle(socket)).start();   // 每个连接一个线程
            }
        }
    }

    static void handle(Socket socket) {
        try (socket;
             BufferedReader in = new BufferedReader(
                     new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter out = new PrintWriter(
                     new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true)) {
            String line;
            while ((line = in.readLine()) != null) {        // 对端关闭时返回 null
                out.println("echo: " + line);               // autoFlush 为 true,逐行写出
            }
        } catch (IOException e) {
            // 连接异常断开,记录日志后结束该连接
        }
    }
}
```

PrintWriter 的第二个参数为 true 时,每次 `println` 都会 flush,不必手动调用。这里把 socket 放在 try 的资源列表中,连接结束时自动关闭。

## 客户端

客户端用 `new Socket(host, port)` 建立连接,同样把流包成字符流。两侧都显式指定 UTF-8:

```java
try (Socket socket = new Socket("127.0.0.1", 9000);
     BufferedReader in = new BufferedReader(
             new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
     PrintWriter out = new PrintWriter(
             new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true)) {

    socket.setSoTimeout(5000);           // 读超时 5 秒,超时抛 SocketTimeoutException
    out.println("hello");
    System.out.println(in.readLine());   // echo: hello
}
```

## 超时、编码与关闭顺序

- **setSoTimeout**:设置读操作的最长等待时间,单位毫秒,0 表示无限等待。不设置时 `readLine()` 可能永久阻塞,网络异常的场景下线程无法释放。
- **编码**:输入输出两侧都显式传入 UTF-8,不要依赖平台默认字符集,否则跨系统通信会出现乱码。
- **关闭顺序**:先关闭输出流(触发 flush,把缓冲区数据写出),再关闭输入流,最后关闭 Socket。关闭任一关联流都会连带关闭 Socket。
- 用 try-with-resources 时资源按声明的逆序关闭。按 socket、in、out 的顺序声明,关闭顺序就是 out、in、socket,符合上面的要求。

## 线程开销与 NIO 的动机

accept 循环为每个连接创建一个线程。线程栈默认约 1MB,一万个连接就对应约 10GB 的栈空间,即便只是虚拟内存,地址空间与调度压力也不可忽略;线程的创建、销毁和上下文切换还额外消耗 CPU。而大多数连接在大部分时间内没有数据可读,线程却只能停在 read 上。

这正是上一篇 NIO 的 Selector 要解决的问题:把等待集中到少数线程,用事件通知代替线程阻塞。Netty 在此基础上封装了连接管理与编解码,是业务中更常见的选择。

## JDK 11+ 的 HttpClient

`java.net.http.HttpClient` 封装了 HTTP 的连接管理、请求创建与响应解析,默认尝试 HTTP/2,服务端不支持时回退到 HTTP/1.1。核心对象有三个:HttpClient、HttpRequest、HttpResponse。

同步调用用 `send`,响应体由 `BodyHandlers` 决定如何读取,`ofString` 表示按字符集转成字符串:

```java
HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))     // 建立连接的超时
        .build();

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("https://example.com/api/users/1"))
        .timeout(Duration.ofSeconds(5))            // 整个请求的超时
        .header("Accept", "application/json")
        .GET()
        .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());         // 200
System.out.println(response.body());               // 响应体字符串
```

异步调用用 `sendAsync`,立即返回 CompletableFuture,适合同时发起多个请求:

```java
CompletableFuture<HttpResponse<String>> future =
        client.sendAsync(request, HttpResponse.BodyHandlers.ofString());

future.thenApply(HttpResponse::body)
      .thenAccept(System.out::println)
      .join();                                     // 演示用,业务中通常继续链式组合
```

两级超时要分清:`connectTimeout` 只管建立连接,`HttpRequest.timeout` 覆盖从发出请求到收到响应的整个过程。两者都不设置时,请求可能长时间挂起。

## 小结

- TCP 面向连接、可靠、按序,HTTP 运行在 TCP 之上;
- ServerSocket.accept 阻塞等待连接,返回的 Socket 代表一条连接;
- 两侧显式使用 UTF-8,读操作设置 soTimeout,避免线程永久阻塞;
- 关闭顺序为先输出、再输入、最后 Socket,try-with-resources 按声明逆序执行;
- 一连接一线程在连接多时开销明显,这是 NIO 与 Netty 的动机;
- HttpClient 用 send 同步、sendAsync 异步,BodyHandlers.ofString 读取响应体,连接超时与请求超时分别设置。

第 9 章到此结束。第 10 章进入多线程与并发,从线程的创建与状态讲起,再看线程池如何复用线程、控制并发数量。
