package com.liuguang.ddd.order.domain.model;

import java.math.BigDecimal;
import java.util.Objects;

/**
 * 值对象:金额。
 *
 * <p>不可变、自我校验、没有 id —— 两个 39.90 的 Money 就是同一个东西。
 * 把"不能为负、不能混币种"这些规则收在这里,别让它们散落在各个 Service 里。
 */
public record Money(BigDecimal amount, String currency) {

    public Money {
        Objects.requireNonNull(amount, "金额不能为空");
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("金额不能为负:" + amount);
        }
        if (currency == null || currency.isBlank()) {
            throw new IllegalArgumentException("币种不能为空");
        }
    }

    public static Money cny(String amount) {
        return new Money(new BigDecimal(amount), "CNY");
    }

    public static Money zero(String currency) {
        return new Money(BigDecimal.ZERO, currency);
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(amount.add(other.amount), currency);
    }

    public Money times(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("数量必须大于 0");
        }
        return new Money(amount.multiply(BigDecimal.valueOf(quantity)), currency);
    }

    private void requireSameCurrency(Money other) {
        Objects.requireNonNull(other, "金额不能为空");
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException("币种不一致:" + currency + " / " + other.currency);
        }
    }
}
