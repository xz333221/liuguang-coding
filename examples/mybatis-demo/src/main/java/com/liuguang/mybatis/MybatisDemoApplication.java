package com.liuguang.mybatis;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 启动类。
 *
 * <p>@MapperScan 把包下所有 Mapper 接口注册成 Bean。
 * 不写它也行 —— 在每个接口上加 @Mapper 同样能扫到,但接口一多,
 * 统一在启动类上写一行更省事。两种方式都别再配 XML 里的 mapper 扫描。
 */
@SpringBootApplication
@MapperScan("com.liuguang.mybatis.mapper")
public class MybatisDemoApplication {

    public static void main(String[] args) {
        SpringApplication.run(MybatisDemoApplication.class, args);
    }
}
