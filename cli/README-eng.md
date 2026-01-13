# build-cleaner-cli

Command-line tool for build-cleaner, providing a user-friendly CLI interface.

**[中文](README.md) | [English](README-eng.md)**

## Overview

`build-cleaner-cli` is a Rust command-line tool that provides a command-line interface for cleaning temporary files and directories in projects. It is built on the `build-cleaner-core` library and provides complete command-line functionality.

**Important**: Files will be moved to the system trash instead of being permanently deleted, and can be recovered from the trash.

## Installation

### Build from Source

```bash
# Build release version
cargo build --release --package build-cleaner-cli

# Executable file is located at
./target/release/bc
```

### Install to System

```bash
# Install to cargo bin directory
cargo install --path cli

# Or use cargo install --git
```

## Usage

### Basic Usage

```bash
# Clean current directory (using default configuration)
bc .

# Clean multiple paths
bc ~/project1 ~/project2 ~/project3

# Specify cleaning targets
bc --clean node_modules/ --clean dist/ .

# Preview mode (does not actually delete)
bc --dry-run ~/projects

# Interactive confirmation
bc --interactive ~/projects

# Verbose output
bc --verbose ~/projects

# Quiet mode
bc --quiet ~/projects

# Use configuration file
bc --config .bc.yaml ~/projects
```

### Command-Line Options

```
Usage: bc [OPTIONS] <PATHS>...

Arguments:
  <PATHS>...  List of paths to search (required, at least one)

Options:
      --clean <CLEAN_PATTERNS>...  Cleaning pattern list (folders end with /, files use wildcards)
      --config <CONFIG_FILE>       Configuration file path (optional, supports YAML and JSON formats)
      --dry-run                    Enable preview mode (does not actually delete, only shows what will be deleted)
  -i, --interactive                Enable interactive confirmation (ask user for confirmation before deletion)
  -v, --verbose                    Enable verbose output (show detailed cleaning report)
  -q, --quiet                      Enable quiet mode (minimal output, only show errors)
      --debug                      Enable debug mode (show debug logs)
  -h, --help                       Print help
  -V, --version                    Print version
```

### Cleaning Pattern Format

- **Folders**: End with `/`, such as `node_modules/`, `dist/`, `build/`
- **Files**: Wildcard patterns or specific filenames, such as `*.log`, `*.tmp`, `temp.txt`

Examples:
```bash
# Clean folders
bc --clean node_modules/ --clean dist/ .

# Clean files
bc --clean *.log --clean *.tmp .

# Mixed usage
bc --clean node_modules/ --clean dist/ --clean *.log .
```

### Default Configuration

Automatically loads default configuration based on project type:

- **Node.js**: `node_modules`, `dist`, `build`, `.next`
- **Rust**: `target`
- **Python**: `__pycache__`, `*.pyc`
- **Go**: `vendor`, `bin`
- **Java**: `target`, `build`

## Module Structure

```
cli/
├── src/
│   ├── main.rs         # Program entry
│   ├── args.rs         # Command-line argument parsing
│   ├── executor.rs     # Command executor
│   ├── output.rs       # Output formatting
│   └── interactive.rs  # Interactive confirmation
└── Cargo.toml
```

## Main Modules

### Args Module

Uses the `clap` library to parse command-line arguments, supports:
- Positional arguments (path list)
- Option arguments (various flags and options)
- Help and version information

### Executor Module

Responsible for executing the complete cleaning command flow:
1. Path expansion and validation
2. Configuration loading
3. File search
4. Dry-run or actual deletion
5. Report generation

### Output Module

Provides various output functions:
- Report output (supports quiet mode)
- Error output
- Warning output
- Information output
- Scan start prompt

### Interactive Module

Provides user interaction functions:
- Confirmation prompt before deletion
- User input reading and processing

## Usage Examples

### Example 1: Basic Cleaning

```bash
# Clean node_modules in current directory
bc --clean node_modules/ .
```

### Example 2: Preview Mode

```bash
# Preview what will be cleaned
bc --dry-run ~/projects
```

Output example:
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

### Example 3: Interactive Confirmation

```bash
# Interactive confirmation deletion (confirm each item)
bc --interactive ~/projects
```

Output example:
```
📋 Found 5 directories and 10 files to delete (15 items total).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  You will be prompted for each item. Options: y=yes, N=skip, a=all, q=quit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗑️  File: /path/to/file.log (Size: 1.2 KB)
   Delete? (y/N/a=all/q=quit): y

🗑️  Directory: /path/to/node_modules (Size: 150 MB)
   Delete? (y/N/a=all/q=quit): y

...

✅ Cleanup completed
```

**Interactive Mode Options**:
- `y` or `yes`: Delete current item
- `N` or press Enter: Skip current item
- `a` or `all`: Delete all remaining items (no more prompts)
- `q` or `quit`: Exit cleaning operation

### Example 4: Verbose Output

```bash
# Show verbose output
bc --verbose ~/projects
```

Output example:
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

### Example 5: Using Configuration File

Create `.bc.yaml`:
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

Use configuration file:
```bash
bc --config .bc.yaml ~/projects
```

## Safety Features

- **Trash Deletion**: Files are moved to the system trash (trash) instead of being permanently deleted
- **Safety Checks**: Prevents deletion of system critical directories (such as `/usr`, `/etc`, `/`, etc.)
- **Preview Mode**: Supports `--dry-run` to preview what will be deleted
- **Interactive Confirmation**: Supports `--interactive` to confirm each deletion (options: y/N/a/q)

## Error Handling

The CLI tool handles various error situations:

- **Path Not Found**: Display error message and exit
- **Insufficient Permissions**: Display permission error
- **Configuration File Parse Failure**: Display parse error
- **Deletion Failure**: Display failed items in the report

## Exit Codes

- `0`: Success
- `1`: Error (path not found, configuration error, etc.)

## Testing

Run unit tests:

```bash
cargo test --package build-cleaner-cli
```

Test coverage:
- Argument parsing: 6 tests
- Output formatting: 5 tests
- Interactive confirmation: 1 test

Total: 12 tests, all passing

## Development

### Build

```bash
# Debug build
cargo build --package build-cleaner-cli

# Release build
cargo build --release --package build-cleaner-cli
```

### Run

```bash
# Run directly
cargo run --bin bc -- [args]

# Or use the built executable
./target/debug/bc [args]
```

### Debug

```bash
# Enable debug mode
bc --debug ~/projects

# Or use environment variable
RUST_LOG=debug cargo run --bin bc -- [args]
```

## Dependencies

- `build-cleaner-core`: Core functionality library
- `clap`: Command-line argument parsing
- `log` / `env_logger`: Logging
- `trash`: Trash deletion (cross-platform support)

## License

MIT License
