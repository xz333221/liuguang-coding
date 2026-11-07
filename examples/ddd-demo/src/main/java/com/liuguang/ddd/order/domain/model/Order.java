package com.liuguang.ddd.order.domain.model;

import com.liuguang.ddd.order.domain.event.OrderPlaced;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * 聚合根:订单。
 *
 * <p>它是一致性的边界 —— 外部只能通过它的方法来改内部状态,
 * 所以"空订单不能提交""最多 20 行""提交后不能再加商品"这些不变式
 * 只需要在一处守,永远不会出现"某个 Service 忘了校验"。
 *
 * <p>领域事件也是它产生的:事情发生在聚合里,由应用层取走并发布。
 */
public class Order {

    /** 业务规则,不是配置项:改它要改代码、走评审,所以写成常量 */
    private static final int MAX_LINES = 20;

    private final OrderId id;
    private final String customerId;
    private final List<OrderLine> lines = new ArrayList<>();
    private final List<Object> pendingEvents = new ArrayList<>();
    private OrderStatus status = OrderStatus.DRAFT;

    private Order(OrderId id, String customerId) {
        this.id = Objects.requireNonNull(id);
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("客户不能为空");
        }
        this.customerId = customerId;
    }

    /** 建单只能从这里进,不给公开构造器,也不给 setStatus */
    public static Order draft(OrderId id, String customerId) {
        return new Order(id, customerId);
    }

    public void addLine(OrderLine line) {
        requireStatus(OrderStatus.DRAFT, "只有草稿状态能加商品");
        if (lines.size() >= MAX_LINES) {
            throw new IllegalStateException("一个订单最多 " + MAX_LINES + " 行商品");
        }
        lines.add(Objects.requireNonNull(line));
    }

    public void place() {
        requireStatus(OrderStatus.DRAFT, "订单已经提交或已取消");
        if (lines.isEmpty()) {
            throw new IllegalStateException("空订单不能提交");
        }
        status = OrderStatus.PLACED;
        pendingEvents.add(new OrderPlaced(id, customerId, total(), Instant.now()));
    }

    public void cancel() {
        requireStatus(OrderStatus.PLACED, "只有已提交的订单能取消");
        status = OrderStatus.CANCELLED;
    }

    public Money total() {
        return lines.stream()
                .map(OrderLine::amount)
                .reduce(Money.zero("CNY"), Money::plus);
    }

    /** 应用层取走事件:聚合只攒着,不负责发出去(发到哪是基础设施的事) */
    public List<Object> pullEvents() {
        List<Object> events = List.copyOf(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    private void requireStatus(OrderStatus expected, String message) {
        if (status != expected) {
            throw new IllegalStateException(message + ",当前状态:" + status);
        }
    }

    public OrderId id() {
        return id;
    }

    public String customerId() {
        return customerId;
    }

    public OrderStatus status() {
        return status;
    }

    public List<OrderLine> lines() {
        return List.copyOf(lines);
    }
}
