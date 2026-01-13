#!/usr/bin/env node

/**
 * @build-cleaner/node CLI
 *
 * 命令行工具，提供与 Rust CLI 类似的接口
 */

import {clean, CleanResult} from "./index";
import * as path from "path";
import * as os from "os";

interface CLIArgs {
	paths: string[];
	patterns?: string[];
	configFile?: string;
	dryRun: boolean;
	interactive: boolean;
	verbose: boolean;
	quiet: boolean;
	debug: boolean;
}

/**
 * 解析命令行参数
 */
function parseArgs(): CLIArgs {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	if (args.includes("--version") || args.includes("-V")) {
		const pkg = require("../package.json");
		console.log(pkg.version);
		process.exit(0);
	}

	const result: CLIArgs = {
		paths: [],
		dryRun: false,
		interactive: false,
		verbose: false,
		quiet: false,
		debug: false,
	};

	const patterns: string[] = [];
	let configFile: string | undefined;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--dry-run") {
			result.dryRun = true;
		} else if (arg === "--interactive" || arg === "-i") {
			result.interactive = true;
		} else if (arg === "--verbose" || arg === "-v") {
			result.verbose = true;
		} else if (arg === "--quiet" || arg === "-q") {
			result.quiet = true;
		} else if (arg === "--debug") {
			result.debug = true;
		} else if (arg === "--clean" && i + 1 < args.length) {
			// 支持多个 --clean 参数
			i++;
			patterns.push(args[i]);
		} else if (arg === "--config" && i + 1 < args.length) {
			i++;
			configFile = args[i];
		} else if (!arg.startsWith("-")) {
			// 位置参数：路径
			result.paths.push(arg);
		}
	}

	if (result.paths.length === 0) {
		console.error("Error: At least one path is required");
		printHelp();
		process.exit(1);
	}

	if (patterns.length > 0) {
		result.patterns = patterns;
	}

	if (configFile) {
		result.configFile = configFile;
	}

	return result;
}

/**
 * 打印帮助信息
 */
function printHelp() {
	console.log(`
Usage: build-cleaner-node [OPTIONS] <PATHS...>

A fast tool for batch cleaning temporary directories and files in projects

Arguments:
  <PATHS...>              List of paths to search (required, at least one)

Options:
  --clean <PATTERN>       Cleanup pattern list (folders end with /, files use wildcards)
                         Can be used multiple times, e.g.: --clean node_modules/ --clean dist/
  --config <FILE>         Configuration file path (optional, supports YAML and JSON formats)
  --dry-run               Preview mode (does not actually delete, only shows what will be deleted)
  -i, --interactive       Interactive confirmation (asks for user confirmation before deletion)
  -v, --verbose           Verbose output (shows detailed cleanup report)
  -q, --quiet             Quiet mode (minimal output, only shows errors)
  --debug                 Debug mode (shows debug logs)
  -h, --help              Show help information
  -V, --version           Show version information

Examples:
  # Clean current directory
  build-cleaner-node .

  # Preview mode
  build-cleaner-node --dry-run ~/projects

  # Specify cleanup patterns
  build-cleaner-node --clean node_modules/ --clean dist/ .

  # Use configuration file
  build-cleaner-node --config .bc.yaml ~/projects

  # Verbose output
  build-cleaner-node --verbose ~/projects
`);
}

/**
 * 格式化大小
 */
function formatSize(bytes: number): string {
	const UNITS = ["B", "KB", "MB", "GB", "TB"];
	let size = bytes;
	let unitIdx = 0;
	while (size >= 1024 && unitIdx < UNITS.length - 1) {
		size /= 1024;
		unitIdx++;
	}
	return `${size.toFixed(2)} ${UNITS[unitIdx]}`;
}

/**
 * 格式化报告
 */
