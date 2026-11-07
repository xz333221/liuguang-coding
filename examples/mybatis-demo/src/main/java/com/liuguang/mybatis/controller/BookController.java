package com.liuguang.mybatis.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.liuguang.mybatis.entity.Book;
import com.liuguang.mybatis.service.BookService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;

    public BookController(BookService service) {
        this.service = service;
    }

    /** 条件构造器 + 分页插件 */
    @GetMapping
    public Page<Book> page(@RequestParam(required = false) String author,
                           @RequestParam(defaultValue = "1") long page,
                           @RequestParam(defaultValue = "3") long size) {
        return service.pageByAuthor(author, page, size);
    }

    /** 关键字 + 已读筛选:走 XML 里的动态 SQL */
    @GetMapping("/search")
    public List<Book> search(@RequestParam String keyword,
                             @RequestParam(defaultValue = "false") boolean readOnly) {
        return service.search(keyword, readOnly);
    }

    /** 组合条件(括号里的 or)用 wrapper 拼,顺便验证分页 */
    @GetMapping("/page-by-keyword")
    public Page<Book> pageByKeyword(@RequestParam String keyword,
                                    @RequestParam(defaultValue = "false") boolean readOnly,
                                    @RequestParam(defaultValue = "1") long page,
                                    @RequestParam(defaultValue = "3") long size) {
        return service.pageByKeyword(keyword, readOnly, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book create(@RequestBody Book book) {
        // created_at / updated_at 由 MetaObjectHandler 自动填,deleted 由逻辑删除默认值补上
        service.save(book);
        return book;
    }

    /** 逻辑删除:这里不会真的 delete,实际执行 update book set deleted = 1 */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.removeById(id);
    }
}
