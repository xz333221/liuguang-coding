package com.liuguang.ddd.order.application;

import com.liuguang.ddd.order.application.command.PlaceOrderCommand;
import com.liuguang.ddd.order.domain.event.OrderPlaced;
import com.liuguang.ddd.order.domain.model.Money;
import com.liuguang.ddd.order.domain.model.OrderId;
import com.liuguang.ddd.order.domain.model.OrderLine;
import com.liuguang.ddd.order.infrastructure.InMemoryOrderRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 应用层测试:仓储用真实的内存实现,事件发布换成"记下来"的假实现。
 * 不需要 Spring 容器,也不碰数据库。
 */
class OrderApplicationServiceTest {

    private final InMemoryOrderRepository orders = new InMemoryOrderRepository();
    private final List<Object> published = new ArrayList<>();
    private final OrderApplicationService service = new OrderApplicationService(orders, published::add);

    @Test
    void 下单之后能按id查到并且事件已经发布() {
        OrderId id = service.place(new PlaceOrderCommand("C-1", List.of(
                new OrderLine("SKU-1", Money.cny("10.00"), 1))));

        var view = service.view(id);
        assertEquals("PLACED", view.status());
        assertEquals("10.00", view.total());
        assertEquals(1, view.lineCount());

        assertEquals(1, published.size());
        assertInstanceOf(OrderPlaced.class, published.get(0));
    }

    @Test
    void 取消之后状态变成CANCELLED() {
        OrderId id = service.place(new PlaceOrderCommand("C-1", List.of(
                new OrderLine("SKU-1", Money.cny("10.00"), 1))));
        service.cancel(id);
        assertEquals("CANCELLED", service.view(id).status());
    }

    @Test
    void 取消不存在的订单抛异常() {
        assertThrows(IllegalArgumentException.class, () -> service.cancel(OrderId.newId()));
    }

    @Test
    void 空行列表下单会被聚合根拒绝() {
        assertThrows(IllegalStateException.class,
                () -> service.place(new PlaceOrderCommand("C-1", List.of())));
        assertTrue(published.isEmpty());
    }
}
