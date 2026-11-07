package com.liuguang.ddd.order.application.command;

import com.liuguang.ddd.order.domain.model.OrderLine;

import java.util.List;

/**
 * 入参:一次"下单"用例需要的东西。
 *
 * <p>它是应用层的东西,不是领域对象 —— 领域对象(Order)是执行过程产生的结果。
 */
public record PlaceOrderCommand(String customerId, List<OrderLine> lines) {

    public PlaceOrderCommand {
        lines = lines == null ? List.of() : List.copyOf(lines);
    }
}
