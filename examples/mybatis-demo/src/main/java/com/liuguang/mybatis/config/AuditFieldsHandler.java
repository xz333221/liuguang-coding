package com.liuguang.mybatis.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 自动填充:实体上标了 fill = INSERT / INSERT_UPDATE 的字段,由这里统一赋时间。
 *
 * <p>为什么不让 Service 里自己 set?一个字段还好,十个实体都重复一遍就不合适了;
 * 更要紧的是"忘了填"不会报错,只会悄悄存一条没有创建时间的数据。
 */
@Component
public class AuditFieldsHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        strictInsertFill(metaObject, "createdAt", LocalDateTime.class, now);
        strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, now);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
