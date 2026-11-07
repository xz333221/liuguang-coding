package com.liuguang.ddd.order.application;

import com.liuguang.ddd.order.application.command.PlaceOrderCommand;
import com.liuguang.ddd.order.application.view.OrderView;
import com.liuguang.ddd.order.domain.event.DomainEventPublisher;
import com.liuguang.ddd.order.domain.model.Order;
import com.liuguang.ddd.order.domain.model.OrderId;
import com.liuguang.ddd.order.domain.repository.OrderRepository;

/**
 * 应用服务:一个方法就是一个用例。
 *
 * <p>它只做四件事:取参数、调领域对象、存、发事件。
 * **这里不该出现 if (lines.size() > 20) 这类业务判断** —— 那是聚合根的活。
 * 它也不知道自己是被 HTTP、定时任务还是命令行调用的。
 */
public class OrderApplicationService {

    private final OrderRepository orders;
    private final DomainEventPublisher eventPublisher;

    public OrderApplicationService(OrderRepository orders, DomainEventPublisher eventPublisher) {
        this.orders = orders;
        this.eventPublisher = eventPublisher;
    }

    /** 下单:建聚合 → 加行 → 提交 → 存 → 发事件 */
    public OrderId place(PlaceOrderCommand command) {
        Order order = Order.draft(OrderId.newId(), command.customerId());
        command.lines().forEach(order::addLine);

        order.place();
        orders.save(order);
        publishEventsOf(order);

        return order.id();
    }

    /** 取消:取出聚合 → 调它的行为 → 存 */
    public void cancel(OrderId id) {
        Order order = orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在:" + id));
        order.cancel();
        orders.save(order);
        publishEventsOf(order);
    }

    /** 查详情:转成读模型,不把聚合根交出去 */
    public OrderView view(OrderId id) {
        Order order = orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在:" + id));
        return new OrderView(order.id().value(), order.status().name(),
                order.total().amount().toPlainString(), order.lines().size());
    }

    private void publishEventsOf(Order order) {
        order.pullEvents().forEach(eventPublisher::publish);
    }
}
