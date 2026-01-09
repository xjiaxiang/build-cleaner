# GitHub Actions Workflows

本项目包含以下 GitHub Actions 工作流：

## 1. CI (持续集成)

**文件**: `.github/workflows/ci.yml`

**触发条件**:
- 推送到 `main`、`master` 或 `develop` 分支
- 创建 Pull Request 到上述分支

**功能**:
- 在多个平台（Linux、macOS、Windows）上运行 Rust 测试
- 运行 `cargo clippy` 进行代码检查
- 检查代码格式（`cargo fmt --check`）
- 构建和测试 npm 包

## 2. Release (发布 Rust CLI)

**文件**: `.github/workflows/release.yml`

**触发条件**:
- 推送以 `v` 开头的 tag（例如 `v0.1.0`）
- 手动触发（workflow_dispatch）

**功能**:
- 为多个平台构建 Rust CLI 二进制文件：
  - Linux (x86_64)
  - macOS (Intel x86_64)
  - macOS (Apple Silicon aarch64)
  - Windows (x86_64)
- 创建 GitHub Release
- 上传二进制文件到 Release

**使用方法**:

1. 创建并推送 tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. 或者手动触发：
   - 在 GitHub 仓库的 Actions 页面
   - 选择 "Release" workflow
   - 点击 "Run workflow"

**输出**:
- GitHub Release 包含所有平台的二进制文件
- 每个平台的文件格式：
  - Linux/macOS: `.tar.gz`
  - Windows: `.zip`

## 3. Publish npm package

**文件**: `.github/workflows/npm-publish.yml`

**触发条件**:
- 推送以 `v` 开头的 tag（例如 `v0.1.0`）
- 手动触发（workflow_dispatch）

**功能**:
- 构建 npm 包
- 更新 package.json 版本号
- 发布到 npm registry

**前置要求**:
- 需要在 GitHub Secrets 中配置 `NPM_TOKEN`
- 获取 token: https://www.npmjs.com/settings/{username}/tokens
- 添加 secret: GitHub 仓库 Settings → Secrets and variables → Actions → New repository secret

**使用方法**:

1. 创建并推送 tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. 或者手动触发（同上）

## 发布流程建议

### 完整发布流程（Rust CLI + npm 包）

1. **更新版本号**:
   ```bash
   # 更新 Cargo.toml 中的版本号
   # 更新 npm/package.json 中的版本号（可选，workflow 会自动更新）
   ```

2. **提交更改**:
   ```bash
   git add .
   git commit -m "chore: bump version to 0.1.0"
   git push
   ```

3. **创建并推送 tag**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

4. **自动触发**:
   - `release.yml` 会自动构建并发布 Rust CLI
   - `npm-publish.yml` 会自动发布 npm 包

### 仅发布 Rust CLI

只推送 tag，`release.yml` 会自动运行。

### 仅发布 npm 包

只推送 tag，`npm-publish.yml` 会自动运行（需要配置 `NPM_TOKEN`）。

## 注意事项

1. **Tag 格式**: 必须使用 `v` 前缀（例如 `v0.1.0`），不要使用 `0.1.0`
2. **版本号**: npm 包的版本号会自动从 tag 中提取并更新到 `package.json`
3. **权限**: Release workflow 需要 `contents: write` 权限（已配置）
4. **npm 发布**: 需要配置 `NPM_TOKEN` secret 才能发布到 npm

## 故障排查

### Release 未创建

- 检查 tag 格式是否正确（必须以 `v` 开头）
- 检查 Actions 日志中的错误信息
- 确保仓库有创建 Release 的权限

### npm 发布失败

- 检查 `NPM_TOKEN` secret 是否配置
- 检查 token 是否有发布权限
- 检查包名是否已存在（首次发布需要确保包名唯一）

### 构建失败

- 检查 Rust 代码是否有编译错误
- 检查依赖是否正确配置
- 查看 Actions 日志获取详细错误信息
