# build-cleaner

批量快速清理项目临时目录和文件的工具，支持 Rust CLI、Node.js API 和 Raycast 扩展三种使用方式。

**[中文](README.md) | [English](README-eng.md)**

## 特性

- 🚀 **快速高效**：使用 Rust 实现，性能优异
- 📦 **多项目类型支持**：自动识别 Node.js、Rust、Python、Go、Java 等项目类型
- 🎯 **灵活的清理规则**：支持通配符模式、文件夹匹配、排除规则等
- 📊 **详细的统计信息**：提供完整的清理报告和统计信息
- 🔒 **安全可靠**：支持预览模式、交互式确认等安全特性
- 🌐 **多平台支持**：支持 macOS、Linux、Windows

## 安装方式

### 方式一：Rust CLI（推荐）

#### 从源码安装

```bash
# 克隆项目
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner

# 构建并安装
cargo install --path cli

# 或直接构建
cargo build --release --package build-cleaner-cli
```

安装后，可以使用 `bc` 命令。

#### 从 Cargo 安装（待发布）

```bash
cargo install build-cleaner-cli
```

### 方式二：Node.js 包

```bash
npm install @build-cleaner/node
# 或
pnpm add @build-cleaner/node
# 或
yarn add @build-cleaner/node
```

### 方式三：Raycast 扩展（macOS）

1. 克隆项目并构建：
```bash
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner
pnpm install
cd raycast
pnpm build
```

2. 在 Raycast 中导入扩展：
   - 打开 Raycast
   - 进入 Extensions → Import Extension
   - 选择 `raycast` 目录

## 使用方式

### 1. Rust CLI 使用

#### 基本用法

```bash
# 清理当前目录（使用默认配置）
bc .

# 清理指定路径
bc ~/projects

# 清理多个路径
bc ./project1 ./project2 ./project3
```

#### 指定清理模式

```bash
# 清理 node_modules 和 dist 目录
bc . --clean node_modules/ --clean dist/

# 清理日志文件
bc . --clean "*.log"

# 混合使用文件夹和文件模式
bc . --clean node_modules/ --clean dist/ --clean "*.tmp"
```

#### 预览模式

```bash
# 预览模式（不实际删除）
bc . --dry-run

# 预览模式 + 详细输出
bc . --dry-run --verbose
```

#### 交互式确认

```bash
# 删除前询问确认
bc . --interactive
```

#### 使用配置文件

```bash
# 使用配置文件（支持 YAML 和 JSON）
bc . --config .bc.yaml

# 或
bc . --config .bc.json
```

配置文件示例（`.bc.yaml`）：

```yaml
clean:
  folders:
    - node_modules/
    - dist/
    - build/
  files:
    - "*.log"
    - "*.tmp"

exclude:
  - .git/
  - .vscode/
```

#### 输出控制

```bash
# 详细输出
bc . --verbose

# 静默模式（最小输出）
bc . --quiet

# 调试模式
bc . --debug
```

#### 完整示例

```bash
# 预览模式 + 详细输出 + 交互式确认
bc ~/projects --clean node_modules/ --clean dist/ --dry-run --verbose --interactive
```

#### 帮助信息

```bash
# 查看帮助
bc --help

# 查看版本
bc --version
```

### 2. Node.js API 使用

#### 基本用法

```typescript
import { clean } from '@build-cleaner/node';

// 基本清理
const result = await clean({
  paths: ['.'],
});

console.log(`删除了 ${result.dirsDeleted} 个目录`);
console.log(`释放了 ${result.spaceFreed} 字节空间`);
```

#### 指定清理模式

```typescript
const result = await clean({
  paths: ['.'],
  patterns: ['node_modules/', 'dist/', 'build/', '*.log'],
});
```

#### 预览模式

```typescript
const result = await clean({
  paths: ['.'],
  patterns: ['node_modules/'],
  dryRun: true, // 预览模式，不实际删除
  verbose: true, // 显示详细信息
});

console.log(`将删除 ${result.dirsMatched} 个目录`);
console.log(`将释放 ${formatSize(result.spaceFreed)} 空间`);
```

#### 详细模式

```typescript
const result = await clean({
  paths: ['.'],
  verbose: true, // 启用详细模式
});

// 查看删除的目录列表
if (result.deletedDirs) {
  result.deletedDirs.forEach(dir => {
    console.log(`已删除: ${dir}`);
  });
}

// 查看失败的项目
if (result.failedDirs && result.failedDirs.length > 0) {
  result.failedDirs.forEach(({path, error}) => {
    console.error(`失败: ${path} - ${error}`);
  });
}
```

