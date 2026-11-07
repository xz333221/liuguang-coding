package com.liuguang.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * 全局异常处理:把异常统一翻译成 HTTP 响应，别让每个 Controller 都写一遍 try-catch。
 *
 * <p>返回 ProblemDetail(RFC 9457)而不是自定义的错误体，
 * 客户端拿到的 status / title / detail 是标准字段。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BookNotFoundException.class)
    public ProblemDetail onNotFound(BookNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("书不存在");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    /** @Valid 校验没过时抛出:把每个字段的错误拼成一句话。 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail onInvalidBody(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("参数不合法");
        problem.setDetail(ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; ")));
        return problem;
    }
}
