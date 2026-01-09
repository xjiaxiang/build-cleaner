import * as fs from "fs";
import * as path from "path";
import {SearchResult} from "./search";

/**
 * 删除计划
 */
export interface DeletePlan {
	/** 要删除的文件列表 */
	files: string[];
	/** 要删除的目录列表（按深度从深到浅排序） */
	dirs: string[];
}

/**
 * 删除结果
 */
export interface DeleteResult {
	/** 成功删除的文件列表 */
	deletedFiles: string[];
	/** 成功删除的目录列表 */
	deletedDirs: string[];
	/** 删除失败的文件列表 */
	failedFiles: Array<{path: string; error: string}>;
	/** 删除失败的目录列表 */
	failedDirs: Array<{path: string; error: string}>;
	/** 删除文件的总大小（字节） */
	totalSize: number;
}

/**
 * 删除引擎，负责创建删除计划和执行删除操作
 */
export class DeleteEngine {
	/**
	 * 根据搜索结果创建删除计划，目录按深度从深到浅排序
	 */
	static createDeletePlan(searchResult: SearchResult): DeletePlan {
		const files = [...searchResult.files];

		// 按深度排序目录（从深到浅）
		const dirsWithDepth = searchResult.folders.map((dir) => {
			const depth = dir.split(path.sep).length;
			return {dir, depth};
		});

		dirsWithDepth.sort((a, b) => b.depth - a.depth);
		const dirs = dirsWithDepth.map((item) => item.dir);

		return {files, dirs};
	}

	/**
	 * 检查路径是否安全，防止删除系统关键目录
	 */
	static checkSafety(pathStr: string): void {
		let canonical: string;
		try {
			canonical = fs.realpathSync(pathStr);
		} catch {
			throw new Error(`Path not found: ${pathStr}`);
		}

		const systemDirs = [
			"/",
			"/usr",
			"/etc",
			"/bin",
			"/sbin",
			"/var",
			"/sys",
			"/proc",
		];
		for (const sysDir of systemDirs) {
			if (canonical.startsWith(sysDir)) {
				throw new Error(`Cannot delete system directory: ${canonical}`);
			}
		}

		// 检查路径是否包含 ".."
		if (
			canonical.includes("/../") ||
			canonical.endsWith("/..") ||
			canonical.startsWith("../")
		) {
			throw new Error("Invalid path: contains '..'");
		}
	}

	/**
	 * 递归计算目录的总大小
	 */
	private static calculateDirSize(dirPath: string): number {
		let totalSize = 0;
		try {
			const entries = fs.readdirSync(dirPath, {withFileTypes: true});
			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);
				try {
					if (entry.isDirectory()) {
						totalSize += this.calculateDirSize(fullPath);
					} else if (entry.isFile()) {
						const stats = fs.statSync(fullPath);
						totalSize += stats.size;
					}
				} catch {
					// 忽略无法访问的文件或目录
				}
			}
		} catch {
			// 忽略无法访问的目录
		}
		return totalSize;
	}

	/**
	 * 执行删除操作
	 */
	static executeDeletion(plan: DeletePlan, dryRun: boolean): DeleteResult {
		const deletedFiles: string[] = [];
		const deletedDirs: string[] = [];
		const failedFiles: Array<{path: string; error: string}> = [];
		const failedDirs: Array<{path: string; error: string}> = [];
		let totalSize = 0;

		if (dryRun) {
			// 预览模式：计算所有文件和目录的大小，不实际删除
			// 计算文件大小
			for (const file of plan.files) {
				try {
					const stats = fs.statSync(file);
					totalSize += stats.size;
					deletedFiles.push(file);
				} catch {
					// 忽略无法访问的文件
					deletedFiles.push(file);
				}
			}
			// 计算目录大小（递归计算目录内所有文件）
			for (const dir of plan.dirs) {
				try {
					const dirSize = this.calculateDirSize(dir);
					totalSize += dirSize;
					deletedDirs.push(dir);
				} catch {
					// 忽略无法访问的目录
					deletedDirs.push(dir);
				}
			}
			return {
				deletedFiles,
				deletedDirs,
				failedFiles,
				failedDirs,
				totalSize,
			};
		}

		// 实际删除文件
		for (const file of plan.files) {
			try {
				this.checkSafety(file);
				const stats = fs.statSync(file);
				const fileSize = stats.size;

				fs.unlinkSync(file);
				totalSize += fileSize;
				deletedFiles.push(file);
			} catch (error) {
				failedFiles.push({
					path: file,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// 实际删除目录（从深到浅）
		// 在删除前计算目录大小
		for (const dir of plan.dirs) {
			try {
				this.checkSafety(dir);
				// 在删除前计算目录大小
				const dirSize = this.calculateDirSize(dir);
				fs.rmSync(dir, {recursive: true, force: true});
				totalSize += dirSize;
				deletedDirs.push(dir);
			} catch (error) {
				failedDirs.push({
					path: dir,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return {
			deletedFiles,
			deletedDirs,
			failedFiles,
			failedDirs,
			totalSize,
		};
	}
}
