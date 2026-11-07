package com.liuguang.ddd.order.domain.model;

import java.util.UUID;

/**
 * 值对象:订单号。
 *
 * <p>为什么不为一个 String 单独立一个类?因为它有校验(不能为空),
 * 而且方法签名里写 {@code OrderId} 比写 {@code String} 更不容易传错参数 ——
 * 客户 id 也是 String,两个 String 换位置编译器不会拦你。
 */
public record OrderId(String value) {

    public OrderId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("订单号不能为空");
        }
    }

    public static OrderId newId() {
        return new OrderId("ORD-" + UUID.randomUUID().toString().substring(0, 8));
    }

    @Override
    public String toString() {
        return value;
    }
}
