package com.liuguang.ddd.order.domain;

import com.liuguang.ddd.order.domain.event.OrderPlaced;
import com.liuguang.ddd.order.domain.model.Money;
import com.liuguang.ddd.order.domain.model.Order;
import com.liuguang.ddd.order.domain.model.OrderId;
import com.liuguang.ddd.order.domain.model.OrderLine;
import com.liuguang.ddd.order.domain.model.OrderStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** 领域层的测试不需要任何框架:构造对象、调行为、断言。 */
class OrderTest {

    private static OrderLine line(String amount, int quantity) {
        return new OrderLine("SKU-1", Money.cny(amount), quantity);
    }

    @Test
    void 空订单不能提交() {
        Order order = Order.draft(OrderId.newId(), "C-1");
        assertThrows(IllegalStateException.class, order::place);
    }

    @Test
    void 总价按行累加() {
        Order order = Order.draft(OrderId.newId(), "C-1");
        order.addLine(line("39.90", 2));
        order.addLine(new OrderLine("SKU-2", Money.cny("12.50"), 1));
        assertEquals("92.30", order.total().amount().toPlainString());
    }

    @Test
    void 超过二十行被聚合根拦下() {
        Order order = Order.draft(OrderId.newId(), "C-1");
        for (int i = 0; i < 20; i++) {
            order.addLine(line("1.00", 1));
        }
        assertThrows(IllegalStateException.class, () -> order.addLine(line("1.00", 1)));
    }

    @Test
    void 提交之后不能再加商品() {
        Order order = Order.draft(OrderId.newId(), "C-1");
        order.addLine(line("9.90", 1));
        order.place();
        assertThrows(IllegalStateException.class, () -> order.addLine(line("1.00", 1)));
    }

    @Test
    void 提交会留下一条领域事件() {
        Order order = Order.draft(OrderId.newId(), "C-1");
        order.addLine(line("9.90", 1));
        order.place();

        var events = order.pullEvents();
        assertEquals(1, events.size());
        assertInstanceOf(OrderPlaced.class, events.get(0));

        // 取走之后聚合里不该再攒着
        assertEquals(0, order.pullEvents().size());
        assertEquals(OrderStatus.PLACED, order.status());
    }
}
