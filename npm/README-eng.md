# @build-cleaner/node

Node.js API for build-cleaner - A fast tool for cleaning temporary files and directories in various project types.

**[中文](README.md) | [English](README-eng.md)**

## Introduction

`@build-cleaner/node` is the Node.js implementation of build-cleaner, providing TypeScript/JavaScript APIs for using build-cleaner functionality in Node.js environments. It is a pure Node.js implementation that does not depend on the Rust CLI and can be used directly in Node.js environments.

## Features

- 🚀 **Pure Node.js Implementation**: No need to install Rust or compile binary files, use directly
- 📦 **Multi-Project Type Support**: Automatically recognizes Node.js, Rust, Python, Go, Java, and other project types
- 🎯 **Flexible Cleaning Rules**: Supports wildcard patterns, folder matching, exclusion rules, etc.
- 📊 **Detailed Statistics**: Provides complete cleaning reports and statistics
- 🔒 **Safe and Reliable**: Supports preview mode, safety checks, trash deletion, etc.
- 📝 **TypeScript Support**: Complete TypeScript type definitions

## Installation

```bash
npm install @build-cleaner/node
# or
pnpm add @build-cleaner/node
# or
yarn add @build-cleaner/node
```

### Prerequisites

- Node.js >= 22.0.0

No need to install Rust or any other dependencies, you can use it directly after installing the package.

## Quick Start

```typescript
import { clean } from '@build-cleaner/node';

// Basic usage: clean current directory
const result = await clean({
  paths: ['.'],
});

console.log(`Deleted ${result.dirsDeleted} directories`);
console.log(`Freed ${result.spaceFreed} bytes`);
```

## API Documentation

### `clean(options: CleanOptions): Promise<CleanResult>`

The main function for executing cleaning operations.

#### Parameters

##### `CleanOptions`

```typescript
interface CleanOptions {
  /**
   * List of paths to search (required, at least one)
   */
  paths: string[];
  
  /**
   * Cleaning pattern list (optional, folders end with /, files use wildcards)
   * Example: ['node_modules/', 'dist/', '*.log']
   */
  patterns?: string[];
  
  /**
   * Configuration file path (optional, supports YAML and JSON formats)
   */
  configFile?: string;
  
  /**
   * Whether to enable preview mode (does not actually delete, only shows what will be deleted)
   * Default: false
   */
  dryRun?: boolean;
  
  /**
   * Whether to enable interactive confirmation (ask user for confirmation before each deletion)
   * In interactive mode, each file/directory will be confirmed, options: y=yes, N=skip, a=all, q=quit
   * Note: In non-CLI environments, interactive mode requires manual implementation of confirmation logic
   * Default: false
   */
  interactive?: boolean;
  
  /**
   * Whether to enable verbose output (show detailed cleaning report)
   * Default: false
   */
  verbose?: boolean;
  
  /**
   * Whether to enable quiet mode (minimal output, only show errors)
   * Default: false
   */
  quiet?: boolean;
  
  /**
   * Whether to enable debug mode (show debug logs)
   * Default: false
   */
  debug?: boolean;
}
```

#### Return Value

##### `CleanResult`

```typescript
interface CleanResult {
  /**
   * Number of files scanned
   */
  filesScanned: number;
  
  /**
   * Number of directories scanned
   */
  dirsScanned: number;
  
  /**
   * Number of files matched
   */
  filesMatched: number;
  
  /**
   * Number of directories matched
   */
  dirsMatched: number;
  
  /**
   * Number of files successfully deleted
   */
  filesDeleted: number;
  
  /**
   * Number of directories successfully deleted
   */
  dirsDeleted: number;
  
  /**
   * Number of files that failed to delete
   */
  filesFailed: number;
  
  /**
   * Number of directories that failed to delete
   */
  dirsFailed: number;
  
  /**
   * Disk space freed (bytes)
   */
  spaceFreed: number;
  
  /**
   * Operation time taken (seconds)
   */
  timeTaken: number;
  
  /**
   * List of deleted directories (only in verbose mode)
   */
  deletedDirs?: string[];
  
  /**
   * List of deleted files (only in verbose mode)
   */
  deletedFiles?: string[];
  
  /**
   * List of failed directories (only in verbose mode)
   */
  failedDirs?: Array<{path: string; error: string}>;
  
  /**
   * List of failed files (only in verbose mode)
   */
  failedFiles?: Array<{path: string; error: string}>;
}
```

## Usage Examples

### Example 1: Basic Cleaning

```typescript
import { clean } from '@build-cleaner/node';

async function basicClean() {
  const result = await clean({
    paths: ['.'],
  });
  
  console.log('Cleaning completed!');
  console.log(`- Deleted ${result.dirsDeleted} directories`);
  console.log(`- Deleted ${result.filesDeleted} files`);
  console.log(`- Freed ${formatSize(result.spaceFreed)} space`);
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

### Example 2: Specify Cleaning Patterns

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithPatterns() {
  const result = await clean({
    paths: ['.'],
    patterns: ['node_modules/', 'dist/', 'build/', '*.log'],
  });
  
  console.log(`Cleaned ${result.dirsDeleted} directories and ${result.filesDeleted} files`);
}
```

