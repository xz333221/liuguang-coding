package com.liuguang.ddd.order.domain.event;

/**
 * 发布事件的能力。
 *
 * <p>接口放在领域层,实现放在基础设施层 —— 领域层只关心"有事要发",
 * 发到内存、日志、消息队列都由外面决定。这就是依赖倒置。
 */
public interface DomainEventPublisher {

    void publish(Object event);
}
