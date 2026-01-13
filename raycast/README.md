# build-cleaner Raycast Extension

Raycast 扩展，提供快速清理项目临时文件和目录的功能。

**[中文](README.md) | [English](README-eng.md)**

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

3. **输入路径**：
   - 在搜索框中直接输入要清理的路径
   - 支持 `~` 展开，如 `~/Documents`、`~/Downloads` 等
   - 支持自动补全：输入路径时会自动显示匹配的目录建议（类似 shell tab 补全）
   - 使用 `Cmd + →` 可以快速补全路径
   - **注意**：只支持 `~` 目录下的路径（安全限制）

4. **确认路径**：
   - 输入路径后按 `Enter` 键
   - 如果路径不存在，会显示错误提示
   - 如果路径存在且在 `~` 目录下，会显示确认对话框

5. **选择操作**：
   - **预览清理**：查看将要删除的内容（不会实际删除）
   - **执行清理**：实际删除文件（文件会移到回收站，请谨慎操作）
   - 按 `Opt + Esc` 可以取消操作

6. **配置清理模式**（可选）：
   在确认路径后，可以配置清理模式：
   - `node_modules/` - Node.js 依赖目录
   - `dist/` - 构建输出目录
   - `build/` - 构建目录
   - `target/` - Rust 构建目录
   - `.next/` - Next.js 构建目录
   - `__pycache__/` - Python 缓存目录
   - `*.log` - 日志文件
   - `*.tmp` - 临时文件
   - 支持添加自定义清理模式

7. **查看结果**：清理完成后会显示详细报告，包括：
   - 删除的目录和文件数量
   - 释放的磁盘空间
   - 操作耗时
   - **详细的删除列表**：显示所有已删除的目录和文件路径（最多显示 50 个，可复制）
   - 失败的项目（如果有）：显示删除失败的文件和目录及其错误信息
   - 支持在 Finder 中打开已删除文件的父目录

## 配置

### Raycast 扩展设置

可以在 Raycast 的扩展设置中配置：

- **默认路径**：设置默认清理路径（如 `~/Documents`）
- **默认清理模式**：设置默认的清理模式（逗号分隔，如 `node_modules/,dist/`）

### 快捷操作

- **路径自动补全**：输入路径时按 `Cmd + →` 可以快速补全当前选中的建议路径
- **确认清理**：在路径输入框中输入有效路径后，按 `Enter` 键即可确认并显示操作选项
- **取消操作**：在任何时候按 `Opt + Esc` 可以取消当前操作
- **复制结果**：在结果视图中，可以复制单个路径、统计信息或完整结果

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

- **路径限制**：只允许清理 `~` 目录下的路径，防止误删系统文件
- **预览模式**：默认使用预览模式，可以先查看将要删除的内容
- **二次确认**：执行清理前会显示确认对话框，需要明确选择"预览清理"或"执行清理"
- **回收站删除**：文件会被移到系统回收站，而不是永久删除，可以从回收站恢复
- **详细报告**：清理完成后提供详细的报告，包括所有删除的文件和目录

## 注意事项

1. **路径限制**：只支持 `~` 目录下的路径，这是为了安全考虑
2. **预览模式**：默认使用预览模式，不会实际删除文件
3. **执行模式**：执行清理后，文件会被移到系统回收站，可以从回收站恢复
4. **路径输入**：支持 `~` 展开和自动补全，使用 `Cmd + →` 可以快速补全路径
5. **清理模式**：如果不选择清理模式，将使用项目类型的默认配置

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

- [build-cleaner-core](../core/README.md) - Rust 核心库
- [build-cleaner-cli](../cli/README.md) - Rust CLI 工具
- [@build-cleaner/node](../npm/README.md) - Node.js API 包

## 许可证

MIT

## 作者

xjiaxiang
