package com.liuguang.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 启动类:整个应用的唯一入口。
 *
 * <p>@SpringBootApplication 一个注解顶三个:
 * <ul>
 *   <li>@SpringBootConfiguration —— 声明这是配置类(内部就是 @Configuration)</li>
 *   <li>@EnableAutoConfiguration —— 按 classpath 上的依赖去猜要装配什么</li>
 *   <li>@ComponentScan —— 从本类所在包开始向下扫 @Component / @Service / @Repository / @Controller</li>
 * </ul>
 * 所以启动类必须放在最外层的包(com.liuguang.demo)下面，
 * 否则子包里的类扫不到，注入时会报"找不到 Bean"。
 */
@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