function formatReport(result: CleanResult, verbose: boolean): string {
	if (verbose) {
		const filesMatched = result.filesDeleted + result.filesFailed;
		const dirsMatched = result.dirsDeleted + result.dirsFailed;

		let report = `📊 Cleanup Report:
 - Files scanned: ${result.filesScanned}
 - Directories scanned: ${result.dirsScanned}
 - Files matched: ${filesMatched}
 - Directories matched: ${dirsMatched}
 - Files deleted: ${result.filesDeleted}
 - Directories deleted: ${result.dirsDeleted}
 - Files failed: ${result.filesFailed}
 - Directories failed: ${result.dirsFailed}
 - Space freed: ${formatSize(result.spaceFreed)}
 - Time taken: ${result.timeTaken.toFixed(2)}s`;

		// 添加删除的目录详细信息
		if (result.deletedDirs && result.deletedDirs.length > 0) {
			report += "\n\n📁 Deleted Directories:";
			for (let i = 0; i < Math.min(result.deletedDirs.length, 50); i++) {
				report += `\n   - ${result.deletedDirs[i]}`;
			}
			if (result.deletedDirs.length > 50) {
				report += `\n   ... and ${
					result.deletedDirs.length - 50
				} more directories`;
			}
		}

		// 添加删除的文件详细信息
		if (result.deletedFiles && result.deletedFiles.length > 0) {
			report += "\n\n📄 Deleted Files:";
			for (let i = 0; i < Math.min(result.deletedFiles.length, 50); i++) {
				report += `\n   - ${result.deletedFiles[i]}`;
			}
			if (result.deletedFiles.length > 50) {
				report += `\n   ... and ${result.deletedFiles.length - 50} more files`;
			}
		}

		// 添加失败的目录详细信息
		if (result.failedDirs && result.failedDirs.length > 0) {
			report += "\n\n❌ Failed Directories:";
			for (const {path: dirPath, error} of result.failedDirs) {
				report += `\n   - ${dirPath}: ${error}`;
			}
		}

		// 添加失败的文件详细信息
		if (result.failedFiles && result.failedFiles.length > 0) {
			report += "\n\n❌ Failed Files:";
			for (const {path: filePath, error} of result.failedFiles) {
				report += `\n   - ${filePath}: ${error}`;
			}
		}

		return report;
	} else {
		return `Cleaned ${result.dirsDeleted} directories, ${
			result.filesDeleted
		} files, freed ${formatSize(result.spaceFreed)}`;
	}
}

/**
 * 主函数
 */
async function main() {
	try {
		const args = parseArgs();

		// 显示扫描开始信息
		if (!args.quiet) {
			if (args.dryRun) {
				console.log("🔍 Scanning for files to clean (dry-run mode)...");
			} else {
				console.log("🔍 Scanning for files to clean...");
			}
		}

		// 执行清理
		const result = await clean({
			paths: args.paths,
			patterns: args.patterns,
			configFile: args.configFile,
			dryRun: args.dryRun,
			interactive: args.interactive,
			verbose: args.verbose,
			quiet: args.quiet,
			debug: args.debug,
		});

		// 如果是预览模式，显示提示
		if (args.dryRun && !args.verbose) {
			console.log("\nℹ️  Run without --dry-run to actually clean");
		}

		// 显示报告
		if (!args.quiet) {
			console.log(formatReport(result, args.verbose));
		}

		// 显示完成信息
		if (args.verbose && !args.quiet) {
			console.log("\n✅ Cleanup completed");
		}

		// 如果有失败的项目，显示警告
		if (result.filesFailed > 0 || result.dirsFailed > 0) {
			if (!args.quiet) {
				console.error(
					`\nWarning: Some items failed to delete: ${result.filesFailed} files, ${result.dirsFailed} directories`
				);
			}
		}

		process.exit(0);
	} catch (error) {
		console.error(
			`Error: ${error instanceof Error ? error.message : String(error)}`
		);
		if (process.env.DEBUG) {
			console.error(error);
		}
		process.exit(1);
	}
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
	main();
}
