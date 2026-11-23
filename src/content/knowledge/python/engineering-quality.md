---
title: 代码质量：ruff / mypy
summary: 'ruff 承担格式化与 lint,规则集按需启用、自动修复;mypy 负责类型检查,严格度分级推进;pre-commit 把检查前置到提交前;CI 中如何组合三者;忽略规则要有理由与期限。'
category: python
node: python-engineering-quality
order: 49
level: 进阶
tags: [ruff, mypy, lint, 格式化, pre-commit, CI]
updated: 2026-11-23
mindmap: python-engineering-quality.mindmap.json
terms: ["type-hint", "pyproject", "module"]
sources:
  - title: ruff 官方文档
    url: https://docs.astral.sh/ruff/
    note: 规则集、配置与自动修复。
  - title: mypy 官方文档
    url: https://mypy.readthedocs.io/
    note: 严格度选项与渐进式类型检查。
---

代码质量工具分两类:**风格与缺陷模式**由 linter 管(ruff),**类型一致性**由类型检查器管(mypy)。前者能自动修,后者只能报告。两者都应在提交前或 CI 中执行,而不是靠人工评审记忆规则。

## ruff:一个工具替代多个

ruff 用 Rust 实现,把 flake8、isort、pyupgrade 等工具的规则收进一个二进制,并提供格式化能力:

```bash
ruff check .              # 检查
ruff check . --fix        # 自动修复可修复项
ruff format .             # 格式化
ruff format --check .     # 只检查格式,CI 用
```

配置放在 `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]
ignore = ["E501"]          # 行宽交给 formatter,不重复报错

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]       # 测试里允许 assert
```

- `E`/`F`:pycodestyle 与 pyflakes 的错误类规则;
- `I`:import 排序;
- `UP`:升级到新语法的建议;
- `B`:常见缺陷模式(可变默认值、循环变量覆盖等);
- `SIM`:可简化的写法;
- `RUF`:ruff 自有规则。

规则集不要一次全开。全开会产生大量与业务无关的告警,团队会习惯性忽略,规则就失效了。按"能修、认可、稳定"三条逐步增加。

## mypy:类型一致性

```bash
mypy src
```

```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_unused_ignores = true
exclude = ["build/", "dist/"]
```

`strict = true` 打开一整套严格选项,包括禁止隐式 `Any`、要求函数注解、检查返回类型等。老项目直接开 strict 会报上千条错误,常用渐进路径:

1. 只检查新目录,老目录先排除;
2. 打开 `disallow_untyped_defs`,补齐签名;
3. 处理 `Any` 泄漏,给第三方库装 stub(`types-requests` 等);
4. 最后开 strict,CI 保持零错误。

忽略要带原因:

```python
result = legacy_call()  # type: ignore[no-any-return]  # 第三方库缺 stub
```

`warn_unused_ignores = true` 会在忽略不再需要时提醒删除,防止遗留大量无效注释。

## 两者分工

| 问题 | 工具 |
| --- | --- |
| 未使用变量、import 顺序 | ruff |
| 可变默认值、裸 except | ruff |
| 参数类型不匹配 | mypy |
| 返回值可能为 None 未处理 | mypy |
| 格式化 | ruff format |

ruff 不替代类型检查,它只做局部模式匹配;mypy 不检查风格,也不理解运行时逻辑。两者互补,不能只上一个。

```mermaid
flowchart LR
  A["编辑器保存"] --> B["ruff format"]
  B --> C["ruff check --fix"]
  C --> D["mypy"]
  D --> E["提交"]
  E --> F["CI: 三者全部重跑"]
  F -->|失败| G["阻断合并"]
```

## pre-commit:前置检查

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
```

```bash
pre-commit install          # 安装 git hook
pre-commit run --all-files  # 手动全量检查
```

提交前自动修复格式与 lint,能把大部分问题挡在评审之前。缺点是全量 mypy 较慢,可以只在 CI 跑,或用 `--files` 只检查改动文件。

## CI 中的组合

```yaml
- run: ruff format --check .
- run: ruff check .
- run: mypy src
- run: pytest -q
```

顺序按"快 → 慢":格式、lint 最先失败,几秒内给出反馈;类型检查与测试随后。CI 必须把非零退出码当作失败,否则工具只是摆设。

## 常见问题

- **规则全开**:告警噪音导致团队忽略;
- **只在本地跑**:CI 不检查,合并后才发现;
- **大量 `# type: ignore`**:掩盖真实类型错误,应优先补注解或装 stub;
- **格式化与 lint 打架**:行宽等规则交给 formatter,不要两边都配置;
- **不固定工具版本**:不同机器结果不同,CI 应固定版本;
- **把 mypy 当运行时校验**:它不检查外部输入,边界仍需 Pydantic 等做校验。

## 小结

- ruff 统一 lint 与格式化,规则集逐步启用,自动修复大部分问题;
- mypy 检查类型一致性,严格度按目录渐进收紧;
- 忽略规则要写原因,`warn_unused_ignores` 清理无效忽略;
- pre-commit 把检查前置,CI 负责最终把关且必须阻断失败;
- 两者分工明确,不能互相替代。
