-- 示例数据:每次启动都插一遍，所以用 MERGE 写成幂等的，重启不会重复。
MERGE INTO book (id, title, author, read_flag, created_at) KEY (id)
VALUES (1, '深入理解 Java 虚拟机', '周志明', FALSE, CURRENT_TIMESTAMP);
