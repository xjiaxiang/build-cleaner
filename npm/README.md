# @build-cleaner/node

Node.js API for build-cleaner - 一个快速清理各种项目类型中临时文件和目录的工具。

**[中文](README.md) | [English](README-eng.md)**

## 简介

`@build-cleaner/node` 是 build-cleaner 的 Node.js 实现，提供了在 Node.js 环境中使用 build-cleaner 功能的 TypeScript/JavaScript API。它是纯 Node.js 实现，不依赖 Rust CLI，可以直接在 Node.js 环境中使用。

## 特性

- 🚀 **纯 Node.js 实现**：无需安装 Rust 或编译二进制文件，直接使用
- 📦 **多项目类型支持**：自动识别 Node.js、Rust、Python、Go、Java 等项目类型
- 🎯 **灵活的清理规则**：支持通配符模式、文件夹匹配、排除规则等
- 📊 **详细的统计信息**：提供完整的清理报告和统计信息
- 🔒 **安全可靠**：支持预览模式、安全检查、回收站删除等
- 📝 **TypeScript 支持**：完整的 TypeScript 类型定义

## 安装

```bash
npm install @build-cleaner/node
# 或
pnpm add @build-cleaner/node
# 或
yarn add @build-cleaner/node
```

### 前置要求

- Node.js >= 22.0.0

无需安装 Rust 或任何其他依赖，安装包后即可直接使用。

## 快速开始

```typescript
import { clean } from '@build-cleaner/node';

// 基本用法：清理当前目录
const result = await clean({
  paths: ['.'],
});

console.log(`删除了 ${result.dirsDeleted} 个目录`);
console.log(`释放了 ${result.spaceFreed} 字节空间`);
```

## API 文档

### `clean(options: CleanOptions): Promise<CleanResult>`

执行清理操作的主要函数。

#### 参数

##### `CleanOptions`

```typescript
interface CleanOptions {
  /**
   * 要搜索的路径列表（必需，至少一个）
   */
  paths: string[];
  
  /**
   * 清理模式列表（可选，文件夹以 / 结尾，文件使用通配符）
   * 例如：['node_modules/', 'dist/', '*.log']
   */
  patterns?: string[];
  
  /**
   * 配置文件路径（可选，支持 YAML 和 JSON 格式）
   */
  configFile?: string;
  
  /**
   * 是否启用预览模式（不实际删除，仅显示将要删除的内容）
   * 默认：false
   */
  dryRun?: boolean;
  
  /**
   * 是否启用交互式确认（删除前逐个询问用户确认）
   * 在交互模式下，会对每个文件/目录进行确认，选项：y=yes, N=skip, a=all, q=quit
   * 注意：在非 CLI 环境中，交互式模式需要手动实现确认逻辑
   * 默认：false
   */
  interactive?: boolean;
  
  /**
   * 是否启用详细输出（显示详细的清理报告）
   * 默认：false
   */
  verbose?: boolean;
  
  /**
   * 是否启用静默模式（最小输出，仅显示错误）
   * 默认：false
   */
  quiet?: boolean;
  
  /**
   * 是否启用调试模式（显示调试日志）
   * 默认：false
   */
  debug?: boolean;
}
```

#### 返回值

##### `CleanResult`

```typescript
interface CleanResult {
  /**
   * 扫描的文件数量
   */
  filesScanned: number;
  
  /**
   * 扫描的目录数量
   */
  dirsScanned: number;
  
  /**
   * 匹配的文件数量
   */
  filesMatched: number;
  
  /**
   * 匹配的目录数量
   */
  dirsMatched: number;
  
  /**
   * 成功删除的文件数量
   */
  filesDeleted: number;
  
  /**
   * 成功删除的目录数量
   */
  dirsDeleted: number;
  
  /**
   * 删除失败的文件数量
   */
  filesFailed: number;
  
  /**
   * 删除失败的目录数量
   */
  dirsFailed: number;
  
  /**
   * 释放的磁盘空间（字节）
   */
  spaceFreed: number;
  
  /**
   * 操作耗时（秒）
   */
  timeTaken: number;
  
  /**
   * 删除的目录列表（仅在 verbose 模式下）
   */
  deletedDirs?: string[];
  
  /**
   * 删除的文件列表（仅在 verbose 模式下）
   */
  deletedFiles?: string[];
  
  /**
   * 失败的目录列表（仅在 verbose 模式下）
   */
  failedDirs?: Array<{path: string; error: string}>;
  
  /**
   * 失败的文件列表（仅在 verbose 模式下）
   */
  failedFiles?: Array<{path: string; error: string}>;
}
```

