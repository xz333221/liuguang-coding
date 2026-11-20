---
title: 异常体系:Error / Exception / Checked
summary: 'Java 用 Throwable 统一表示异常与错误:Error 是 JVM 层面的严重问题,Exception 是程序可处理的异常;checked 异常编译期强制处理,RuntimeException 与 Error 不强制。'
category: java
node: java-exception-hierarchy
order: 34
level: 入门
tags: [异常, Error, Exception, checked, RuntimeException]
updated: 2026-11-18
mindmap: java-exception-hierarchy.mindmap.json
terms: ["null", "reference-type", "runtime", "compile-time"]
sources:
  - title: 菜鸟教程 · Java 异常处理
    url: https://www.runoob.com/java/java-exceptions.html
    note: 异常体系分类与常见异常举例的对照。
  - title: Oracle Java 教程 · Exceptions
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html
    note: checked / unchecked 的划分与编译期强制处理的依据。
---

前面的章节里,程序出错时往往直接停下并打印一段堆栈。那段堆栈就是一个异常对象被抛出后留下的痕迹。这一篇先弄清 Java 把"出错"分成了哪几类,以及编译器对每一类的态度。

## Throwable:异常与错误的共同父类

Java 里所有能被抛出的对象都继承自 `Throwable`。它有两个直接子类,分工明确:

```text
Throwable
├── Error          JVM 层面的严重问题,程序通常无法恢复
└── Exception      程序可以捕获并处理的异常
    ├── RuntimeException   运行时异常(unchecked)
    └── 其余 Exception     受检异常(checked)
```

记住这个分法:Error 与 Exception 平级,RuntimeException 是 Exception 的子类。后面所有的规则都围绕这条继承链展开。

<figure class="lg-figure">
  <svg class="lg-diagram" viewBox="0 0 760 320" role="img" aria-label="Throwable 分出 Error 与 Exception,Exception 再分受检异常与 RuntimeException">
    <defs>
      <marker id="exArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
      </marker>
    </defs>
    <rect x="6" y="6" width="748" height="308" rx="20" fill="var(--panel)" stroke="var(--line-strong)" />
    <rect x="290" y="30" width="180" height="44" rx="10" fill="var(--canvas)" stroke="var(--line-strong)" />
    <text x="380" y="58" font-size="14" font-weight="700" fill="var(--ink)" text-anchor="middle">Throwable</text>
    <line x1="380" y1="74" x2="380" y2="96" stroke="var(--muted)" stroke-width="1.5" />
    <line x1="180" y1="96" x2="580" y2="96" stroke="var(--muted)" stroke-width="1.5" />
    <line x1="180" y1="96" x2="180" y2="118" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#exArrow)" />
    <line x1="580" y1="96" x2="580" y2="118" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#exArrow)" />
    <rect x="90" y="120" width="180" height="44" rx="10" fill="var(--canvas)" stroke="var(--line)" />
    <text x="180" y="148" font-size="14" font-weight="700" fill="var(--ink)" text-anchor="middle">Error</text>
    <text x="180" y="184" font-size="11.5" fill="var(--muted)" text-anchor="middle">JVM 层面,程序无力恢复</text>
    <rect x="490" y="120" width="180" height="44" rx="10" fill="var(--canvas)" stroke="var(--line)" />
    <text x="580" y="148" font-size="14" font-weight="700" fill="var(--ink)" text-anchor="middle">Exception</text>
    <line x1="580" y1="164" x2="580" y2="186" stroke="var(--muted)" stroke-width="1.5" />
    <line x1="380" y1="186" x2="700" y2="186" stroke="var(--muted)" stroke-width="1.5" />
    <line x1="380" y1="186" x2="380" y2="208" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#exArrow)" />
    <line x1="700" y1="186" x2="700" y2="208" stroke="var(--muted)" stroke-width="1.5" marker-end="url(#exArrow)" />
    <rect x="290" y="210" width="180" height="44" rx="10" fill="var(--canvas)" stroke="var(--line)" />
    <text x="380" y="238" font-size="13" font-weight="700" fill="var(--ink)" text-anchor="middle">RuntimeException</text>
    <text x="380" y="272" font-size="11.5" fill="var(--muted)" text-anchor="middle">非受检:编译器不强制处理</text>
    <rect x="610" y="210" width="180" height="44" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" stroke-opacity="0.55" />
    <text x="700" y="238" font-size="13" font-weight="700" fill="var(--ink)" text-anchor="middle">其他 Exception</text>
    <text x="700" y="272" font-size="11.5" fill="var(--muted)" text-anchor="middle">受检:不处理就编译不过</text>
  </svg>
  <figcaption>能 catch 的是 Exception;Error 与 RuntimeException 都不该靠 catch 兜住。</figcaption>
