# build-cleaner

A fast tool for batch cleaning temporary directories and files in projects, supporting three usage methods: Rust CLI, Node.js API, and Raycast extension.

**[中文](README.md) | [English](README-eng.md)**

## Features

- 🚀 **Fast and Efficient**: Implemented in Rust with excellent performance
- 📦 **Multi-Project Type Support**: Automatically recognizes Node.js, Rust, Python, Go, Java, and other project types
- 🎯 **Flexible Cleaning Rules**: Supports wildcard patterns, folder matching, exclusion rules, etc.
- 📊 **Detailed Statistics**: Provides complete cleaning reports and statistics
- 🔒 **Safe and Reliable**: Supports preview mode, interactive confirmation, and other safety features
- 🌐 **Multi-Platform Support**: Supports macOS, Linux, and Windows

## Installation

### Method 1: Rust CLI (Recommended)

#### Install from Source

```bash
# Clone the repository
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner

# Build and install
cargo install --path cli

# Or build directly
cargo build --release --package build-cleaner-cli
```

After installation, you can use the `bc` command.

#### Install from Cargo (Coming Soon)

```bash
cargo install build-cleaner-cli
```

### Method 2: Node.js Package

```bash
npm install @build-cleaner/node
# or
pnpm add @build-cleaner/node
# or
yarn add @build-cleaner/node
```

### Method 3: Raycast Extension (macOS)

1. Clone the repository and build:
```bash
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner
pnpm install
cd raycast
pnpm build
```

2. Import the extension in Raycast:
   - Open Raycast
   - Go to Extensions → Import Extension
   - Select the `raycast` directory

## Usage

### 1. Rust CLI Usage

#### Basic Usage

```bash
# Clean current directory (using default configuration)
bc .

# Clean specified path
bc ~/projects

# Clean multiple paths
bc ./project1 ./project2 ./project3
```

#### Specify Cleaning Patterns

```bash
# Clean node_modules and dist directories
bc . --clean node_modules/ --clean dist/

# Clean log files
bc . --clean "*.log"

# Mix folder and file patterns
bc . --clean node_modules/ --clean dist/ --clean "*.tmp"
```

#### Preview Mode

```bash
# Preview mode (does not actually delete)
bc . --dry-run

# Preview mode + verbose output
bc . --dry-run --verbose
```

#### Interactive Confirmation

```bash
# Ask for confirmation before deletion
bc . --interactive
```

#### Using Configuration Files

```bash
# Use configuration file (supports YAML and JSON)
bc . --config .bc.yaml

# or
bc . --config .bc.json
```

Configuration file example (`.bc.yaml`):

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

#### Output Control

```bash
# Verbose output
bc . --verbose

# Quiet mode (minimal output)
bc . --quiet

# Debug mode
bc . --debug
```

#### Complete Example

```bash
# Preview mode + verbose output + interactive confirmation
bc ~/projects --clean node_modules/ --clean dist/ --dry-run --verbose --interactive
```

#### Help Information

```bash
# View help
bc --help

# View version
bc --version
```

### 2. Node.js API Usage

#### Basic Usage

```typescript
import { clean } from '@build-cleaner/node';

// Basic cleaning
const result = await clean({
  paths: ['.'],
});

console.log(`Deleted ${result.dirsDeleted} directories`);
console.log(`Freed ${result.spaceFreed} bytes`);
```

#### Specify Cleaning Patterns

```typescript
const result = await clean({
  paths: ['.'],
  patterns: ['node_modules/', 'dist/', 'build/', '*.log'],
});
```

#### Preview Mode

```typescript
const result = await clean({
  paths: ['.'],
  patterns: ['node_modules/'],
  dryRun: true, // Preview mode, does not actually delete
  verbose: true, // Show detailed information
});

console.log(`Will delete ${result.dirsMatched} directories`);
console.log(`Will free ${formatSize(result.spaceFreed)} space`);
```

#### Verbose Mode

```typescript
const result = await clean({
  paths: ['.'],
  verbose: true, // Enable verbose mode
});

// View deleted directory list
if (result.deletedDirs) {
  result.deletedDirs.forEach(dir => {
    console.log(`Deleted: ${dir}`);
  });
}

// View failed items
if (result.failedDirs && result.failedDirs.length > 0) {
  result.failedDirs.forEach(({path, error}) => {
    console.error(`Failed: ${path} - ${error}`);
  });
}
```

#### Using Configuration Files

```typescript
const result = await clean({
  paths: ['.'],
  configFile: '.bc.yaml', // Use configuration file
  verbose: true,
});
```

#### Error Handling

```typescript
import { clean } from '@build-cleaner/node';

try {
  const result = await clean({
    paths: ['.'],
  });
  
  if (result.filesFailed > 0 || result.dirsFailed > 0) {
    console.warn(`Warning: ${result.filesFailed} files and ${result.dirsFailed} directories failed to delete`);
  }
} catch (error) {
  console.error('Cleaning failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
```

#### CLI Tool

The Node.js package also provides a command-line tool:

```bash
# Using npx
npx @build-cleaner/node .

# Or use after local installation
npx build-cleaner-node .
```

