package com.liuguang.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 入参:只收请求里真正需要的那几个字段。
 *
 * <p>为什么不让 Controller 直接收实体对象?实体带着主键、创建时间这些
 * 由服务端决定的值，直接暴露出去会让调用方有机会伪造它们。
 * DTO 与实体分开，两端各自演进，互不牵连。
 */
public record BookRequest(
        @NotBlank(message = "书名不能为空")
        @Size(max = 120, message = "书名最多 120 个字")
        String title,

        @NotBlank(message = "作者不能为空")
        @Size(max = 80, message = "作者最多 80 个字")
        String author
) {
}
