package com.liuguang.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * 配置类:把"可以替换的基础设施"声明成 Bean。
 *
 * <p>时间为什么也要做成 Bean?因为测试里可以换成 Clock.fixed(...)，
 * 让"创建时间"变成固定值，断言才写得稳。这类没法 mock 的静态调用
 * (Instant.now())都可以这样收进来。
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