#### 使用配置文件

```typescript
const result = await clean({
  paths: ['.'],
  configFile: '.bc.yaml', // 使用配置文件
  verbose: true,
});
```

#### 错误处理

```typescript
import { clean } from '@build-cleaner/node';

try {
  const result = await clean({
    paths: ['.'],
  });
  
  if (result.filesFailed > 0 || result.dirsFailed > 0) {
    console.warn(`警告：有 ${result.filesFailed} 个文件和 ${result.dirsFailed} 个目录删除失败`);
  }
} catch (error) {
  console.error('清理失败：', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
```

#### CLI 工具

Node.js 包还提供了命令行工具：

```bash
# 使用 npx
npx @build-cleaner/node .

# 或本地安装后使用
npx build-cleaner-node .
```

更多 Node.js API 使用示例，请查看 [npm/README.md](./npm/README.md)。

### 3. Raycast 扩展使用（macOS）

#### 基本使用

1. **打开 Raycast**：按 `Cmd + Space`（或您设置的快捷键）

2. **搜索命令**：输入 "build-cleaner"

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
   - **执行清理**：实际删除文件（请谨慎操作）
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
   - 详细的删除列表（可复制）
   - 失败的项目（如果有）
   - 支持在 Finder 中打开已删除文件的父目录

#### 快捷操作

- **路径自动补全**：输入路径时按 `Cmd + →` 可以快速补全当前选中的建议路径
- **确认清理**：在路径输入框中输入有效路径后，按 `Enter` 键即可确认并显示操作选项
- **取消操作**：在任何时候按 `Opt + Esc` 可以取消当前操作
- **复制结果**：在结果视图中，可以复制单个路径、统计信息或完整结果

#### 配置

可以在 Raycast 的扩展设置中配置：

- **默认路径**：设置默认清理路径（如 `~/Documents`）
- **默认清理模式**：设置默认的清理模式（逗号分隔，如 `node_modules/,dist/`）

#### 安全特性

- **路径限制**：只允许清理 `~` 目录下的路径，防止误删系统文件
- **预览模式**：默认使用预览模式，可以先查看将要删除的内容
- **二次确认**：执行清理前会显示确认对话框，需要明确选择"预览清理"或"执行清理"
- **详细报告**：清理完成后提供详细的报告，包括所有删除的文件和目录

更多 Raycast 扩展使用说明，请查看 [raycast/README.md](./raycast/README.md)。

## 清理模式格式

### 文件夹模式

文件夹模式以 `/` 结尾：

- `node_modules/` - 匹配所有 node_modules 目录
- `dist/` - 匹配所有 dist 目录
- `build/` - 匹配所有 build 目录
- `.next/` - 匹配所有 .next 目录

### 文件模式

文件模式使用通配符：

- `*.log` - 匹配所有 .log 文件
- `*.tmp` - 匹配所有 .tmp 文件
- `*.pyc` - 匹配所有 .pyc 文件
- `temp.txt` - 匹配具体的文件名

### 混合使用

可以同时指定多个文件夹和文件模式：

```bash
bc . --clean node_modules/ --clean dist/ --clean "*.log" --clean "*.tmp"
```

## 默认配置

根据项目类型，build-cleaner 会自动加载默认配置：

- **Node.js**：`node_modules`, `dist`, `build`, `.next`
- **Rust**：`target`
- **Python**：`__pycache__`, `*.pyc`
- **Go**：`vendor`, `bin`
- **Java**：`target`, `build`

## 项目结构

```
build-cleaner/
├── core/              # Rust Core crate - 核心功能库
├── cli/               # Rust CLI crate - 命令行工具
├── npm/               # npm 包 - Node.js API
├── raycast/           # Raycast 插件 - macOS 快速操作
├── Cargo.toml         # Rust workspace 配置
└── pnpm-workspace.yaml # pnpm workspace 配置
```

## 开发

### Rust 项目

```bash
# 构建所有 Rust 项目
cargo build

# 运行 CLI
cargo run --bin bc

# 运行测试
cargo test

# 代码格式检查
cargo fmt --check --all

# 代码检查
cargo clippy --workspace -- -D warnings
```

### Node.js 项目

```bash
# 安装依赖
pnpm install

# 构建 npm 包
cd npm && pnpm build

# 构建 Raycast 插件
cd raycast && pnpm build

# 构建所有项目（Rust + Node.js）
pnpm run build:all
```

## 相关文档

- [npm 包文档](./npm/README.md) - Node.js API 详细文档
- [Raycast 扩展文档](./raycast/README.md) - Raycast 扩展详细文档

## 许可证
MIT