## 使用示例

### 示例 1：基本清理

```typescript
import { clean } from '@build-cleaner/node';

async function basicClean() {
  const result = await clean({
    paths: ['.'],
  });
  
  console.log('清理完成！');
  console.log(`- 删除了 ${result.dirsDeleted} 个目录`);
  console.log(`- 删除了 ${result.filesDeleted} 个文件`);
  console.log(`- 释放了 ${formatSize(result.spaceFreed)} 空间`);
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
```

### 示例 2：指定清理模式

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithPatterns() {
  const result = await clean({
    paths: ['.'],
    patterns: ['node_modules/', 'dist/', 'build/', '*.log'],
  });
  
  console.log(`清理了 ${result.dirsDeleted} 个目录和 ${result.filesDeleted} 个文件`);
}
```

### 示例 3：预览模式

```typescript
import { clean } from '@build-cleaner/node';

async function previewClean() {
  const result = await clean({
    paths: ['.'],
    patterns: ['node_modules/'],
    dryRun: true, // 预览模式，不实际删除
    verbose: true, // 显示详细信息
  });
  
  console.log('预览结果：');
  console.log(`- 将删除 ${result.dirsMatched} 个目录`);
  console.log(`- 将删除 ${result.filesMatched} 个文件`);
  console.log(`- 将释放 ${formatSize(result.spaceFreed)} 空间`);
  
  if (result.deletedDirs) {
    console.log('\n将删除的目录：');
    result.deletedDirs.forEach(dir => console.log(`  - ${dir}`));
  }
}
```

### 示例 4：详细模式

```typescript
import { clean } from '@build-cleaner/node';

async function verboseClean() {
  const result = await clean({
    paths: ['.'],
    verbose: true, // 启用详细模式
  });
  
  console.log('详细清理报告：');
  console.log(`- 扫描了 ${result.filesScanned} 个文件`);
  console.log(`- 扫描了 ${result.dirsScanned} 个目录`);
  console.log(`- 删除了 ${result.dirsDeleted} 个目录`);
  console.log(`- 删除了 ${result.filesDeleted} 个文件`);
  console.log(`- 释放了 ${formatSize(result.spaceFreed)} 空间`);
  console.log(`- 耗时 ${result.timeTaken.toFixed(2)} 秒`);
  
  if (result.failedDirs && result.failedDirs.length > 0) {
    console.log('\n失败的目录：');
    result.failedDirs.forEach(({path, error}) => {
      console.log(`  - ${path}: ${error}`);
    });
  }
}
```

### 示例 5：使用配置文件

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithConfig() {
  const result = await clean({
    paths: ['.'],
    configFile: '.bc.yaml', // 使用配置文件
    verbose: true,
  });
  
  console.log('清理完成！');
}
```

