package com.liuguang.mybatis.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.liuguang.mybatis.entity.Book;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * Mapper 接口:MyBatis 与 MyBatis-Plus 的交汇点。
 *
 * <p>继承 BaseMapper 之后,selectById / selectList / insert / updateById / deleteById
 * 这些 CRUD 由 MyBatis-Plus 直接提供,不用写 SQL;
 * 而下面这个 search 是纯 MyBatis 的:接口里只有签名,SQL 在 BookMapper.xml 里。
 *
 * <p>两套东西共存不冲突 —— BaseMapper 的方法名是固定的,自定义方法名只要别撞上就行。
 */
public interface BookMapper extends BaseMapper<Book> {

    /**
     * 手写 SQL(见 resources/mapper/BookMapper.xml)。
     * 多个参数必须用 @Param 起名,XML 里才拿得到 keyword / readOnly。
     */
    List<Book> search(@Param("keyword") String keyword,
                      @Param("readOnly") boolean readOnly);
}
