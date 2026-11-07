package com.liuguang.ddd.order.domain.model;

/**
 * 实体:订单里的一行商品。
 *
 * <p>它在聚合内部有身份(靠 sku 区分),但**只能通过聚合根来改** ——
 * 外部拿不到它来 set 数量,这是"聚合根管住内部对象"的边界。
 */
public record OrderLine(String sku, Money unitPrice, int quantity) {

    public OrderLine {
        if (sku == null || sku.isBlank()) {
            throw new IllegalArgumentException("商品编号不能为空");
        }
        if (unitPrice == null) {
            throw new IllegalArgumentException("单价不能为空");
        }
        if (quantity <= 0) {
            throw new IllegalArgumentException("数量必须大于 0");
        }
    }

    public Money amount() {
        return unitPrice.times(quantity);
    }
}