For more Node.js API usage examples, see [npm/README-eng.md](./npm/README-eng.md).

### 3. Raycast Extension Usage (macOS)

#### Basic Usage

1. **Open Raycast**: Press `Cmd + Space` (or your configured shortcut)

2. **Search Command**: Type "build-cleaner"

3. **Enter Path**:
   - Directly enter the path to clean in the search box
   - Supports `~` expansion, such as `~/Documents`, `~/Downloads`, etc.
   - Supports auto-completion: automatically displays matching directory suggestions while typing (similar to shell tab completion)
   - Use `Cmd + →` to quickly complete the path
   - **Note**: Only supports paths under the `~` directory (safety restriction)

4. **Confirm Path**:
   - Press `Enter` after entering the path
   - If the path does not exist, an error message will be displayed
   - If the path exists and is under the `~` directory, a confirmation dialog will be shown

5. **Select Action**:
   - **Preview Clean**: View what will be deleted (does not actually delete)
   - **Execute Clean**: Actually delete files (use with caution)
   - Press `Opt + Esc` to cancel the operation

6. **Configure Cleaning Patterns** (Optional):
   After confirming the path, you can configure cleaning patterns:
   - `node_modules/` - Node.js dependency directory
   - `dist/` - Build output directory
   - `build/` - Build directory
   - `target/` - Rust build directory
   - `.next/` - Next.js build directory
   - `__pycache__/` - Python cache directory
   - `*.log` - Log files
   - `*.tmp` - Temporary files
   - Supports adding custom cleaning patterns

7. **View Results**: After cleaning is complete, a detailed report will be displayed, including:
   - Number of deleted directories and files
   - Disk space freed
   - Operation time
   - Detailed deletion list (copyable)
   - Failed items (if any)
   - Support for opening parent directories of deleted files in Finder

#### Shortcuts

- **Path Auto-completion**: Press `Cmd + →` while typing a path to quickly complete the currently selected suggested path
- **Confirm Clean**: After entering a valid path in the input box, press `Enter` to confirm and display action options
- **Cancel Operation**: Press `Opt + Esc` at any time to cancel the current operation
- **Copy Results**: In the result view, you can copy individual paths, statistics, or complete results

#### Configuration

You can configure in Raycast extension settings:

- **Default Path**: Set default cleaning path (e.g., `~/Documents`)
- **Default Cleaning Patterns**: Set default cleaning patterns (comma-separated, e.g., `node_modules/,dist/`)

#### Safety Features

- **Path Restriction**: Only allows cleaning paths under the `~` directory to prevent accidental deletion of system files
- **Preview Mode**: Uses preview mode by default, allowing you to view what will be deleted first
- **Secondary Confirmation**: Shows a confirmation dialog before executing cleanup, requiring explicit selection of "Preview Clean" or "Execute Clean"
- **Detailed Reports**: Provides detailed reports after cleaning, including all deleted files and directories

For more Raycast extension usage instructions, see [raycast/README-eng.md](./raycast/README-eng.md).

## Cleaning Pattern Format

### Folder Pattern

Folder patterns end with `/`:

- `node_modules/` - Matches all node_modules directories
- `dist/` - Matches all dist directories
- `build/` - Matches all build directories
- `.next/` - Matches all .next directories

### File Pattern

File patterns use wildcards:

- `*.log` - Matches all .log files
- `*.tmp` - Matches all .tmp files
- `*.pyc` - Matches all .pyc files
- `temp.txt` - Matches specific filename

### Mixed Usage

You can specify multiple folder and file patterns at the same time:

```bash
bc . --clean node_modules/ --clean dist/ --clean "*.log" --clean "*.tmp"
```

## Default Configuration

According to project type, build-cleaner automatically loads default configurations:

- **Node.js**: `node_modules`, `dist`, `build`, `.next`
- **Rust**: `target`
- **Python**: `__pycache__`, `*.pyc`
- **Go**: `vendor`, `bin`
- **Java**: `target`, `build`

## Project Structure

```
build-cleaner/
├── core/              # Rust Core crate - Core functionality library
├── cli/               # Rust CLI crate - Command-line tool
├── npm/               # npm package - Node.js API
├── raycast/           # Raycast extension - macOS quick actions
├── Cargo.toml         # Rust workspace configuration
└── pnpm-workspace.yaml # pnpm workspace configuration
```

## Development

### Rust Project

```bash
# Build all Rust projects
cargo build

# Run CLI
cargo run --bin bc

# Run tests
cargo test

# Code format check
cargo fmt --check --all

# Code check
cargo clippy --workspace -- -D warnings
```

### Node.js Project

```bash
# Install dependencies
pnpm install

# Build npm package
cd npm && pnpm build

# Build Raycast extension
cd raycast && pnpm build

# Build all projects (Rust + Node.js)
pnpm run build:all
```

## Related Documentation

- [npm Package Documentation](./npm/README-eng.md) - Detailed Node.js API documentation
- [Raycast Extension Documentation](./raycast/README-eng.md) - Detailed Raycast extension documentation

## License
MIT
