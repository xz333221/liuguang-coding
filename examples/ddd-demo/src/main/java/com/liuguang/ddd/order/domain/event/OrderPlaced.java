package com.liuguang.ddd.order.domain.event;

import com.liuguang.ddd.order.domain.model.Money;
import com.liuguang.ddd.order.domain.model.OrderId;

import java.time.Instant;

/**
 * 领域事件:一件事已经发生了。
 *
 * <p>命名用过去时(OrderPlaced 而不是 PlaceOrder),因为它是"结果"不是"请求"。
 * 这里只声明发生了什么,怎么发、发给谁,不归领域层管。
 */
public record OrderPlaced(OrderId orderId, String customerId, Money total, Instant occurredAt) {
}
