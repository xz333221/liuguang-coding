---
title: SQLAlchemy 与数据库访问
summary: 'Engine 与连接池;2.0 风格的 Declarative 模型;Session 的生命周期与事务边界;select 查询与结果;关系与 N+1;selectinload 预加载;Alembic 迁移的定位。'
category: python
node: python-web-orm
order: 58
level: 进阶
tags: [SQLAlchemy, ORM, Session, 事务, N+1, Alembic]
updated: 2026-11-23
mindmap: python-web-orm.mindmap.json
terms: ["serialization", "exception", "context-manager", "value"]
sources:
  - title: SQLAlchemy 官方文档 · 统一教程
    url: https://docs.sqlalchemy.org/en/20/tutorial/
    note: Engine、Session 与 2.0 查询风格。
  - title: SQLAlchemy 官方文档 · 关系加载
    url: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
    note: 懒加载、预加载与 N+1 问题。
---

SQLAlchemy 是 Python 生态最完整的 ORM:既能用 Core 拼 SQL,也能用 ORM 把表映射成类。2.0 版本统一了查询风格,推荐 `select()` 加类型注解,而不是旧的 `session.query()`。

## Engine 与连接池

```python
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql+psycopg://user:pass@localhost/shop",
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
)
```

- Engine 管理连接池,应用里只创建一次;
- `pool_pre_ping` 在取连接前做存活检查,避免使用被数据库断开的旧连接;
- 连接串格式是 `方言+驱动://用户:密码@主机/库名`;
- `echo=True` 打印 SQL,只在调试时开。

## 2.0 风格模型

```python
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(index=True)
    email: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    orders: Mapped[list["Order"]] = relationship(back_populates="user")

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    amount: Mapped[int]

    user: Mapped[User] = relationship(back_populates="orders")
```

`Mapped[T]` 同时声明类型与可空性:`Mapped[str]` 非空,`Mapped[str | None]` 可空。`mapped_column` 承载主键、索引、唯一约束与默认值。关系用 `back_populates` 双向绑定。

## Session 与事务

```python
from sqlalchemy.orm import Session

def create_user(session: Session, name: str, email: str) -> User:
    user = User(name=name, email=email)
    session.add(user)
    session.flush()          # 发送 INSERT,拿到自增 id
    return user

with Session(engine) as session:
    try:
        create_user(session, "Ada", "ada@example.com")
        session.commit()
    except Exception:
        session.rollback()
        raise
```

- Session 是工作单元,跟踪对象的增删改,`commit()` 时统一发送;
- `flush()` 把待执行的 SQL 发出去但不提交,用于拿自增主键;
- 事务边界由 `commit`/`rollback` 决定,异常必须回滚;
- `Session` 不是线程安全的,每个请求/任务一个,不要全局共享。

```mermaid
flowchart TD
  A["请求开始"] --> B["创建 Session"]
  B --> C["查询 / 修改对象"]
  C --> D{"业务成功?"}
  D -->|是| E["commit 提交事务"]
  D -->|否| F["rollback 回滚"]
  E --> G["关闭 Session"]
  F --> G
```

把 Session 生命周期绑定到请求,用依赖注入(FastAPI 的 `Depends` 或 Flask 的 `teardown`)保证关闭。

## 查询

```python
from sqlalchemy import select

stmt = select(User).where(User.name == "Ada").order_by(User.id.desc()).limit(1)
user = session.scalars(stmt).first()

stmt = select(User.id, User.name).where(User.email.like("%@example.com"))
rows = session.execute(stmt).all()

count = session.scalar(select(func.count()).select_from(User))
```

- `select()` 构建语句,`where`/`order_by`/`limit` 链式组合;
- `session.scalars()` 返回单列标量流,`session.execute()` 返回行;
- 更新与删除用 `update()`/`delete()`,批量操作避免逐条对象修改;
- 复杂查询直接写 SQL 片段(`text()`),不要为了纯 ORM 把可读性弄差。

## N+1 与预加载

```python
for user in session.scalars(select(User)):
    print(user.orders)        # 每个 user 触发一次查询 → N+1
```

懒加载让每个用户访问 `orders` 时再查一次,一百个用户就是一百零一次查询。

```python
from sqlalchemy.orm import selectinload

stmt = select(User).options(selectinload(User.orders))
for user in session.scalars(stmt):
    print(user.orders)        # 总共两次查询
```

`selectinload` 用 IN 查询批量加载,适合一对多;`joinedload` 用 JOIN 一次取回,适合一对一或多对一。预加载要按查询场景在语句上指定,不要全局把 lazy 改成 eager。

## 关系与约束

- `ForeignKey` 定义库级外键,`relationship` 定义对象级导航;
- 一对多、多对多用 `relationship` 加关联表;
- `cascade` 控制删除父对象时子对象的行为,默认不级联删除;
- `unique=True`、`index=True` 等约束最终要落到迁移里,改模型不自动改库。

## 迁移:Alembic 的定位

模型定义只是"期望的库结构",实际数据库靠迁移演进:

```bash
alembic init migrations
alembic revision --autogenerate -m "add users"
alembic upgrade head
```

- `autogenerate` 对比模型与库生成草稿,**必须人工检查**;
- 迁移文件纳入版本控制,按顺序升级;
- 生产环境不要用 `create_all()` 代替迁移,它无法处理已有数据的结构变更。

## 常见问题

- **Session 全局共享**:并发下数据串扰,按请求创建;
- **忘记 commit/rollback**:修改没有落库或连接一直占用事务;
- **在循环里访问懒加载关系**:N+1 查询,接口响应变慢数倍;
- **模型改了不写迁移**:线上库结构与代码不一致;
- **用 ORM 做大批量更新**:逐对象生成 SQL,应使用 `update()` 或 Core;
- **字符串拼接 SQL**:注入风险,一律用参数绑定。

## 小结

- Engine 管理连接池,应用级单例;Session 是请求级工作单元;
- 2.0 风格用 `Mapped`/`mapped_column` 声明模型,`select()` 构建查询;
- 事务边界由 commit/rollback 决定,异常必须回滚;
- 懒加载导致 N+1,按场景用 `selectinload`/`joinedload` 预加载;
- 数据库结构演进靠 Alembic 迁移,不要用 `create_all` 代替。
