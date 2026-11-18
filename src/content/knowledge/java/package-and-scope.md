---
title: 包与作用域
summary: '包给类一个全限定名,解决重名、组织代码;包名对应目录,import 只是简写。四种访问权限从小到大:private、包级、protected、public,作用域表要能默写。'
category: java
node: java-oop-package
order: 19
level: 入门
tags: [包, package, import, 访问权限, 作用域]
updated: 2026-11-18
mindmap: java-oop-package.mindmap.json
terms: ["classpath", "namespace"]
sources:
  - title: 廖雪峰 Java 教程 · 包
    url: https://liaoxuefeng.com/books/java/oop/basic/package/index.html
    note: 包名规范、import 与全限定名的讲解参照。
  - title: 廖雪峰 Java 教程 · 作用域
    url: https://liaoxuefeng.com/books/java/oop/basic/scope/index.html
    note: 四种访问权限的判定规则参照。
  - title: 菜鸟教程 · Java 包(package)
    url: https://www.runoob.com/java/java-package.html
    note: package 声明与目录结构对照。
---

项目里类一多,重名就来了:你写了个 util.StringUtil,引入的第三方库里也有个 StringUtil。Java 用包(package)解决这个问题:给每个类一个带命名空间的全名。

## package:类的全限定名

```java
package com.flowdash.util;

public class StringUtil {
    ...
}
```

package 声明必须是源文件的第一条语句(注释不算)。这个类的全限定名就是 `com.flowdash.util.StringUtil`,全 JVM 唯一。两个库都有 StringUtil 也不怕,全名不同,各用各的。

包名对应目录:com.flowdash.util 就是 com/flowdash/util 三层目录。编译时 `javac -d out` 会自动按包名建目录,运行时 JVM 按全限定名去 classpath 里找对应路径的 .class。包、目录、classpath 三者的关系,下一篇 classpath 和 jar 会串起来。

命名约定:域名倒过来写,全小写。公司域名 flowdash.cn,包就从 cn.flowdash 起头。域名全球唯一,包名跟着唯一。个人项目没有域名,用 io.github.用户名 也行。别用 java、javax 开头,那是标准库保留的。

## import:只是简写

没有 import 时,用别的包的类得写全名:

```java
com.flowdash.util.StringUtil.isEmpty("abc");
```

import 之后可以只写类名:

```java
import com.flowdash.util.StringUtil;

StringUtil.isEmpty("abc");
```

import 不引入任何代码,只是告诉编译器「我说的 StringUtil 指的是那个全名」。编译后的字节码里全是全限定名,import 在编译期就用完了。

几条规则:

- `java.lang` 包自动导入,String、System、Math、Integer 都不用写 import;
- 同包内的类互相使用也不用 import;
- `import java.util.*` 是通配导入,只导入该包下的类,**不含子包**;
- 两个包的同名类都 import 会冲突,这时留一个 import,另一个写全名。

还有 `import static`,导入某个类的静态成员,之后可以直接用成员名调用:

```java
import static java.lang.Math.*;

double x = sqrt(2) + pow(2, 10);   // 不用写 Math.
```

少量数学常量用用可以,大面积用会让读者不知道方法来自哪个类,克制。

## 四种访问权限

Java 的访问修饰符从小到大四档:private、不写(包级)、protected、public。作用范围:

| 修饰符 | 本类 | 同包 | 子类(跨包) | 任何地方 |
|---|---|---|---|---|
| private | ✓ | ✗ | ✗ | ✗ |
| 不写(包级) | ✓ | ✓ | ✗ | ✗ |
| protected | ✓ | ✓ | ✓ | ✗ |
| public | ✓ | ✓ | ✓ | ✓ |

几个容易记错的点:

- protected 对**同包**也开放,不只是子类。它比包级多开的那一档,是「跨包的子类」;
- 子类访问父类的 protected 成员,是通过子类自己的实例访问,不能通过一个父类实例访问它的 protected 成员(跨包时);
- 不写修饰符不是「默认 public」,是包级私有,包外完全不可见。

类本身(顶层类)只能用 public 或不写:public 类全 JVM 可见,包级类只在包内可见。顶层类写 private、protected 编译报错——类没有「外层类」和「父类」可言,这两档对它没意义。内部类的修饰符另说,内部类那篇讲。

选权限的原则就一句:**能小不大**。字段一律 private 起步,方法按需要暴露,类按需要 public。暴露出去的都是承诺,收回来就是破坏兼容。

## 包级私有的用处

不写修饰符的包级访问,是组织模块内部代码的好工具:一个包里,对外只 public 少数几个入口类,其余类全用包级私有。包外的代码根本看不到它们,内部怎么重构都不影响外面。后面讲模块时,这层「包内可见」还会被模块再收紧一道。

## 小结

- 包给类全限定名,解决重名;包名对应目录,约定用倒置域名全小写;
- import 只是编译期简写,java.lang 与同包自动可见,通配不含子包;
- 四档权限:private → 包级 → protected → public;protected 对同包和跨包子类开放;
- 顶层类只能 public 或包级;权限能小不大,暴露即承诺。