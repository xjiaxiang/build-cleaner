# build-cleaner-core

The core functionality library for build-cleaner, providing file search, deletion, configuration management, and other core features.

**[中文](README.md) | [English](README-eng.md)**

## Overview

`build-cleaner-core` is a Rust library that provides core functionality for cleaning temporary files and directories in projects. It is designed as a reusable library that can be called by CLI tools, npm packages, or other applications.

## Features

- **Configuration Management**: Project type recognition, default configuration loading, configuration file parsing (YAML/JSON), configuration merging
- **File Search**: Path traversal, pattern matching (wildcards), exclusion rules, size filtering, time filtering
- **File Deletion**: Deletion plan generation, safety checks, deletion execution, error handling
- **Report Generation**: Statistics collection, report formatting
- **Logging**: Multi-level log support

## Module Structure

```
core/
├── src/
│   ├── lib.rs          # Library entry and exports
│   ├── config.rs       # Configuration module
│   ├── search.rs       # Search module
│   ├── delete.rs       # Deletion module
│   ├── report.rs       # Report module
│   ├── log.rs          # Logging module
│   └── error.rs        # Error type definitions
└── Cargo.toml
```

## Main Modules

### Config Module

Responsible for configuration management, including:

- **Project Type Recognition**: Automatically recognizes Node.js, Rust, Python, Go, Java, and other project types
- **Default Configuration Loading**: Loads default cleaning rules based on project type
- **Configuration File Parsing**: Supports YAML and JSON formats
- **Configuration Merging**: Merges default configuration, configuration files, and command-line arguments

**Main Types:**
- `Config`: Cleaning configuration structure
- `ConfigLoader`: Configuration loader
- `ProjectType`: Project type enumeration

**Example:**
```rust
use build_cleaner_core::{ConfigLoader, ProjectType};
use std::path::PathBuf;

// Detect project type
let project_type = ConfigLoader::detect_project_type(Path::new("."));
assert_eq!(project_type, ProjectType::NodeJs);

// Load configuration
let config = ConfigLoader::load_config(
    Path::new("."),
    None,  // No configuration file
    &[],   // No command-line arguments
)?;
```

### Search Module

Responsible for file system traversal and pattern matching, including:

- **Path Traversal**: Recursive or non-recursive directory traversal
- **Pattern Matching**: Supports wildcards `*` and `?`
- **Exclusion Rules**: Supports excluding specific paths
- **Size Filtering**: Filter by file size
- **Time Filtering**: Filter by file modification time

**Main Types:**
- `SearchEngine`: Search engine
- `SearchResult`: Search results
- `SearchOptions`: Search options

**Example:**
```rust
use build_cleaner_core::{SearchEngine, Config};

let config = ConfigLoader::load_config(/* ... */)?;
let result = SearchEngine::search(&[PathBuf::from(".")], &config)?;

println!("Found {} directories and {} files", 
    result.folders.len(), 
    result.files.len()
);
```

### Delete Module

Responsible for file deletion operations, including:

- **Deletion Plan Generation**: Sorted by depth to ensure subdirectories are deleted before parent directories
- **Safety Checks**: Prevents deletion of system critical directories (such as `/usr`, `/etc`, `/`, etc.)
- **Deletion Execution**: Supports dry-run mode
- **Trash Deletion**: Files are moved to the system trash instead of being permanently deleted (supports macOS, Linux, Windows)
- **Error Handling**: Collects information about failed deletions

**Main Types:**
- `DeleteEngine`: Deletion engine
- `DeletePlan`: Deletion plan
- `DeleteResult`: Deletion result

**Example:**
```rust
use build_cleaner_core::{DeleteEngine, SearchResult};

let search_result = SearchEngine::search(/* ... */)?;
let plan = DeleteEngine::create_delete_plan(&search_result);

// Dry-run mode (does not actually delete)
let result = DeleteEngine::execute_deletion(&plan, true);

// Actual deletion (files will be moved to trash)
let result = DeleteEngine::execute_deletion(&plan, false);
```

### Report Module

Responsible for generating cleaning reports, including:

- **Statistics Collection**: Collects scanning, deletion, and failure statistics
- **Report Formatting**: Supports verbose and concise modes
- **File Size Formatting**: Automatically converts to appropriate units (B, KB, MB, GB, TB)

**Main Types:**
- `ReportGenerator`: Report generator
- `Stats`: Statistics

**Example:**
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

## Usage Examples

### Basic Usage

```rust
use build_cleaner_core::{
    ConfigLoader, SearchEngine, DeleteEngine, ReportGenerator
};
use std::path::PathBuf;
use std::time::Instant;

// 1. Load configuration
let config = ConfigLoader::load_config(
    &PathBuf::from("."),
    None,
    &[]
)?;

// 2. Search files
let search_result = SearchEngine::search(
    &[PathBuf::from(".")],
    &config
)?;

// 3. Create deletion plan
let delete_plan = DeleteEngine::create_delete_plan(&search_result);

// 4. Execute deletion (dry-run)
let start_time = Instant::now();
let delete_result = DeleteEngine::execute_deletion(&delete_plan, true);

// 5. Generate report
let stats = ReportGenerator::collect_stats(
    &search_result,
    &delete_result,
    start_time
);
let report = ReportGenerator::format_report(&stats, true);
println!("{}", report);
```

### Custom Configuration

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
        min_size: Some(1024),  // Minimum 1KB
        max_size: None,
        min_age_days: Some(7),  // At least 7 days
        max_age_days: None,
    },
};
```

## Error Handling

The library uses a custom error type `CleanError`:

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

## Testing

Run unit tests:

```bash
cargo test --package build-cleaner-core
```

Test coverage:
- Config module: 7 tests
- Search module: 6 tests
- Delete module: 5 tests
- Report module: 3 tests

Total: 21 tests, all passing

## Dependencies

- `serde` / `serde_yaml` / `serde_json`: Configuration serialization
- `walkdir`: Directory traversal
- `thiserror`: Error handling
- `log`: Logging
- `trash`: Trash deletion (cross-platform support)
- `tempfile`: Testing utilities (dev-dependency)

## License

MIT License
