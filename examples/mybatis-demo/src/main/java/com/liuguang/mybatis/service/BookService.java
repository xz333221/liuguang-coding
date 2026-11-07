package com.liuguang.mybatis.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.liuguang.mybatis.entity.Book;
import com.liuguang.mybatis.mapper.BookMapper;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 服务层。
 *
 * <p>继承 ServiceImpl 就白拿一堆 save / getById / page / removeById,
 * 比自己对着 mapper 写一遍转调省事;真正的复杂查询仍然写在 XML 里。
 */
@Service
public class BookService extends ServiceImpl<BookMapper, Book> {

    /** 条件构造器写法:不写 SQL,但生成的仍然是一条 SQL(见控制台日志) */
    public Page<Book> pageByAuthor(String author, long pageNo, long size) {
        var query = Wrappers.<Book>lambdaQuery()
                .eq(author != null && !author.isBlank(), Book::getAuthor, author)
                .orderByDesc(Book::getCreatedAt);
        return page(new Page<>(pageNo, size), query);
    }

    /** 组合条件:括号里的 or 必须用 and(...) 包起来,否则和外面的条件连成一片 */
    public Page<Book> pageByKeyword(String keyword, boolean readOnly, long pageNo, long size) {
        var query = Wrappers.<Book>lambdaQuery();
        if (keyword != null && !keyword.isBlank()) {
            query.and(w -> w.like(Book::getTitle, keyword).or().like(Book::getAuthor, keyword));
        }
        query.eq(readOnly, Book::isRead, true).orderByDesc(Book::getCreatedAt);
        return page(new Page<>(pageNo, size), query);
    }

    /** 手写 SQL:动态 where 在 XML 里更直观,也就不去拼 wrapper 了 */
    public List<Book> search(String keyword, boolean readOnly) {
        return baseMapper.search(keyword, readOnly);
    }
}
