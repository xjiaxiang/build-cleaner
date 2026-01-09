# build-cleaner Raycast Extension

Raycast 扩展，提供快速清理项目临时文件和目录的功能。

## 功能特性

- 🚀 **快速清理**：通过 Raycast 快速访问清理功能
- 📦 **多项目类型支持**：自动识别 Node.js、Rust、Python、Go、Java 等项目类型
- 🎯 **灵活的清理模式**：支持选择常用的清理模式（node_modules、dist、build 等）
- 👁️ **预览模式**：在删除前预览将要清理的内容
- 📊 **详细报告**：显示清理结果和统计信息

## 安装

### 从源码安装

1. 克隆项目：
```bash
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner
```

2. 安装依赖：
```bash
pnpm install
```

3. 构建 Rust CLI（如果还没有）：
```bash
cargo build --release --package build-cleaner-cli
```

4. 构建 Raycast 扩展：
```bash
cd raycast
pnpm build
```

5. 在 Raycast 中导入扩展：
   - 打开 Raycast
   - 进入 Extensions → Import Extension
   - 选择 `raycast` 目录

### 开发模式

```bash
cd raycast
pnpm dev
```

这会在开发模式下运行扩展，支持热重载。

## 使用方法

1. **打开 Raycast**：按 `Cmd + Space`（或您设置的快捷键）

2. **搜索 "build-cleaner"**：输入命令名称

3. **选择路径**：
   - 从常用路径列表中选择（Home、桌面、下载、文档等）
   - 或使用自定义路径

4. **选择清理模式**（可选）：
   - `node_modules/` - Node.js 依赖目录
   - `dist/` - 构建输出目录
   - `build/` - 构建目录
   - `target/` - Rust 构建目录
   - `.next/` - Next.js 构建目录
   - `__pycache__/` - Python 缓存目录
   - `*.log` - 日志文件
   - `*.tmp` - 临时文件

5. **选择操作模式**：
   - **预览模式**（默认）：查看将要删除的内容，不会实际删除
   - **执行模式**：实际删除文件（请谨慎使用）

6. **执行清理**：选择"预览清理"或"执行清理"

7. **查看结果**：查看清理报告，包括：
   - 删除的目录和文件数量
   - 释放的磁盘空间
   - 操作耗时
   - **详细的删除列表**：显示所有已删除的目录和文件路径（最多显示 50 个）
   - 失败的项目（如果有）：显示删除失败的文件和目录及其错误信息

## 配置

### Raycast 扩展设置

可以在 Raycast 的扩展设置中配置：

- **默认路径**：设置默认清理路径
- **默认清理模式**：设置默认的清理模式（逗号分隔）

### 环境变量配置

扩展会自动查找 build-cleaner CLI，查找顺序如下：

1. 全局安装的 CLI（`~/.cargo/bin/bc`）
2. 从当前工作目录向上查找项目构建的 CLI
3. 环境变量 `BUILD_CLEANER_CLI_PATH` 指定的路径
4. 环境变量 `BUILD_CLEANER_DEV_PATHS` 指定的开发路径
5. 通用默认路径（`~/projects/build-cleaner`、`~/build-cleaner`）

#### BUILD_CLEANER_CLI_PATH

直接指定 CLI 二进制文件的完整路径：

```bash
export BUILD_CLEANER_CLI_PATH="/path/to/build-cleaner/target/release/bc"
```

#### BUILD_CLEANER_DEV_PATHS

指定自定义开发路径（支持多个路径，用分号或逗号分隔）：

```bash
# 单个路径（目录，会自动拼接 target/release/bc）
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner"

# 多个路径（用分号分隔）
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner;~/projects/my-build-cleaner"

# 完整路径
export BUILD_CLEANER_DEV_PATHS="/path/to/build-cleaner/target/release/bc"
```

**注意**：
- 支持 `~` 展开为 home 目录
- 如果路径是目录，会自动拼接 `target/release/bc`
- 如果路径是完整文件路径，直接使用
- 多个路径用分号（`;`）或逗号（`,`）分隔

## 安全特性

- **预览模式**：默认启用，防止误删
- **确认提示**：执行清理前会显示警告
- **详细报告**：显示所有删除的文件和目录

## 注意事项

1. **预览模式**：默认启用预览模式，不会实际删除文件
2. **执行模式**：切换到执行模式后，文件将被永久删除，请谨慎操作
3. **路径选择**：确保选择的路径是正确的项目目录
4. **清理模式**：如果不选择清理模式，将使用项目类型的默认配置

## 故障排除

### 扩展无法运行

1. 确保已构建 Rust CLI：
```bash
cargo build --release --package build-cleaner-cli
```

2. 确保 npm 包已安装：
```bash
cd npm
pnpm install
```

3. 重新构建扩展：
```bash
cd raycast
pnpm build
```

### 找不到 CLI 二进制文件

如果扩展提示找不到 build-cleaner CLI，可以尝试以下方法：

1. **全局安装 CLI**：
```bash
cargo install --path cli
```

2. **使用环境变量指定路径**：
```bash
# 方法 1：直接指定 CLI 路径
export BUILD_CLEANER_CLI_PATH="/path/to/build-cleaner/target/release/bc"

# 方法 2：指定开发路径（支持多个）
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner"
```

3. **在项目根目录运行**：确保在包含 `Cargo.toml` 的项目目录中运行扩展

### 清理失败

- 检查路径是否正确
- 检查文件权限
- 查看错误消息获取详细信息

## 开发

### 项目结构

```
raycast/
├── src/
│   └── index.tsx      # 主入口文件
├── package.json        # 依赖配置
├── tsconfig.json       # TypeScript 配置
└── README.md          # 本文档
```

### 技术栈

- **@raycast/api**：Raycast 扩展 API
- **TypeScript**：类型安全
- **React**：UI 组件

**注意**：此扩展直接调用 Rust CLI，不依赖 `@build-cleaner/node` 包，以避免 Raycast 打包时的问题。

## 相关项目

- [build-cleaner-core](../core/) - Rust 核心库
- [build-cleaner-cli](../cli/) - Rust CLI 工具
- [@build-cleaner/node](../npm/) - Node.js API 包

## 许可证

MIT

## 作者

xjiaxiang
