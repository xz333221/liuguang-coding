package com.liuguang.ddd.order.domain.repository;

import com.liuguang.ddd.order.domain.model.Order;
import com.liuguang.ddd.order.domain.model.OrderId;

import java.util.Optional;

/**
 * 仓储接口:领域层声明"我要怎么取、怎么存"。
 *
 * <p>接口之所以放在 domain 而不是 infrastructure,是因为**用它的地方在领域/应用层**。
 * 实现才是 infra 的事:换成数据库、换成内存、换成远程服务,都不用改业务代码。
 * 仓储不该有 findAll / 分页这类给页面用的方法 —— 那是查询,不是领域需要。
 */
public interface OrderRepository {

    void save(Order order);

    Optional<Order> findById(OrderId id);
}
