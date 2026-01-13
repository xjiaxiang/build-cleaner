import {ConfigLoader, Config} from "./config";
import {SearchEngine, SearchResult} from "./search";
import {DeleteEngine, DeletePlan, DeleteResult} from "./delete";
import {CleanOptions, CleanResult} from "./types";

/**
 * 执行清理操作
 *
 * @param options 清理选项
 * @returns Promise<CleanResult> 清理结果
 * @throws Error 如果清理失败
 *
 * @example
 * ```typescript
 * import { clean } from '@build-cleaner/node';
 *
 * const result = await clean({
 *   paths: ['.'],
 *   patterns: ['node_modules/', 'dist/'],
 *   dryRun: true,
 *   verbose: true,
 * });
 *
 * console.log(`Deleted ${result.dirsDeleted} directories`);
 * console.log(`Freed ${result.spaceFreed} bytes`);
 * ```
 */
export async function clean(options: CleanOptions): Promise<CleanResult> {
	const startTime = Date.now();

	// 验证选项
	if (!options.paths || options.paths.length === 0) {
		throw new Error("At least one path is required");
	}

	// 展开和验证路径
	const expandedPaths = options.paths.map((p) => {
		const expanded = ConfigLoader.expandPath(p);
		ConfigLoader.validatePath(expanded);
		return expanded;
	});

	// 加载配置
	// 使用第一个路径作为项目根路径
	const projectPath = expandedPaths[0];
	const config = ConfigLoader.loadConfig(
		projectPath,
		options.configFile || null,
		options.patterns || []
	);

	// 搜索匹配的文件和文件夹（带进度回调）
	const progressCallback = options.quiet
		? null
		: (
				filesScanned: number,
				dirsScanned: number,
				filesMatched: number,
				dirsMatched: number,
				totalSize: number
		  ) => {
				// 格式化大小
				const formatSize = (bytes: number): string => {
					const UNITS = ["B", "KB", "MB", "GB", "TB"];
					let size = bytes;
					let unitIdx = 0;
					while (size >= 1024 && unitIdx < UNITS.length - 1) {
						size /= 1024;
						unitIdx++;
					}
					return `${size.toFixed(2)} ${UNITS[unitIdx]}`;
				};

				// 使用同步写入并立即刷新，避免输出延迟
				process.stderr.write(
					`\r📊 Scanning... Files: ${filesScanned}, Dirs: ${dirsScanned}, Matched: ${filesMatched} files, ${dirsMatched} dirs, Size: ${formatSize(
						totalSize
					)}`
				);
		  };

	const searchResult = SearchEngine.searchWithProgress(
		expandedPaths,
		config,
		progressCallback
	);

	// 清除进度行并刷新
	if (!options.quiet) {
		// 先清除当前行，然后输出完成信息
		process.stderr.write("\r✅ Scanning completed\n");
		// 确保输出立即刷新（使用同步方式）
		if (process.stderr.isTTY) {
			process.stderr.write("");
		}
	}

	// 创建删除计划
	const deletePlan = DeleteEngine.createDeletePlan(searchResult);

	// 执行删除
	let deleteResult: DeleteResult;
	if (options.interactive && !options.dryRun) {
		// 交互模式下，逐个确认删除
		if (!options.quiet) {
			const totalItems = deletePlan.files.length + deletePlan.dirs.length;
			console.log(
				`\n📋 Found ${deletePlan.dirs.length} directories and ${deletePlan.files.length} files to delete (${totalItems} items total).`
			);
			console.log(
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
			);
			console.log(
				"⚠️  You will be prompted for each item. Options: y=yes, N=skip, a=all, q=quit"
			);
			console.log(
				"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
			);
		}
		try {
			deleteResult = await DeleteEngine.executeDeletionInteractive(
				deletePlan,
				options.quiet || false
			);
		} catch (error) {
			if (error instanceof Error && error.message === "User cancelled") {
				throw new Error("Operation cancelled by user");
			}
			throw error;
		}
	} else {
		// 非交互模式或 dry-run 模式
		deleteResult = await DeleteEngine.executeDeletion(
			deletePlan,
			options.dryRun || false
		);
	}

	// 计算耗时
	const timeTaken = (Date.now() - startTime) / 1000;

	// 构建结果
	const result: CleanResult = {
		filesScanned: searchResult.totalFilesScanned,
		dirsScanned: searchResult.totalDirsScanned,
		filesMatched: searchResult.files.length,
		dirsMatched: searchResult.folders.length,
		filesDeleted: deleteResult.deletedFiles.length,
		dirsDeleted: deleteResult.deletedDirs.length,
		filesFailed: deleteResult.failedFiles.length,
		dirsFailed: deleteResult.failedDirs.length,
		spaceFreed: deleteResult.totalSize,
		timeTaken,
	};

	// 如果启用详细模式，添加详细信息
	if (options.verbose) {
		result.deletedDirs = deleteResult.deletedDirs;
		result.deletedFiles = deleteResult.deletedFiles;
		result.failedDirs = deleteResult.failedDirs;
		result.failedFiles = deleteResult.failedFiles;
	}

	return result;
}

// 导出类型
export type {CleanOptions, CleanResult, ErrorInfo} from "./types";

// 导出内部模块（用于测试或高级用法）
export {ConfigLoader, Config} from "./config";
export {SearchEngine, SearchResult} from "./search";
export {DeleteEngine, DeletePlan, DeleteResult} from "./delete";
