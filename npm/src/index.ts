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

	// 搜索匹配的文件和文件夹
	const searchResult = SearchEngine.search(expandedPaths, config);

	// 创建删除计划
	const deletePlan = DeleteEngine.createDeletePlan(searchResult);

	// 执行删除
	const deleteResult = DeleteEngine.executeDeletion(
		deletePlan,
		options.dryRun || false
	);

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
