package com.liuguang.common;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * 工具模块:把标题转成 slug —— 小写、去标点、空格换成连字符。
 *
 * <p>它跟 app 拆成两个模块,是为了演示"模块之间靠坐标依赖",
 * 而不是把两个类的项目硬凑在一起。
 */
public final class Text {

    private Text() {
    }

    public static String slug(String title) {
        return Arrays.stream(title.trim().toLowerCase().split("[^a-z0-9]+"))
                .filter(part -> !part.isEmpty())
                .collect(Collectors.joining("-"));
    }
}
