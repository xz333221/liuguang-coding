package com.liuguang.ddd.order.infrastructure;

import com.liuguang.ddd.order.domain.model.Order;
import com.liuguang.ddd.order.domain.model.OrderId;
import com.liuguang.ddd.order.domain.repository.OrderRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * 仓储实现:内存版。
 *
 * <p>示例里不做真的持久化,所以"存进去"和"取出来"是同一个对象引用 ——
 * 真接数据库时这里要做的是"聚合 ↔ 行"的翻译,业务代码一行不用改。
 */
public class InMemoryOrderRepository implements OrderRepository {

    private final Map<OrderId, Order> store = new HashMap<>();

    @Override
    public void save(Order order) {
        store.put(order.id(), order);
    }

    @Override
    public Optional<Order> findById(OrderId id) {
        return Optional.ofNullable(store.get(id));
    }
}