</figure>

## Error:JVM 层面的严重问题

Error 表示运行环境本身出了严重问题,例如:

- `OutOfMemoryError`:堆内存耗尽,无法再分配对象;
- `StackOverflowError`:方法调用层数过深,栈空间耗尽(常见于无终止条件的递归)。

这类问题不是业务逻辑能修复的,捕获它们通常没有意义。不要写 `catch (Error e)` 或 `catch (Throwable t)` 去兜底,那会把内存耗尽这类致命状态也吞掉,让程序带着损坏的状态继续运行。

## Exception:程序可以处理的异常

Exception 表示程序运行中可预期、可处理的意外情况,例如文件不存在、网络中断、参数非法。它再分成两类,区别在于**编译器是否强制你处理**。

### checked:编译期强制处理

除 RuntimeException 及其子类之外的 Exception 都是 checked 异常,典型如 `IOException`、`SQLException`、`ClassNotFoundException`。

编译器要求:调用一个声明了 checked 异常的方法时,要么用 try-catch 捕获,要么在自己的方法签名上用 throws 继续向上声明。两者都不做,编译报错:

```java
import java.io.FileReader;

public class Main {
    public static void main(String[] args) {
        // 编译错误:未处理 FileNotFoundException(checked)
        // FileReader r = new FileReader("a.txt");

        try {
            FileReader r = new FileReader("a.txt");
        } catch (java.io.FileNotFoundException e) {
            System.out.println("文件不存在:" + e.getMessage());
        }
    }
}
```

checked 的设计意图是:把"可预期但必须面对"的失败( IO、网络、数据库)写进方法契约,调用方无法假装它不存在。

### unchecked:RuntimeException

RuntimeException 及其子类是 unchecked 异常,编译器不强制处理。常见成员:

| 异常 | 典型触发 |
| --- | --- |
| NullPointerException | 对 null 引用调用实例方法 |
| ArrayIndexOutOfBoundsException | 数组下标越界 |
| ClassCastException | 向下转型到不兼容的类型 |
| ArithmeticException | 整数除零 |
| IllegalArgumentException | 参数不合法 |

这类异常大多代表**编程错误**:空引用没检查、下标算错、类型转错。正确的做法是修复代码逻辑,而不是到处 catch 把它们掩盖掉。

## 一张表对照

| 类别 | 继承自 | 编译期强制处理 | 典型例子 | 应对 |
| --- | --- | --- | --- | --- |
| Error | Throwable | 否 | OutOfMemoryError | 不捕获,排查环境 |
| checked Exception | Exception | 是 | IOException | 捕获或 throws 声明 |
| unchecked Exception | RuntimeException | 否 | NullPointerException | 修复逻辑 |

## 捕获还是向上抛

一个经验法则:在当前层能给出有意义的处理(重试、降级、提示用户)就捕获;处理不了就用 throws 交给上层,让知道上下文的人决定。最底层工具方法通常 throws,最外层入口( Controller、main)统一兜底记录日志。

不要捕获后什么都不做(空 catch),那等于把错误信息丢弃,后续排查会非常困难。

## 小结

- Throwable 分 Error 与 Exception;RuntimeException 是 Exception 的子类;
- Error 是 JVM 层面严重问题,不捕获;
- checked 异常编译期强制捕获或 throws 声明,代表可预期的外部失败;
- unchecked(RuntimeException)不强制,多代表编程错误,应修复而非掩盖;
- 能处理就捕获,处理不了就向上抛;禁止空 catch。

下一篇讲 try-catch-finally 的执行顺序,以及自动关闭资源的 try-with-resources。