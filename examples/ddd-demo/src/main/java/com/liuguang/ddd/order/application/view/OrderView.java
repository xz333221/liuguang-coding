package com.liuguang.ddd.order.application.view;

/**
 * 出参:给外部看的订单摘要。
 *
 * <p>不复用 Order:聚合根暴露出去,外部就能绕过规则改它。
 * 读模型跟写模型分开,也方便以后查询走另一个数据源。
 */
public record OrderView(String id, String status, String total, int lineCount) {
}
