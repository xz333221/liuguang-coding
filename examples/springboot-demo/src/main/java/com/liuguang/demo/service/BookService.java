package com.liuguang.demo.service;

import com.liuguang.demo.dto.BookRequest;
import com.liuguang.demo.exception.BookNotFoundException;
import com.liuguang.demo.model.Book;
import com.liuguang.demo.repository.BookRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

/**
 * 服务层:业务规则都放这里。
 *
 * <p>它不碰 HTTP(不知道有 request / response 这回事)，
 * 也不写 SQL(那是 Repository 的活)。
 * 想换一种调用方式(定时任务、消息队列)复用这套逻辑，直接调这里就行。
 */
@Service
public class BookService {

    private final BookRepository books;
    private final Clock clock;

    /** 构造器注入:依赖写在构造器参数上，字段可以 final，也不依赖反射改私有字段。 */
    public BookService(BookRepository books, Clock clock) {
        this.books = books;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Book> findAll() {
        return books.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Transactional(readOnly = true)
    public Book findById(Long id) {
        return books.findById(id).orElseThrow(() -> new BookNotFoundException(id));
    }

    @Transactional
    public Book create(BookRequest request) {
        Book book = new Book(request.title().trim(), request.author().trim(), clock.instant());
        return books.save(book);
    }

    @Transactional
    public Book markRead(Long id) {
        Book book = findById(id);
        book.markRead();
        return book; // 处于事务里，方法结束后 Hibernate 会把改动刷进数据库
    }
}
