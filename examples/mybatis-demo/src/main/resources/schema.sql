CREATE TABLE IF NOT EXISTS book (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(120) NOT NULL,
    author     VARCHAR(80)  NOT NULL,
    read_flag  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL,
    updated_at TIMESTAMP    NOT NULL,
    deleted    INT          NOT NULL DEFAULT 0
);
