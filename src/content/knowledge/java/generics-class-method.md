---
title: 泛型类与泛型方法
summary: '泛型把类型变成参数:泛型类 Box<T> 与泛型方法 <T> T first(...) 让容器和工具在编译期带上类型约束,取出元素无需强转;List<String> 不是 List<Object> 的子类型。'
category: java
node: java-generics-class-method
order: 37
level: 进阶
tags: [泛型, 类型参数, 泛型类, 泛型方法]
updated: 2026-11-18
mindmap: java-generics-class-method.mindmap.json
terms: ["reference-type", "compile-time", "wrapper-class"]
sources:
  - title: Oracle Java 教程 · Generics
    url: https://docs.oracle.com/javase/tutorial/java/generics/
    note: 泛型动机、类型参数与泛型类/方法的讲法参照。
  - title: 菜鸟教程 · Java 泛型
    url: https://www.runoob.com/java/java-generics.html
    note: 泛型类与泛型方法示例的对照。
---

第 3 章的集合如果不用泛型,取出的元素都是 Object,每次都要强转,转错了运行时才报 ClassCastException。泛型把"装什么类型"变成编译期就能检查的约束。这一篇讲泛型类与泛型方法两种声明形式。

## 为什么需要泛型

没有泛型的写法:

```java
List list = new ArrayList();
list.add("hello");
String s = (String) list.get(0);   // 必须强转;若混入 Integer,这里运行时才报错
```

问题有二:取出要强转;类型错误推迟到运行时。泛型把检查提前到编译期:

```java
List<String> list = new ArrayList<>();
list.add("hello");
String s = list.get(0);            // 无需强转
// list.add(123);                  // 编译错误:类型不匹配
```

**类型参数**(type parameter)就是这里的 `String`:声明容器时填入的具体类型,编译器据此检查每一次 add / get。

## 泛型类:把类型参数写在类名后

```java
public class Box<T> {
    private T value;

    public void set(T value) {
        this.value = value;
    }

    public T get() {
        return value;
    }
}

Box<String> b = new Box<>();
b.set("hi");
String s = b.get();   // 编译期已知是 String
```

`T` 是类型参数占位符,在使用处被实参(String、Integer…)替换。同一个 Box 类可以实例化成多种类型,代码只写一份。

类型参数命名约定:`T` 通用类型、`E` 集合元素、`K`/`V` 键值、`R` 返回值。约定不是语法要求,但能显著提高可读性。

## 泛型方法:类型参数写在返回值前

类型参数也可以只作用于单个方法,与类是否泛型无关:

```java
public static <T> T first(List<T> list) {
    return list.get(0);
}

String s = first(List.of("a", "b"));      // T 推断为 String
Integer n = first(List.of(1, 2));         // T 推断为 Integer
```

`<T>` 声明在返回值类型之前,表示"这个方法自带一个类型参数"。调用时编译器通常能从实参推断 T,无需显式写 `Util.<String>first(...)`。

泛型类中的方法不一定泛型;非泛型类中也可以有泛型方法。两者独立。

## 泛型接口

接口同样可以带类型参数,实现时指定或继续保留:

```java
public interface Converter<S, T> {
    T convert(S source);
}

public class StringToInteger implements Converter<String, Integer> {
    public Integer convert(String s) {
        return Integer.parseInt(s);
    }
}
```

## 泛型与继承:List<String> 不是 List<Object> 的子类型

String 是 Object 的子类,但 `List<String>` **不是** `List<Object>` 的子类型。否则就能通过 List<Object> 的引用往 List<String> 里 add Integer,破坏类型安全:

```java
List<String> strs = new ArrayList<>();
// List<Object> objs = strs;   // 编译错误
// objs.add(123);              // 若允许, strs 里就混进了 Integer
```

数组则相反:`String[]` 是 `Object[]` 的子类型(协变),因此数组的类型错误只能在运行时抛 ArrayStoreException。这是数组与泛型集合的一个重要区别,也是优先用集合的理由之一。

需要"接受多种元素类型的列表"时,用通配符,下一篇讲。

## 小结

- 泛型把类型检查提前到编译期,取出元素无需强转;
- 泛型类 `class Box<T>`:类型参数作用于整个类;
- 泛型方法 `<T> T first(...)`:类型参数只作用于该方法,调用时多可推断;
- 类型参数命名约定 T/E/K/V/R;
- List<String> 不是 List<Object> 的子类型;数组协变、泛型不变,优先用集合。

下一篇讲通配符 ? extends 与 ? super,以及 PECS 原则。