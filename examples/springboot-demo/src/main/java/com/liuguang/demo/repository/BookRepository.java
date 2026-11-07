package com.liuguang.demo.repository;

import com.liuguang.demo.model.Book;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 仓储:只管"怎么存取"，不写业务规则。
 *
 * <p>这里没有实现类 —— 继承 JpaRepository 之后，Spring Data JPA 在启动时
 * 用动态代理替我们生成实现，save / findById / findAll / delete 全都现成，
 * 所以这个接口可以一个方法都不写。
 *
 * <p>需要自定义查询时也不用手写 SQL:方法名按约定解析，
 * 例如 {@code List<Book> findByReadTrueOrderByCreatedAtDesc()} 会被翻译成一条查询;
 * 名字表达不了再用 @Query。
 */
public interface BookRepository extends JpaRepository<Book, Long> {
}
