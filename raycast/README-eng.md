# build-cleaner Raycast Extension

Raycast extension that provides fast cleaning of temporary files and directories in projects.

**[中文](README.md) | [English](README-eng.md)**

## Features

- 🚀 **Fast Cleaning**: Quick access to cleaning functionality through Raycast
- 📦 **Multi-Project Type Support**: Automatically recognizes Node.js, Rust, Python, Go, Java, and other project types
- 🎯 **Flexible Cleaning Patterns**: Supports selecting common cleaning patterns (node_modules, dist, build, etc.)
- 👁️ **Preview Mode**: Preview what will be cleaned before deletion
- 📊 **Detailed Reports**: Display cleaning results and statistics

## Installation

### Install from Source

1. Clone the repository:
```bash
git clone https://github.com/xjiaxiang/build-cleaner.git
cd build-cleaner
```

2. Install dependencies:
```bash
pnpm install
```

3. Build Rust CLI (if not already built):
```bash
cargo build --release --package build-cleaner-cli
```

4. Build Raycast extension:
```bash
cd raycast
pnpm build
```

5. Import the extension in Raycast:
   - Open Raycast
   - Go to Extensions → Import Extension
   - Select the `raycast` directory

### Development Mode

```bash
cd raycast
pnpm dev
```

This runs the extension in development mode with hot reload support.

## Usage

1. **Open Raycast**: Press `Cmd + Space` (or your configured shortcut)

2. **Search "build-cleaner"**: Type the command name

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
   - **Execute Clean**: Actually delete files (files will be moved to trash, use with caution)
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
   - **Detailed deletion list**: Shows all deleted directory and file paths (up to 50, copyable)
   - Failed items (if any): Shows files and directories that failed to delete and their error messages
   - Support for opening parent directories of deleted files in Finder

## Configuration

### Raycast Extension Settings

You can configure in Raycast extension settings:

- **Default Path**: Set default cleaning path (e.g., `~/Documents`)
- **Default Cleaning Patterns**: Set default cleaning patterns (comma-separated, e.g., `node_modules/,dist/`)

### Shortcuts

- **Path Auto-completion**: Press `Cmd + →` while typing a path to quickly complete the currently selected suggested path
- **Confirm Clean**: After entering a valid path in the input box, press `Enter` to confirm and display action options
- **Cancel Operation**: Press `Opt + Esc` at any time to cancel the current operation
- **Copy Results**: In the result view, you can copy individual paths, statistics, or complete results

### Environment Variable Configuration

The extension automatically searches for the build-cleaner CLI in the following order:

1. Globally installed CLI (`~/.cargo/bin/bc`)
2. Project-built CLI found by traversing up from the current working directory
3. Path specified by the `BUILD_CLEANER_CLI_PATH` environment variable
4. Development paths specified by the `BUILD_CLEANER_DEV_PATHS` environment variable
5. Common default paths (`~/projects/build-cleaner`, `~/build-cleaner`)

#### BUILD_CLEANER_CLI_PATH

Directly specify the full path to the CLI binary:

```bash
export BUILD_CLEANER_CLI_PATH="/path/to/build-cleaner/target/release/bc"
```

#### BUILD_CLEANER_DEV_PATHS

Specify custom development paths (supports multiple paths, separated by semicolons or commas):

```bash
# Single path (directory, will automatically append target/release/bc)
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner"

# Multiple paths (separated by semicolons)
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner;~/projects/my-build-cleaner"

# Full path
export BUILD_CLEANER_DEV_PATHS="/path/to/build-cleaner/target/release/bc"
```

**Note**:
- Supports `~` expansion to home directory
- If the path is a directory, it will automatically append `target/release/bc`
- If the path is a full file path, it will be used directly
- Multiple paths are separated by semicolons (`;`) or commas (`,`)

## Safety Features

- **Path Restriction**: Only allows cleaning paths under the `~` directory to prevent accidental deletion of system files
- **Preview Mode**: Uses preview mode by default, allowing you to view what will be deleted first
- **Secondary Confirmation**: Shows a confirmation dialog before executing cleanup, requiring explicit selection of "Preview Clean" or "Execute Clean"
- **Trash Deletion**: Files are moved to the system trash instead of being permanently deleted, and can be recovered from the trash
- **Detailed Reports**: Provides detailed reports after cleaning, including all deleted files and directories

## Notes

1. **Path Restriction**: Only supports paths under the `~` directory for safety reasons
2. **Preview Mode**: Uses preview mode by default and will not actually delete files
3. **Execute Mode**: After executing cleanup, files will be moved to the system trash and can be recovered
4. **Path Input**: Supports `~` expansion and auto-completion, use `Cmd + →` to quickly complete paths
5. **Cleaning Patterns**: If no cleaning patterns are selected, the default configuration for the project type will be used

## Troubleshooting

### Extension Cannot Run

1. Ensure Rust CLI is built:
```bash
cargo build --release --package build-cleaner-cli
```

2. Ensure npm package is installed:
```bash
cd npm
pnpm install
```

3. Rebuild the extension:
```bash
cd raycast
pnpm build
```

### CLI Binary Not Found

If the extension prompts that the build-cleaner CLI cannot be found, try the following methods:

1. **Install CLI globally**:
```bash
cargo install --path cli
```

2. **Use environment variables to specify path**:
```bash
# Method 1: Directly specify CLI path
export BUILD_CLEANER_CLI_PATH="/path/to/build-cleaner/target/release/bc"

# Method 2: Specify development paths (supports multiple)
export BUILD_CLEANER_DEV_PATHS="~/Documents/xjx-work/10-项目/build-cleaner"
```

3. **Run in project root directory**: Ensure you run the extension in the project directory containing `Cargo.toml`

### Cleaning Failed

- Check if the path is correct
- Check file permissions
- View error messages for detailed information

## Development

### Project Structure

```
raycast/
├── src/
│   └── index.tsx      # Main entry file
├── package.json        # Dependency configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This document
```

### Tech Stack

- **@raycast/api**: Raycast extension API
- **TypeScript**: Type safety
- **React**: UI components

**Note**: This extension directly calls the Rust CLI and does not depend on the `@build-cleaner/node` package to avoid issues when Raycast packages it.

## Related Projects

- [build-cleaner-core](../core/README-eng.md) - Rust core library
- [build-cleaner-cli](../cli/README-eng.md) - Rust CLI tool
- [@build-cleaner/node](../npm/README-eng.md) - Node.js API package

## License

MIT

## Author

xjiaxiang
