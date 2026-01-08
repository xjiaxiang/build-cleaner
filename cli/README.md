# build-cleaner-cli

build-cleaner 的命令行工具，提供用户友好的 CLI 接口。

## 概述

`build-cleaner-cli` 是一个 Rust 命令行工具，提供了清理项目临时文件和目录的命令行接口。它基于 `build-cleaner-core` 库构建，提供了完整的命令行功能。

## 安装

### 从源码构建

```bash
# 构建 release 版本
cargo build --release --package build-cleaner-cli

# 可执行文件位于
./target/release/bc
```

### 安装到系统

```bash
# 安装到 cargo bin 目录
cargo install --path cli

# 或使用 cargo install --git
```

## 使用方法

### 基本用法

```bash
# 清理当前目录（使用默认配置）
bc .

# 清理多个路径
bc ~/project1 ~/project2 ~/project3

# 指定清理目标
bc --clean node_modules/ --clean dist/ .

# 预览模式（不实际删除）
bc --dry-run ~/projects

# 交互式确认
bc --interactive ~/projects

# 详细输出
bc --verbose ~/projects

# 静默模式
bc --quiet ~/projects

# 使用配置文件
bc --config .bc.yaml ~/projects
```

### 命令行选项

```
Usage: bc [OPTIONS] <PATHS>...

Arguments:
  <PATHS>...  要搜索的路径列表（必需，至少一个）

Options:
      --clean <CLEAN_PATTERNS>...  清理模式列表（文件夹以 / 结尾，文件使用通配符）
      --config <CONFIG_FILE>       配置文件路径（可选，支持 YAML 和 JSON 格式）
      --dry-run                    是否启用预览模式（不实际删除，仅显示将要删除的内容）
  -i, --interactive                是否启用交互式确认（删除前询问用户确认）
  -v, --verbose                    是否启用详细输出（显示详细的清理报告）
  -q, --quiet                      是否启用静默模式（最小输出，仅显示错误）
      --debug                      是否启用调试模式（显示调试日志）
  -h, --help                       Print help
  -V, --version                    Print version
```

### 清理模式格式

- **文件夹**：以 `/` 结尾，如 `node_modules/`、`dist/`、`build/`
- **文件**：通配符模式或具体文件名，如 `*.log`、`*.tmp`、`temp.txt`

示例：
```bash
# 清理文件夹
bc --clean node_modules/ --clean dist/ .

# 清理文件
bc --clean *.log --clean *.tmp .

# 混合使用
bc --clean node_modules/ --clean dist/ --clean *.log .
```

### 默认配置

根据项目类型自动加载默认配置：

- **Node.js**：`node_modules`, `dist`, `build`, `.next`
- **Rust**：`target`
- **Python**：`__pycache__`, `*.pyc`
- **Go**：`vendor`, `bin`
- **Java**：`target`, `build`

## 模块结构

```
cli/
├── src/
│   ├── main.rs         # 程序入口
│   ├── args.rs         # 命令行参数解析
│   ├── executor.rs     # 命令执行器
│   ├── output.rs       # 输出格式化
│   └── interactive.rs  # 交互式确认
└── Cargo.toml
```

## 主要模块

### Args Module (参数解析)

使用 `clap` 库解析命令行参数，支持：
- 位置参数（路径列表）
- 选项参数（各种标志和选项）
- 帮助和版本信息

### Executor Module (命令执行器)

负责执行清理命令的完整流程：
1. 路径展开和验证
2. 配置加载
3. 文件搜索
4. Dry-run 或实际删除
5. 报告生成

### Output Module (输出格式化)

提供各种输出功能：
- 报告输出（支持静默模式）
- 错误输出
- 警告输出
- 信息输出
- 扫描开始提示

### Interactive Module (交互式确认)

提供用户交互功能：
- 删除前确认提示
- 用户输入读取和处理

## 使用示例

### 示例 1：基本清理

```bash
# 清理当前目录的 node_modules
bc --clean node_modules/ .
```

### 示例 2：预览模式

```bash
# 预览将要清理的内容
bc --dry-run ~/projects
```

输出示例：
```
🔍 Scanning for files to clean (dry-run mode)...
📊 Cleanup Report:
 - Files scanned: 10
 - Directories scanned: 5
 - Files deleted: 10
 - Directories deleted: 5
 - Space freed: 1.23 GB
 - Time taken: 2.34s
ℹ️  Run without --dry-run to actually clean
```

### 示例 3：交互式确认

```bash
# 交互式确认删除
bc --interactive ~/projects
```

输出示例：
```
Found 5 directories and 10 files to delete.
Do you want to proceed? (y/N): y
🧹 Cleaning...
✅ Cleanup completed
```

### 示例 4：详细输出

```bash
# 显示详细输出
bc --verbose ~/projects
```

输出示例：
```
🔍 Scanning for files to clean...
🧹 Cleaning...
📊 Cleanup Report:
 - Files scanned: 10
 - Directories scanned: 5
 - Files deleted: 10
 - Directories deleted: 5
 - Files failed: 0
 - Directories failed: 0
 - Space freed: 1.23 GB
 - Time taken: 2.34s
✅ Cleanup completed
```

### 示例 5：使用配置文件

创建 `.bc.yaml`：
```yaml
clean:
  folders:
    - node_modules
    - dist
    - build
  files:
    - "*.log"
    - "*.tmp"
exclude:
  - node_modules/.cache
options:
  recursive: true
  follow_symlinks: false
```

使用配置文件：
```bash
bc --config .bc.yaml ~/projects
```

## 错误处理

CLI 工具会处理各种错误情况：

- **路径不存在**：显示错误信息并退出
- **权限不足**：显示权限错误
- **配置文件解析失败**：显示解析错误
- **删除失败**：在报告中显示失败的项目

## 退出码

- `0`：成功
- `1`：错误（路径不存在、配置错误等）

## 测试

运行单元测试：

```bash
cargo test --package build-cleaner-cli
```

测试覆盖：
- 参数解析：6 个测试
- 输出格式化：5 个测试
- 交互式确认：1 个测试

总计：12 个测试，全部通过

## 开发

### 构建

```bash
# Debug 构建
cargo build --package build-cleaner-cli

# Release 构建
cargo build --release --package build-cleaner-cli
```

### 运行

```bash
# 直接运行
cargo run --bin bc -- [args]

# 或使用构建后的可执行文件
./target/debug/bc [args]
```

### 调试

```bash
# 启用调试模式
bc --debug ~/projects

# 或使用环境变量
RUST_LOG=debug cargo run --bin bc -- [args]
```

## 依赖

- `build-cleaner-core`：核心功能库
- `clap`：命令行参数解析
- `log` / `env_logger`：日志记录

## 许可证

MIT License

