package com.liuguang.demo.exception;

/**
 * 业务异常:表达"这个请求本身是合法的，但索要的东西不存在"。
 *
 * <p>不继承 ResponseStatusException，是为了让异常与 HTTP 解耦 ——
 * 翻译成 404 这件事交给 GlobalExceptionHandler 做。
 */
public class BookNotFoundException extends RuntimeException {

    public BookNotFoundException(Long id) {
        super("没有 id 为 " + id + " 的书");
    }
}
