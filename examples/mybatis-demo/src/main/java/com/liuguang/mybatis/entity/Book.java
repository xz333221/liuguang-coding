package com.liuguang.mybatis.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

/**
 * 实体:一张表一个类。
 *
 * <p>注解是给 MyBatis-Plus 看的 —— 它靠这些注解知道"表叫什么、主键怎么生成、
 * 哪个字段是逻辑删除"。纯 MyBatis 不认识它们,只按 resultMap 或驼峰映射填值。
 */
@TableName("book")
public class Book {

    /** AUTO = 交给数据库自增;还有 NONE / INPUT / ASSIGN_ID(雪花)等策略 */
    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;

    private String author;

    /**
     * 列名是 read_flag,字段叫 read。
     * 驼峰映射只能把 read_flag 对到 readFlag,对不到 read,所以这里必须显式指定列名。
     */
    @TableField("read_flag")
    private boolean read;

    /** INSERT 时由 MetaObjectHandler 填,业务代码不用管 */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 插入和更新都填 */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 逻辑删除:deleteById 不会删行,只会把它改成 1;
     * 之后所有查询自动带上 deleted = 0,手写 SQL 要自己记得加。
     */
    @TableLogic
    private Integer deleted;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getDeleted() {
        return deleted;
    }

    public void setDeleted(Integer deleted) {
        this.deleted = deleted;
    }
}
