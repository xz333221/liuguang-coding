package com.liuguang.demo.controller;

import com.liuguang.demo.dto.BookRequest;
import com.liuguang.demo.model.Book;
import com.liuguang.demo.service.BookService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 接口层:只做 HTTP 那点事 —— 路由、参数绑定、状态码。
 *
 * <p>@RestController = @Controller + @ResponseBody，
 * 返回的对象由 Jackson 直接序列化成 JSON，不需要手动拼字符串。
 * 业务规则一行都不写在这里，全部交给 Service。
 */
@RestController
@RequestMapping("/api/books")
public class BookController {

    private final BookService service;

    public BookController(BookService service) {
        this.service = service;
    }

    @GetMapping
    public List<Book> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Book detail(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Book create(@RequestBody @Valid BookRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}/read")
    public Book markRead(@PathVariable Long id) {
        return service.markRead(id);
    }
}
