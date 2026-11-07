package com.liuguang.app;

import com.liuguang.common.Text;

/**
 * 入口模块:依赖 common,把它打成一个能 java -jar 跑的包。
 */
public final class App {

    private App() {
    }

    public static void main(String[] args) {
        System.out.println(slugOf(args));
    }

    static String slugOf(String[] args) {
        String title = args.length > 0 ? String.join(" ", args) : "Maven, Hello";
        return Text.slug(title);
    }
}