### Example 3: Preview Mode

```typescript
import { clean } from '@build-cleaner/node';

async function previewClean() {
  const result = await clean({
    paths: ['.'],
    patterns: ['node_modules/'],
    dryRun: true, // Preview mode, does not actually delete
    verbose: true, // Show detailed information
  });
  
  console.log('Preview results:');
  console.log(`- Will delete ${result.dirsMatched} directories`);
  console.log(`- Will delete ${result.filesMatched} files`);
  console.log(`- Will free ${formatSize(result.spaceFreed)} space`);
  
  if (result.deletedDirs) {
    console.log('\nDirectories to be deleted:');
    result.deletedDirs.forEach(dir => console.log(`  - ${dir}`));
  }
}
```

### Example 4: Verbose Mode

```typescript
import { clean } from '@build-cleaner/node';

async function verboseClean() {
  const result = await clean({
    paths: ['.'],
    verbose: true, // Enable verbose mode
  });
  
  console.log('Detailed cleaning report:');
  console.log(`- Scanned ${result.filesScanned} files`);
  console.log(`- Scanned ${result.dirsScanned} directories`);
  console.log(`- Deleted ${result.dirsDeleted} directories`);
  console.log(`- Deleted ${result.filesDeleted} files`);
  console.log(`- Freed ${formatSize(result.spaceFreed)} space`);
  console.log(`- Time taken: ${result.timeTaken.toFixed(2)} seconds`);
  
  if (result.failedDirs && result.failedDirs.length > 0) {
    console.log('\nFailed directories:');
    result.failedDirs.forEach(({path, error}) => {
      console.log(`  - ${path}: ${error}`);
    });
  }
}
```

### Example 5: Using Configuration File

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithConfig() {
  const result = await clean({
    paths: ['.'],
    configFile: '.bc.yaml', // Use configuration file
    verbose: true,
  });
  
  console.log('Cleaning completed!');
}
```

### Example 6: Error Handling

```typescript
import { clean } from '@build-cleaner/node';

