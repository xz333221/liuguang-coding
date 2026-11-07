package com.liuguang.app;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AppTest {

    @Test
    void 不给参数时用默认标题() {
        assertEquals("maven-hello", App.slugOf(new String[0]));
    }

    @Test
    void 多个参数按空格拼起来() {
        assertEquals("build-tools", App.slugOf(new String[]{"Build", "Tools"}));
    }
}
