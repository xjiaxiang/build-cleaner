# build-cleaner-core

build-cleaner 的核心功能库，提供文件搜索、删除、配置管理等核心功能。

## 概述

`build-cleaner-core` 是一个 Rust 库，提供了清理项目临时文件和目录的核心功能。它被设计为可复用的库，可以被 CLI 工具、npm 包或其他应用程序调用。

## 功能特性

- **配置管理**：项目类型识别、默认配置加载、配置文件解析（YAML/JSON）、配置合并
- **文件搜索**：路径遍历、模式匹配（通配符）、排除规则、大小过滤、时间过滤
- **文件删除**：删除计划生成、安全检查、删除执行、错误处理
- **报告生成**：统计信息收集、报告格式化
- **日志记录**：多级别日志支持

## 模块结构

```
core/
├── src/
│   ├── lib.rs          # 库入口和导出
│   ├── config.rs       # 配置模块
│   ├── search.rs       # 搜索模块
│   ├── delete.rs       # 删除模块
│   ├── report.rs       # 报告模块
│   ├── log.rs          # 日志模块
│   └── error.rs        # 错误类型定义
└── Cargo.toml
```

## 主要模块

### Config Module (配置模块)

负责配置管理，包括：

- **项目类型识别**：自动识别 Node.js、Rust、Python、Go、Java 等项目类型
- **默认配置加载**：根据项目类型加载默认清理规则
- **配置文件解析**：支持 YAML 和 JSON 格式
- **配置合并**：合并默认配置、配置文件和命令行参数

**主要类型：**
- `Config`：清理配置结构
- `ConfigLoader`：配置加载器
- `ProjectType`：项目类型枚举

**示例：**
```rust
use build_cleaner_core::{ConfigLoader, ProjectType};
use std::path::PathBuf;

// 检测项目类型
let project_type = ConfigLoader::detect_project_type(Path::new("."));
assert_eq!(project_type, ProjectType::NodeJs);

// 加载配置
let config = ConfigLoader::load_config(
    Path::new("."),
    None,  // 无配置文件
    &[],   // 无命令行参数
)?;
```

### Search Module (搜索模块)

负责文件系统遍历和模式匹配，包括：

- **路径遍历**：递归或非递归遍历目录
- **模式匹配**：支持通配符 `*` 和 `?`
- **排除规则**：支持排除特定路径
- **大小过滤**：按文件大小过滤
- **时间过滤**：按文件修改时间过滤

**主要类型：**
- `SearchEngine`：搜索引擎
- `SearchResult`：搜索结果
- `SearchOptions`：搜索选项

**示例：**
```rust
use build_cleaner_core::{SearchEngine, Config};

let config = ConfigLoader::load_config(/* ... */)?;
let result = SearchEngine::search(&[PathBuf::from(".")], &config)?;

println!("Found {} directories and {} files", 
    result.folders.len(), 
    result.files.len()
);
```

### Delete Module (删除模块)

负责文件删除操作，包括：

- **删除计划生成**：按深度排序，确保子目录先于父目录删除
- **安全检查**：防止删除系统关键目录
- **删除执行**：支持 dry-run 模式
- **错误处理**：收集删除失败的信息

**主要类型：**
- `DeleteEngine`：删除引擎
- `DeletePlan`：删除计划
- `DeleteResult`：删除结果

**示例：**
```rust
use build_cleaner_core::{DeleteEngine, SearchResult};

let search_result = SearchEngine::search(/* ... */)?;
let plan = DeleteEngine::create_delete_plan(&search_result);

// Dry-run 模式
let result = DeleteEngine::execute_deletion(&plan, true);

// 实际删除
let result = DeleteEngine::execute_deletion(&plan, false);
```

### Report Module (报告模块)

负责生成清理报告，包括：

- **统计信息收集**：收集扫描、删除、失败的统计
- **报告格式化**：支持详细模式和简洁模式
- **文件大小格式化**：自动转换为合适的单位（B、KB、MB、GB、TB）

**主要类型：**
- `ReportGenerator`：报告生成器
- `Stats`：统计信息

**示例：**
```rust
use build_cleaner_core::{ReportGenerator, SearchResult, DeleteResult};
use std::time::Instant;

let start_time = Instant::now();
let stats = ReportGenerator::collect_stats(
    &search_result,
    &delete_result,
    start_time
);

let report = ReportGenerator::format_report(&stats, true);
println!("{}", report);
```

## 使用示例

### 基本使用

```rust
use build_cleaner_core::{
    ConfigLoader, SearchEngine, DeleteEngine, ReportGenerator
};
use std::path::PathBuf;
use std::time::Instant;

// 1. 加载配置
let config = ConfigLoader::load_config(
    &PathBuf::from("."),
    None,
    &[]
)?;

// 2. 搜索文件
let search_result = SearchEngine::search(
    &[PathBuf::from(".")],
    &config
)?;

// 3. 创建删除计划
let delete_plan = DeleteEngine::create_delete_plan(&search_result);

// 4. 执行删除（dry-run）
let start_time = Instant::now();
let delete_result = DeleteEngine::execute_deletion(&delete_plan, true);

// 5. 生成报告
let stats = ReportGenerator::collect_stats(
    &search_result,
    &delete_result,
    start_time
);
let report = ReportGenerator::format_report(&stats, true);
println!("{}", report);
```

### 自定义配置

```rust
use build_cleaner_core::{Config, CleanConfig, Options};

let custom_config = Config {
    clean: CleanConfig {
        folders: vec!["custom_dir".to_string()],
        files: vec!["*.tmp".to_string()],
    },
    exclude: vec![PathBuf::from("excluded_path")],
    options: Options {
        recursive: true,
        follow_symlinks: false,
        min_size: Some(1024),  // 最小 1KB
        max_size: None,
        min_age_days: Some(7),  // 至少 7 天
        max_age_days: None,
    },
};
```

## 错误处理

库使用自定义错误类型 `CleanError`：

```rust
use build_cleaner_core::CleanError;

match result {
    Ok(value) => println!("Success: {:?}", value),
    Err(CleanError::PathNotFound(path)) => {
        eprintln!("Path not found: {:?}", path);
    }
    Err(CleanError::PermissionDenied(path)) => {
        eprintln!("Permission denied: {:?}", path);
    }
    Err(e) => eprintln!("Error: {}", e),
}
```

## 测试

运行单元测试：

```bash
cargo test --package build-cleaner-core
```

测试覆盖：
- 配置模块：7 个测试
- 搜索模块：6 个测试
- 删除模块：5 个测试
- 报告模块：3 个测试

总计：21 个测试，全部通过

## 依赖

- `serde` / `serde_yaml` / `serde_json`：配置序列化
- `walkdir`：目录遍历
- `thiserror`：错误处理
- `log`：日志记录
- `tempfile`：测试工具（dev-dependency）

## 许可证

MIT License

