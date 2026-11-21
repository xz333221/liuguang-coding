---
title: 字节流与字符流
summary: 'InputStream/OutputStream 以字节为单位，Reader/Writer 以字符为单位并经编码桥接；装饰器模式层层包装(FileInputStream→BufferedInputStream);flush 与 close 的语义、try-with-resources 保证释放。'
category: java
node: java-io-stream
order: 52
level: 进阶
tags: [IO, 字节流, 字符流, 编码, 装饰器]
updated: 2026-11-18
mindmap: java-io-stream.mindmap.json
terms: ["reference-type", "protocol"]
sources:
  - title: Oracle Java 教程 · Basic I/O
    url: https://docs.oracle.com/javase/tutorial/essential/io/
    note: 字节流/字符流划分与编码桥接的依据。
  - title: java.io 包 javadoc
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html
    note: 四大基类与装饰器层次的官方描述。
---

程序与外部(文件、网络、控制台)交换数据靠 IO 流。Java 把流分成字节与字符两条体系，这一篇讲它们的分界、编码桥接，以及装饰器式的包装方式。

## 四大基类

| 体系 | 输入 | 输出 | 单位 |
| --- | --- | --- | --- |
| 字节流 | InputStream | OutputStream | byte(8 bit) |
| 字符流 | Reader | Writer | char(Unicode) |

字节流处理任意二进制(图片、音频、序列化数据)；字符流处理文本，内部完成字节↔字符的编码转换。**文本优先用字符流**，避免手动处理编码与半个字符的问题。

## 字节流：read / write

```java
try (InputStream in = new FileInputStream("a.bin");
     OutputStream out = new FileOutputStream("b.bin")) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = in.read(buf)) != -1) {   // -1 表示流结束
        out.write(buf, 0, n);
    }
}
```

read(buf) 返回实际读到的字节数，可能小于 buf 长度；循环直到 -1。write 后数据可能还在缓冲区，需 flush 或 close 才真正写出。

## 字符流与编码桥

Reader/Writer 以字符为单位。文件本身是字节，字符流通过**编码**(Charset)桥接：

```java
try (Reader r = new InputStreamReader(new FileInputStream("a.txt"), StandardCharsets.UTF_8);
     Writer w = new OutputStreamWriter(new FileOutputStream("b.txt"), StandardCharsets.UTF_8)) {
    char[] buf = new char[4096];
    int n;
    while ((n = r.read(buf)) != -1) {
        w.write(buf, 0, n);
    }
}
```

InputStreamReader / OutputStreamWriter 就是字节↔字符的桥。**显式指定 UTF-8**，不要依赖平台默认编码(Windows 中文环境默认 GBK，跨平台会乱码)。JDK11 起另有 FileReader(path, charset) 等便捷构造器。

按行读文本用 BufferedReader.readLine:

```java
try (BufferedReader br = Files.newBufferedReader(Path.of("a.txt"), StandardCharsets.UTF_8)) {
    String line;
    while ((line = br.readLine()) != null) {
        System.out.println(line);
    }
}
```

## 装饰器模式：层层包装

IO 类采用装饰器：基础流负责数据来源，包装流叠加能力：

```text
FileInputStream          数据来源:文件
  └─ BufferedInputStream  叠加:缓冲
       └─ DataInputStream   叠加:读基本类型
```

```java
new DataInputStream(new BufferedInputStream(new FileInputStream("a.bin")));
```

每层只加一种能力，自由组合。这与第 15 章装饰器模式是同一结构。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 300" role="img" aria-label="IO 流层层包装：DataInputStream 包着 BufferedInputStream，再包着 FileInputStream">
    <rect x="6" y="6" width="748" height="288" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <text x="32" y="40" font-size="12.5" fill="var(--muted)">一个读取链的嵌套关系：外层向内层要数据</text>
    <rect x="32" y="58" width="696" height="170" rx="14" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="56" y="84" font-size="12.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)">DataInputStream</text>
    <text x="56" y="102" font-size="11" fill="var(--muted)">读 int / double 这类基本类型</text>
    <rect x="64" y="112" width="636" height="100" rx="12" fill="var(--panel)" stroke="var(--line)" />
    <text x="88" y="138" font-size="12.5" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)">BufferedInputStream</text>
    <text x="88" y="156" font-size="11" fill="var(--muted)">攒够一块再读，减少系统调用</text>
    <rect x="96" y="166" width="576" height="34" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="110" y="188" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" fill="var(--ink)">FileInputStream:最内层，字节真正的来源</text>
    <text x="32" y="256" font-size="12" fill="var(--ink)">关闭只关最外层：包装流会连带关掉它包着的那一层。</text>
    <text x="32" y="280" font-size="12" fill="var(--muted)">写入方向同理：先 Buffered 再 Data,flush 时数据才真正落到文件。</text>
  </svg>
  <figcaption>装饰器模式：每层只加一种能力，自由组合，顺序换一种就是一个新组合。</figcaption>
</figure>

## flush 与 close

- **flush**:把缓冲区数据强制写出，流仍可继续用；
- **close**:释放资源，通常先 flush 再关闭；关闭后不可再用。

用 try-with-resources(第 4 章)自动 close，避免泄漏。包装流关闭时会连带关闭被包装的内层流，只需关最外层。

## 小结

- 字节流 InputStream/OutputStream 处理二进制；字符流 Reader/Writer 处理文本；
- InputStreamReader/OutputStreamWriter 是编码桥，显式指定 UTF-8;
- read 返回实际长度、-1 为结束；循环读直到 -1;
- 装饰器层层包装叠加能力(缓冲、数据类型);
- flush 写出缓冲、close 释放；try-with-resources 自动关闭，关最外层即可。

下一篇讲缓冲的收益与序列化。