package com.liuguang.ddd.order.infrastructure;

import com.liuguang.ddd.order.domain.event.DomainEventPublisher;

/**
 * 事件发布的实现:示例里打到控制台。
 *
 * <p>换成消息队列时,只换这个类;应用服务与领域层不用动。
 */
public class ConsoleEventPublisher implements DomainEventPublisher {

    @Override
    public void publish(Object event) {
        System.out.println("[领域事件] " + event);
    }
}
