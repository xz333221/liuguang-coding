# maven-demo

流光知识库「Maven:坐标、生命周期与多模块」的配套示例。
一个父工程 + 两个模块:common(工具类)、app(入口,依赖 common)。

## 目录

```
maven-demo/
├─ pom.xml                     父工程:modules 聚合 + dependencyManagement 管版本
├─ common/
│  ├─ pom.xml                 继承父工程,只声明自己的 artifactId 与依赖
│  └─ src/
│     ├─ main/java/com/liuguang/common/Text.java
│     └─ test/java/com/liuguang/common/TextTest.java
├─ app/
│  ├─ pom.xml                 依赖 common;shade 插件把依赖打成一个胖包
│  └─ src/
│     ├─ main/java/com/liuguang/app/App.java
│     └─ test/java/com/liuguang/app/AppTest.java
└─ (每个模块构建后各出一个 target/)
```

## 命令

```bash
mvn -v                                  # 版本与 JDK
mvn clean                               # 删掉各模块的 target
mvn package                             # 编译 + 测试 + 打包(父工程会按顺序构建两个模块)
mvn -pl app -am package                 # 只构建 app 及其依赖的模块
mvn -pl common test -Dtest=TextTest     # 只跑某个测试
mvn dependency:tree                     # 打印依赖树(排冲突时先看这个)
mvn install                             # 装进本地仓库 ~/.m2,别的工程才能引用 1.0.0
```

打包之后:

```bash
java -jar app/target/app-1.0.0.jar "Hello, Maven"
# 输出 hello-maven
```

多模块依赖在 `package` 阶段用的是 **reactor** 里的兄弟模块,不需要先 `install`;
但如果换到仓库里另一个工程去引用 `com.liuguang:common:1.0.0`,就必须先 `mvn install`。

## 这个例子想说明的几件事

- `packaging=pom` 的父工程不产出 jar,它只负责"有哪些模块"和"版本与插件怎么管"。
- `dependencyManagement` 只定版本不引入依赖;子模块写依赖时不写 `<version>`。
- `scope=test` 的 junit 不会进运行时 classpath。
- 插件的 `goal` 绑到 `phase` 上,`mvn package` 才会真的执行 shade。
