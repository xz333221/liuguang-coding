package com.liuguang.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 测试放在 src/test/java:A 不走 mvn package 就不会进产物，
 * 也不会跟着打进 jar 包。生产代码与测试代码同包同路径，找起来不用切换目录。
 *
 * <p>@SpringBootTest 会把整个容器起起来，@AutoConfigureMockMvc 再挂上
 * 一个不用真连网络的 MockMvc —— 请求从 Controller 一路走到内存库，
 * 中间全是真实的 Bean，只少了那个真实的 HTTP 连接。
 */
@SpringBootTest
@AutoConfigureMockMvc
class BookControllerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void 新增一本书再查回来() throws Exception {
        mvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "代码整洁之道", "author": "Robert C. Martin"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.read").value(false));

        mvc.perform(get("/api/books"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.title == '代码整洁之道')]").exists());
    }

    @Test
    void 查不存在的书返回404() throws Exception {
        mvc.perform(get("/api/books/99999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("书不存在"));
    }

    @Test
    void 书名为空返回400() throws Exception {
        mvc.perform(post("/api/books")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "  ", "author": "谁"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("title: 书名不能为空"));
    }
}
