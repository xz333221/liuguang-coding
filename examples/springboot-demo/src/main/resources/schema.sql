-- 表结构放在 schema.sql 而不是靠 Hibernate 自动生成:
-- 谁改了表，代码评审里看得见;生产要人工核对，也不敢让它自己动。
CREATE TABLE IF NOT EXISTS book (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    author     VARCHAR(80)  NOT NULL,
    read_flag  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL
);
