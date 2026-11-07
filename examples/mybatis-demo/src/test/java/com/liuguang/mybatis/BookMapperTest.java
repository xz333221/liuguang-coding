package com.liuguang.mybatis;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.liuguang.mybatis.entity.Book;
import com.liuguang.mybatis.mapper.BookMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 同时验证两条路:MyBatis-Plus 的条件构造器,和 XML 里的手写 SQL。
 *
 * <p>@SpringBootTest 起真容器,连的是 H2 内存库(schema.sql + data.sql 已执行)。
 */
@SpringBootTest
class BookMapperTest {

    @Autowired
    private BookMapper mapper;

    /** 直接查库,用来证明"逻辑删除只改标记、不删行" */
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void 条件构造器按作者查() {
        List<Book> books = mapper.selectList(
                Wrappers.<Book>lambdaQuery().eq(Book::getAuthor, "周志明"));
        assertEquals(1, books.size());
        assertEquals("深入理解 Java 虚拟机", books.get(0).getTitle());
    }

    @Test
    void XML里的动态SQL按关键字与已读筛选() {
        assertEquals(2, mapper.search("Java", false).size());
        assertEquals(1, mapper.search("Java", true).size());
    }

    @Test
    void 分页插件会发count语句并改写limit() {
        Page<Book> page = mapper.selectPage(
                new Page<>(1, 2),
                Wrappers.<Book>lambdaQuery().orderByDesc(Book::getId));
        assertEquals(3, page.getTotal());
        assertEquals(2, page.getRecords().size());
    }

    @Test
    void 逻辑删除只把标记改成1() {
        Book book = new Book();
        book.setTitle("临时书");
        book.setAuthor("测试");
        mapper.insert(book);

        Long id = book.getId();
        assertNotNull(id);
        // 自动填充生效:插入时 created_at 被填上了
        assertNotNull(mapper.selectById(id).getCreatedAt());

        mapper.deleteById(id);
        assertNull(mapper.selectById(id));
        assertEquals(1, jdbc.queryForObject("select count(*) from book where id = ?", Integer.class, id));
        assertEquals(1, jdbc.queryForObject("select deleted from book where id = ?", Integer.class, id));
    }

    @Test
    void 手写SQL也要自己带deleted等于0() {
        Book book = new Book();
        book.setTitle("待删除的书");
        book.setAuthor("测试");
        mapper.insert(book);
        mapper.deleteById(book.getId());

        // search 的 where 里写了 deleted = 0,所以刚逻辑删除的这条查不出来;
        // MP 自己的 CRUD 会自动加这个条件,手写 SQL 得自己记得。
        assertTrue(mapper.search("待删除", false).isEmpty());
    }
}
