import * as fs from "fs";
import * as path from "path";
import trash from "trash";
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

		// 先检查具体的系统目录（按长度从长到短排序，避免误匹配）
		const systemDirs = [
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

		// 最后检查根目录，只允许路径正好是 "/"
		if (canonical === "/") {
			throw new Error(`Cannot delete system directory: ${canonical}`);
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
	 * 格式化文件大小
	 */
	private static formatSize(bytes: number): string {
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
	 * 确认单个项目的删除
	 */
	private static async confirmItemDeletion(
		path: string,
		isDir: boolean,
		size: number
	): Promise<"yes" | "skip" | "all" | "quit"> {
		const readline = require("readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise<"yes" | "skip" | "all" | "quit">((resolve) => {
			const itemType = isDir ? "Directory" : "File";
			const sizeStr = this.formatSize(size);

			rl.question(
				`\n🗑️  ${itemType}: ${path} (Size: ${sizeStr})\n   Delete? (y/N/a=all/q=quit): `,
				(answer: string) => {
					rl.close();
					const trimmed = answer.trim().toLowerCase();
					if (trimmed === "y" || trimmed === "yes") {
						resolve("yes");
					} else if (trimmed === "a" || trimmed === "all") {
						resolve("all");
					} else if (trimmed === "q" || trimmed === "quit") {
						resolve("quit");
					} else {
						resolve("skip");
					}
				}
			);
		});
	}

	/**
	 * 计算目录大小
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
					// 忽略无法访问的条目
				}
			}
		} catch {
			// 忽略无法访问的目录
		}
		return totalSize;
	}

	/**
	 * 交互式执行删除操作，逐个确认每个文件/目录
	 */
	static async executeDeletionInteractive(
		plan: DeletePlan,
		quiet: boolean
	): Promise<DeleteResult> {
		const deletedFiles: string[] = [];
		const deletedDirs: string[] = [];
		const failedFiles: Array<{path: string; error: string}> = [];
		const failedDirs: Array<{path: string; error: string}> = [];
		let totalSize = 0;
		let confirmAll = false;

		// 删除文件
		for (const file of plan.files) {
			try {
				this.checkSafety(file);
				const stats = fs.statSync(file);
				const fileSize = stats.size;

				if (!confirmAll) {
					const answer = await this.confirmItemDeletion(file, false, fileSize);
					if (answer === "skip") {
						if (!quiet) {
							console.log(`  ⏭️  Skipped: ${file}`);
						}
						continue;
					} else if (answer === "all") {
						confirmAll = true;
						if (!quiet) {
							console.log(`  ✅ All remaining items will be deleted`);
						}
					} else if (answer === "quit") {
						if (!quiet) {
							console.log(`  ❌ Operation cancelled by user`);
						}
						throw new Error("User cancelled");
					}
				}

				await trash(file);
				totalSize += fileSize;
				deletedFiles.push(file);
				if (!quiet) {
					console.log(`  ✅ Deleted: ${file}`);
				}
			} catch (error) {
				if (error instanceof Error && error.message === "User cancelled") {
					throw error;
				}
				failedFiles.push({
					path: file,
					error: error instanceof Error ? error.message : String(error),
				});
				if (!quiet) {
					console.log(
						`  ${
							error instanceof Error && error.message.includes("Safety")
								? "⚠️"
								: "❌"
						}  ${
							error instanceof Error && error.message.includes("Safety")
								? "Safety check failed"
								: "Failed"
						}: ${file} - ${
							error instanceof Error ? error.message : String(error)
						}`
					);
				}
			}
		}

		// 删除目录
		for (const dir of plan.dirs) {
			try {
				this.checkSafety(dir);
				const dirSize = this.calculateDirSize(dir);

				if (!confirmAll) {
					const answer = await this.confirmItemDeletion(dir, true, dirSize);
					if (answer === "skip") {
						if (!quiet) {
							console.log(`  ⏭️  Skipped: ${dir}`);
						}
						continue;
					} else if (answer === "all") {
						confirmAll = true;
						if (!quiet) {
							console.log(`  ✅ All remaining items will be deleted`);
						}
					} else if (answer === "quit") {
						if (!quiet) {
							console.log(`  ❌ Operation cancelled by user`);
						}
						throw new Error("User cancelled");
					}
				}

				await trash(dir);
				totalSize += dirSize;
				deletedDirs.push(dir);
				if (!quiet) {
					console.log(`  ✅ Deleted: ${dir}`);
				}
			} catch (error) {
				if (error instanceof Error && error.message === "User cancelled") {
					throw error;
				}
				failedDirs.push({
					path: dir,
					error: error instanceof Error ? error.message : String(error),
				});
				if (!quiet) {
					console.log(
						`  ${
							error instanceof Error && error.message.includes("Safety")
								? "⚠️"
								: "❌"
						}  ${
							error instanceof Error && error.message.includes("Safety")
								? "Safety check failed"
								: "Failed"
						}: ${dir} - ${
							error instanceof Error ? error.message : String(error)
						}`
					);
				}
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

	/**
	 * 执行删除操作
	 */
	static async executeDeletion(
		plan: DeletePlan,
		dryRun: boolean
	): Promise<DeleteResult> {
		const deletedFiles: string[] = [];
		const deletedDirs: string[] = [];
		const failedFiles: Array<{path: string; error: string}> = [];
		const failedDirs: Array<{path: string; error: string}> = [];
		let totalSize = 0;

		if (dryRun) {
			// 预览模式：只计算大小，不实际删除
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
			deletedDirs.push(...plan.dirs);
			return {
				deletedFiles,
				deletedDirs,
				failedFiles,
				failedDirs,
				totalSize,
			};
		}

		// 实际删除文件（移到回收站）
		for (const file of plan.files) {
			try {
				this.checkSafety(file);
				const stats = fs.statSync(file);
				const fileSize = stats.size;

				// 将文件移到回收站而不是直接删除
				await trash(file);
				totalSize += fileSize;
				deletedFiles.push(file);
			} catch (error) {
				failedFiles.push({
					path: file,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		// 实际删除目录（移到回收站，从深到浅）
		for (const dir of plan.dirs) {
			try {
				this.checkSafety(dir);
				// 将目录移到回收站而不是直接删除
				await trash(dir);
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
