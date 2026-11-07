package com.liuguang.common;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** 测试放在 src/test/java,由 surefire 插件在 test 阶段跑。 */
class TextTest {

    @Test
    void 转小写并去掉标点() {
        assertEquals("hello-world", Text.slug("Hello, World!"));
    }

    @Test
    void 首尾空白不影响结果() {
        assertEquals("maven-4-0-0", Text.slug("  Maven 4.0.0  "));
    }
}