### 示例 6：错误处理

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithErrorHandling() {
  try {
    const result = await clean({
      paths: ['.'],
    });
    
    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      console.warn(`警告：有 ${result.filesFailed} 个文件和 ${result.dirsFailed} 个目录删除失败`);
      
      // 在详细模式下，可以查看失败详情
      if (result.failedDirs) {
        result.failedDirs.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
    }
  } catch (error) {
    console.error('清理失败：', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

### 示例 7：清理多个路径

```typescript
import { clean } from '@build-cleaner/node';

async function cleanMultiplePaths() {
  const result = await clean({
    paths: [
      './project1',
      './project2',
      './project3',
    ],
    patterns: ['node_modules/', 'dist/'],
  });
  
  console.log(`在多个项目中清理了 ${result.dirsDeleted} 个目录`);
}
```

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

```typescript
const result = await clean({
  paths: ['.'],
  patterns: [
    'node_modules/',  // 文件夹
    'dist/',          // 文件夹
    '*.log',          // 文件
    '*.tmp',          // 文件
  ],
});
```

## 默认配置

根据项目类型，build-cleaner 会自动加载默认配置：

- **Node.js**：`node_modules`, `dist`, `build`, `.next`
- **Rust**：`target`
- **Python**：`__pycache__`, `*.pyc`
- **Go**：`vendor`, `bin`
- **Java**：`target`, `build`

## CLI 工具

除了编程 API，`@build-cleaner/node` 还提供了一个命令行工具 `build-cleaner-node`。

### 安装后使用

```bash
# 全局安装后直接使用
npx @build-cleaner/node .

# 或本地安装后使用
pnpm add @build-cleaner/node
npx build-cleaner-node .
```

### CLI 选项

```bash
Usage: build-cleaner-node [OPTIONS] <PATHS...>

批量快速清理项目临时目录和文件的命令行工具

Arguments:
  <PATHS...>              要搜索的路径列表（必需，至少一个）

Options:
  --clean <PATTERN>       清理模式列表（文件夹以 / 结尾，文件使用通配符）
                         可以多次使用，例如：--clean node_modules/ --clean dist/
  --config <FILE>         配置文件路径（可选，支持 YAML 和 JSON 格式）
  --dry-run               预览模式（不实际删除，仅显示将要删除的内容）
  -i, --interactive       交互式确认（删除前逐个询问用户确认，选项：y/N/a/q）
  -v, --verbose           详细输出（显示详细的清理报告）
  -q, --quiet             静默模式（最小输出，仅显示错误）
  --debug                 调试模式（显示调试日志）
  -h, --help              显示帮助信息
  -V, --version           显示版本信息

Examples:
  # 清理当前目录
  build-cleaner-node .

  # 预览模式
  build-cleaner-node --dry-run ~/projects

  # 指定清理模式
  build-cleaner-node --clean node_modules/ --clean dist/ .

  # 使用配置文件
  build-cleaner-node --config .bc.yaml ~/projects

  # 详细输出
  build-cleaner-node --verbose ~/projects
```

## 高级用法

### 导出内部模块

```typescript
import {
  ConfigLoader,
  Config,
  SearchEngine,
  SearchResult,
  DeleteEngine,
  DeletePlan,
  DeleteResult,
} from '@build-cleaner/node';

// 加载配置
const config = ConfigLoader.loadConfig('.', null, ['node_modules/']);

// 搜索文件（带进度回调）
const progressCallback = (
  filesScanned: number,
  dirsScanned: number,
  filesMatched: number,
  dirsMatched: number,
  totalSize: number
) => {
  console.log(`扫描进度: ${filesScanned} 文件, ${dirsMatched} 匹配`);
};

const searchResult = SearchEngine.searchWithProgress(
  ['.'],
  config,
  progressCallback
);

// 创建删除计划
const deletePlan = DeleteEngine.createDeletePlan(searchResult);

// 执行删除（预览模式）
const deleteResult = DeleteEngine.executeDeletion(deletePlan, true);
```

## 错误处理

### 常见错误

1. **路径不存在**
   ```
   Error: Path does not exist: /path/to/dir
   ```
   解决：检查路径是否正确，确保路径存在

2. **至少需要一个路径**
   ```
   Error: At least one path is required
   ```
   解决：确保在 `paths` 数组中至少提供一个路径

3. **权限不足**
   ```
   Error: Permission denied
   ```
   解决：确保有足够的权限访问和删除文件/目录

4. **配置文件格式错误**
   ```
   Error: Invalid config file format
   ```
   解决：检查配置文件是否为有效的 YAML 或 JSON 格式

### 错误处理示例

```typescript
import { clean } from '@build-cleaner/node';

async function safeClean() {
  try {
    const result = await clean({
      paths: ['.'],
      verbose: true, // 启用详细模式以获取失败详情
    });
    
    // 检查是否有失败的项目
    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      console.warn('部分文件删除失败');
      
      if (result.failedDirs && result.failedDirs.length > 0) {
        console.error('\n失败的目录：');
        result.failedDirs.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
      
      if (result.failedFiles && result.failedFiles.length > 0) {
        console.error('\n失败的文件：');
        result.failedFiles.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('ENOENT') || errorMessage.includes('does not exist')) {
      console.error('错误：指定的路径不存在');
    } else if (errorMessage.includes('At least one path is required')) {
      console.error('错误：至少需要指定一个路径');
    } else {
      console.error('清理失败：', errorMessage);
    }
    
    throw error;
  }
}
```

## 注意事项

1. **纯 Node.js 实现**：
   - 无需安装 Rust 或任何二进制文件
   - 直接使用 Node.js 标准库实现
   - 使用高效的异步文件系统遍历

2. **平台支持**：
   - 支持所有 Node.js 支持的平台（macOS、Linux、Windows）
   - 路径格式支持 `~` 展开（如 `~/projects`）

3. **交互式模式**：
   - 在 CLI 工具中，交互式模式会对每个文件/目录逐个提示用户确认
   - 选项：`y`=yes（删除）, `N`=skip（跳过）, `a`=all（删除所有剩余）, `q`=quit（退出）
   - 在编程 API 中，交互式模式需要手动实现确认逻辑
   - 建议使用 `dryRun` 进行预览后再执行删除

4. **进度显示**：
   - 默认情况下会显示实时扫描进度
   - 进度信息输出到 stderr，不会影响 stdout 的结果
   - 使用 `quiet: true` 可以禁用进度显示

5. **性能优化**：
   - 对于大量文件，建议使用 `quiet` 模式以减少输出开销
   - 扫描过程使用异步遍历，不会阻塞事件循环
   - 支持多路径并行处理

6. **错误处理**：
   - 即使部分文件删除失败，函数仍会返回结果
   - 需要检查 `filesFailed` 和 `dirsFailed` 字段
   - 在 `verbose` 模式下可以查看详细的失败信息

7. **路径处理**：
   - 支持相对路径和绝对路径
   - 支持 `~` 展开为用户主目录
   - 自动验证路径是否存在

## 类型定义

完整的 TypeScript 类型定义已包含在包中：

```typescript
import type {
  CleanOptions,
  CleanResult,
  ErrorInfo,
  Config,
  SearchResult,
  DeletePlan,
  DeleteResult,
} from '@build-cleaner/node';
```

## 进度显示

在非静默模式下，`clean` 函数会自动显示扫描进度。进度信息会实时更新到标准错误输出（stderr），包括：

- 已扫描的文件数量
- 已扫描的目录数量
- 匹配的文件数量
- 匹配的目录数量
- 匹配文件的总大小

```typescript
// 默认会显示进度（quiet: false）
const result = await clean({
  paths: ['.'],
  // quiet: false, // 默认值
});

// 静默模式不显示进度
const result = await clean({
  paths: ['.'],
  quiet: true,
});
```

## 开发

### 构建

```bash
cd npm
pnpm build
```

### 测试

```bash
pnpm test
```

### 依赖

- **trash**：回收站删除（支持跨平台）
- **TypeScript**：类型安全
- **Node.js 标准库**：文件系统操作

## 相关项目

- [build-cleaner-core](../core/README.md) - Rust 核心库（可选，用于 Rust CLI）
- [build-cleaner-cli](../cli/README.md) - Rust CLI 工具（可选，独立工具）
- [build-cleaner-raycast](../raycast/README.md) - Raycast 插件

## 许可证

MIT

## 作者

xjiaxiang
