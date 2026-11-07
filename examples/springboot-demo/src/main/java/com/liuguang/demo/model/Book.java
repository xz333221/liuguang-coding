package com.liuguang.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 实体:和数据库表一一对应的 Java 类。
 *
 * <p>它只描述"数据长什么样"，不写 SQL、也不写业务规则。
 * 编译期由 JPA 校验字段与表结构;运行期由 Hibernate 负责读写。
 */
@Entity
@Table(name = "book")
public class Book {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 80)
    private String author;

    @Column(name = "read_flag", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** JPA 需要一个无参构造器来反射创建实例，业务代码请用下面那个。 */
    protected Book() {
    }

    public Book(String title, String author, Instant createdAt) {
        this.title = title;
        this.author = author;
        this.createdAt = createdAt;
        this.read = false;
    }

    /** 实体上也只放"状态怎么变"这一条规则，不改外部状态、不查库。 */
    public void markRead() {
        this.read = true;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getAuthor() {
        return author;
    }

    public boolean isRead() {
        return read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
