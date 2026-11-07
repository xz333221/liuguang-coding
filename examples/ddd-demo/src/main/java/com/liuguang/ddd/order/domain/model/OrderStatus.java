package com.liuguang.ddd.order.domain.model;

/** 订单状态。状态流转的合法性写在聚合根里,枚举本身只负责"有哪些状态"。 */
public enum OrderStatus {
    DRAFT,
    PLACED,
    CANCELLED
}