async function cleanWithErrorHandling() {
  try {
    const result = await clean({
      paths: ['.'],
    });
    
    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      console.warn(`Warning: ${result.filesFailed} files and ${result.dirsFailed} directories failed to delete`);
      
      // In verbose mode, you can view failure details
      if (result.failedDirs) {
        result.failedDirs.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
    }
  } catch (error) {
    console.error('Cleaning failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

### Example 7: Clean Multiple Paths

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
  
  console.log(`Cleaned ${result.dirsDeleted} directories across multiple projects`);
}
```

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

```typescript
const result = await clean({
  paths: ['.'],
  patterns: [
    'node_modules/',  // Folder
    'dist/',          // Folder
    '*.log',          // File
    '*.tmp',          // File
  ],
});
```

## Default Configuration

According to project type, build-cleaner automatically loads default configurations:

- **Node.js**: `node_modules`, `dist`, `build`, `.next`
- **Rust**: `target`
- **Python**: `__pycache__`, `*.pyc`
- **Go**: `vendor`, `bin`
- **Java**: `target`, `build`

## CLI Tool

In addition to the programming API, `@build-cleaner/node` also provides a command-line tool `build-cleaner-node`.

### Usage After Installation

```bash
# Use directly after global installation
npx @build-cleaner/node .

# Or use after local installation
pnpm add @build-cleaner/node
npx build-cleaner-node .
```

### CLI Options

```bash
Usage: build-cleaner-node [OPTIONS] <PATHS...>

Command-line tool for batch cleaning temporary directories and files in projects

Arguments:
  <PATHS...>              List of paths to search (required, at least one)

Options:
  --clean <PATTERN>       Cleaning pattern list (folders end with /, files use wildcards)
                         Can be used multiple times, e.g.: --clean node_modules/ --clean dist/
  --config <FILE>         Configuration file path (optional, supports YAML and JSON formats)
  --dry-run               Preview mode (does not actually delete, only shows what will be deleted)
  -i, --interactive       Interactive confirmation (ask user for confirmation before each deletion, options: y/N/a/q)
  -v, --verbose           Verbose output (show detailed cleaning report)
  -q, --quiet             Quiet mode (minimal output, only show errors)
  --debug                 Debug mode (show debug logs)
  -h, --help              Show help information
  -V, --version           Show version information

Examples:
  # Clean current directory
  build-cleaner-node .

  # Preview mode
  build-cleaner-node --dry-run ~/projects

  # Specify cleaning patterns
  build-cleaner-node --clean node_modules/ --clean dist/ .

  # Use configuration file
  build-cleaner-node --config .bc.yaml ~/projects

  # Verbose output
  build-cleaner-node --verbose ~/projects
```

## Advanced Usage

### Export Internal Modules

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

// Load configuration
const config = ConfigLoader.loadConfig('.', null, ['node_modules/']);

// Search files (with progress callback)
const progressCallback = (
  filesScanned: number,
  dirsScanned: number,
  filesMatched: number,
  dirsMatched: number,
  totalSize: number
) => {
  console.log(`Scan progress: ${filesScanned} files, ${dirsMatched} matched`);
};

const searchResult = SearchEngine.searchWithProgress(
  ['.'],
  config,
  progressCallback
);

// Create deletion plan
const deletePlan = DeleteEngine.createDeletePlan(searchResult);

// Execute deletion (preview mode)
const deleteResult = DeleteEngine.executeDeletion(deletePlan, true);
```

## Error Handling

### Common Errors

1. **Path Does Not Exist**
   ```
   Error: Path does not exist: /path/to/dir
   ```
   Solution: Check if the path is correct and ensure the path exists

2. **At Least One Path Required**
   ```
   Error: At least one path is required
   ```
   Solution: Ensure at least one path is provided in the `paths` array

3. **Insufficient Permissions**
   ```
   Error: Permission denied
   ```
   Solution: Ensure you have sufficient permissions to access and delete files/directories

4. **Invalid Configuration File Format**
   ```
   Error: Invalid config file format
   ```
   Solution: Check if the configuration file is in valid YAML or JSON format

### Error Handling Example

```typescript
import { clean } from '@build-cleaner/node';

async function safeClean() {
  try {
    const result = await clean({
      paths: ['.'],
      verbose: true, // Enable verbose mode to get failure details
    });
    
    // Check if there are failed items
    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      console.warn('Some files failed to delete');
      
      if (result.failedDirs && result.failedDirs.length > 0) {
        console.error('\nFailed directories:');
        result.failedDirs.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
      
      if (result.failedFiles && result.failedFiles.length > 0) {
        console.error('\nFailed files:');
        result.failedFiles.forEach(({path, error}) => {
          console.error(`  ${path}: ${error}`);
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('ENOENT') || errorMessage.includes('does not exist')) {
      console.error('Error: Specified path does not exist');
    } else if (errorMessage.includes('At least one path is required')) {
      console.error('Error: At least one path must be specified');
    } else {
      console.error('Cleaning failed:', errorMessage);
    }
    
    throw error;
  }
}
```

## Notes

1. **Pure Node.js Implementation**:
   - No need to install Rust or any binary files
   - Directly uses Node.js standard library implementation
   - Uses efficient asynchronous file system traversal

2. **Platform Support**:
   - Supports all platforms supported by Node.js (macOS, Linux, Windows)
   - Path format supports `~` expansion (e.g., `~/projects`)

3. **Interactive Mode**:
   - In CLI tools, interactive mode will prompt the user for confirmation for each file/directory
   - Options: `y`=yes (delete), `N`=skip (skip), `a`=all (delete all remaining), `q`=quit (exit)
   - In programming APIs, interactive mode requires manual implementation of confirmation logic
   - It is recommended to use `dryRun` for preview before executing deletion

4. **Progress Display**:
   - By default, real-time scan progress will be displayed
   - Progress information is output to stderr and will not affect stdout results
   - Use `quiet: true` to disable progress display

5. **Performance Optimization**:
   - For large numbers of files, it is recommended to use `quiet` mode to reduce output overhead
   - The scanning process uses asynchronous traversal and will not block the event loop
   - Supports parallel processing of multiple paths

6. **Error Handling**:
   - Even if some files fail to delete, the function will still return results
   - Need to check `filesFailed` and `dirsFailed` fields
   - Can view detailed failure information in `verbose` mode

7. **Path Processing**:
   - Supports relative and absolute paths
   - Supports `~` expansion to user home directory
   - Automatically validates if paths exist

8. **Safe Deletion**:
   - Files will be moved to the system trash instead of being permanently deleted
   - Can recover accidentally deleted files from the trash
   - Supports macOS, Linux, Windows trash mechanisms

## Type Definitions

Complete TypeScript type definitions are included in the package:

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

## Progress Display

In non-quiet mode, the `clean` function will automatically display scan progress. Progress information is updated in real-time to standard error output (stderr), including:

- Number of files scanned
- Number of directories scanned
- Number of files matched
- Number of directories matched
- Total size of matched files

```typescript
// Progress will be displayed by default (quiet: false)
const result = await clean({
  paths: ['.'],
  // quiet: false, // Default value
});

// Quiet mode does not display progress
const result = await clean({
  paths: ['.'],
  quiet: true,
});
```

## Development

### Build

```bash
cd npm
pnpm build
```

### Test

```bash
pnpm test
```

### Dependencies

- **trash**: Trash deletion (cross-platform support)
- **TypeScript**: Type safety
- **Node.js Standard Library**: File system operations

## Related Projects

- [build-cleaner-core](../core/README-eng.md) - Rust core library (optional, for Rust CLI)
- [build-cleaner-cli](../cli/README-eng.md) - Rust CLI tool (optional, standalone tool)
- [build-cleaner-raycast](../raycast/README-eng.md) - Raycast extension

## License

MIT

## Author

xjiaxiang
