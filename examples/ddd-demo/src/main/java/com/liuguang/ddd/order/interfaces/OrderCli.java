package com.liuguang.ddd.order.interfaces;

import com.liuguang.ddd.order.application.OrderApplicationService;
import com.liuguang.ddd.order.application.command.PlaceOrderCommand;
import com.liuguang.ddd.order.domain.event.DomainEventPublisher;
import com.liuguang.ddd.order.domain.model.Money;
import com.liuguang.ddd.order.domain.model.OrderId;
import com.liuguang.ddd.order.domain.model.OrderLine;
import com.liuguang.ddd.order.domain.repository.OrderRepository;
import com.liuguang.ddd.order.infrastructure.ConsoleEventPublisher;
import com.liuguang.ddd.order.infrastructure.InMemoryOrderRepository;

import java.util.List;

/**
 * 接口层:这次用命令行代替 HTTP。
 *
 * <p>它的活只有两件:装配依赖(选哪个仓储实现)、把输入翻译成命令。
 * 换成 Controller 时,业务逻辑一行都不用搬家。
 */
public final class OrderCli {

    private OrderCli() {
    }

    public static void main(String[] args) {
        OrderRepository orders = new InMemoryOrderRepository();
        DomainEventPublisher publisher = new ConsoleEventPublisher();
        OrderApplicationService service = new OrderApplicationService(orders, publisher);

        PlaceOrderCommand command = new PlaceOrderCommand("C-1001", List.of(
                new OrderLine("SKU-1", Money.cny("39.90"), 2),
                new OrderLine("SKU-2", Money.cny("12.50"), 1)));

        OrderId id = service.place(command);
        System.out.println("下单成功:" + service.view(id));

        service.cancel(id);
        System.out.println("取消之后:" + service.view(id));
    }
}
