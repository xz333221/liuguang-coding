package com.liuguang.mybatis.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MyBatis-Plus 的插件装配。
 *
 * <p>分页不是"MP 自带就会"的:没装 PaginationInnerInterceptor 时,
 * selectPage 不会发 count 语句,limit 也不会被改写 —— 这是最常见的"分页为什么不对"。
 *
 * <p>DbType 用来选方言:换 MySQL 改成 DbType.MYSQL 即可。
 */
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.H2));
        return interceptor;
    }
}
