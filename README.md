# build-cleaner

批量快速清理项目临时目录和文件的命令行工具。

## 项目结构

```
build-cleaner/
├── core/              # Rust Core crate - 核心功能库
├── cli/               # Rust CLI crate - 命令行工具
├── npm/               # npm 包 - Node.js API（第二阶段）
├── raycast/           # Raycast 插件 - macOS 快速操作（第三阶段）
├── Cargo.toml         # Rust workspace 配置
└── pnpm-workspace.yaml # pnpm workspace 配置
```

## 开发阶段

- **第一阶段**：Core + Rust CLI
- **第二阶段**：npm 包
- **第三阶段**：Raycast 插件

## 技术栈

- **Rust**: Core 和 CLI 实现
- **TypeScript**: npm 包和 Raycast 插件
- **Cargo**: Rust 依赖管理
- **pnpm**: Node.js 依赖管理

## 开发

### Rust 项目

```bash
# 构建所有 Rust 项目
cargo build

# 运行 CLI
cargo run --bin bc

# 运行测试
cargo test
```

### Node.js 项目

```bash
# 安装依赖
pnpm install

# 构建 npm 包
cd npm && pnpm build

# 构建 Raycast 插件
cd raycast && pnpm build
```

