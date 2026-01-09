import * as fs from "fs";
import * as path from "path";
import {Config, ConfigLoader} from "./config";

/**
 * 搜索结果
 */
export interface SearchResult {
	/** 匹配的文件夹路径列表 */
	folders: string[];
	/** 匹配的文件路径列表 */
	files: string[];
	/** 匹配文件的总大小（字节） */
	totalSize: number;
	/** 扫描过程中遇到的所有目录总数 */
	totalDirsScanned: number;
	/** 扫描过程中遇到的所有文件总数 */
	totalFilesScanned: number;
}

/**
 * 搜索引擎，负责文件系统遍历和模式匹配
 */
export class SearchEngine {
	/**
	 * 在指定路径中搜索匹配的文件和文件夹
	 */
	static search(paths: string[], config: Config): SearchResult {
		const folders: string[] = [];
		const files: string[] = [];
		let totalSize = 0;
		let totalDirsScanned = 0;
		let totalFilesScanned = 0;
		const matchedFolders = new Set<string>();

		const state = {
			folders,
			files,
			totalSize: {value: totalSize},
			totalDirsScanned: {value: totalDirsScanned},
			totalFilesScanned: {value: totalFilesScanned},
			matchedFolders,
		};

		for (const searchPath of paths) {
			const expandedPath = ConfigLoader.expandPath(searchPath);
			this.walkPath(expandedPath, config, state);
		}

		totalSize = state.totalSize.value;
		totalDirsScanned = state.totalDirsScanned.value;
		totalFilesScanned = state.totalFilesScanned.value;

		return {
			folders,
			files,
			totalSize,
			totalDirsScanned,
			totalFilesScanned,
		};
	}

	/**
	 * 递归遍历路径
	 */
	private static walkPath(
		dirPath: string,
		config: Config,
		state: {
			folders: string[];
			files: string[];
			totalSize: {value: number};
			totalDirsScanned: {value: number};
			totalFilesScanned: {value: number};
			matchedFolders: Set<string>;
		}
	): void {
		// 检查是否应该排除
		if (this.shouldExclude(dirPath, config.exclude)) {
			return;
		}

		// 检查是否在已匹配的文件夹内
		if (this.isInMatchedFolder(dirPath, state.matchedFolders)) {
			return;
		}

		try {
			const entries = fs.readdirSync(dirPath, {withFileTypes: true});

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				// 检查排除
				if (this.shouldExclude(fullPath, config.exclude)) {
					continue;
				}

				if (entry.isDirectory()) {
					state.totalDirsScanned.value++;

					// 检查文件夹是否匹配
					let folderMatched = false;
					for (const folderPattern of config.clean.folders) {
						if (this.matchPattern(folderPattern, entry.name)) {
							state.matchedFolders.add(fullPath);
							state.folders.push(fullPath);
							folderMatched = true;
							break;
						}
					}

					// 如果文件夹匹配，不再遍历其子目录
					if (!folderMatched && config.options.recursive !== false) {
						this.walkPath(fullPath, config, state);
					}
				} else if (entry.isFile()) {
					state.totalFilesScanned.value++;

					try {
						const stats = fs.statSync(fullPath);
						const size = stats.size;

						// 检查大小过滤
						if (
							!this.checkSize(
								size,
								config.options.minSize,
								config.options.maxSize
							)
						) {
							continue;
						}

						// 检查年龄过滤
						if (
							!this.checkAge(
								stats,
								config.options.minAgeDays,
								config.options.maxAgeDays
							)
						) {
							continue;
						}

						// 检查文件是否匹配
						for (const filePattern of config.clean.files) {
							if (this.matchPattern(filePattern, entry.name)) {
								state.files.push(fullPath);
								state.totalSize.value += size;
								break;
							}
						}
					} catch {
						// 忽略无法访问的文件
					}
				}
			}
		} catch {
			// 忽略无法访问的目录
		}
	}

	/**
	 * 匹配文件名或文件夹名是否与模式匹配
	 */
	static matchPattern(pattern: string, name: string): boolean {
		if (pattern.endsWith("/")) {
			const folderPattern = pattern.slice(0, -1);
			return folderPattern === name;
		} else {
			return this.globMatch(pattern, name);
		}
	}

	/**
	 * Glob 模式匹配（支持 * 和 ?）
	 */
	private static globMatch(pattern: string, text: string): boolean {
		const patternChars = [...pattern];
		const textChars = [...text];
		return this.globMatchRecursive(patternChars, textChars, 0, 0);
	}

	private static globMatchRecursive(
		pattern: string[],
		text: string[],
		pIdx: number,
		tIdx: number
	): boolean {
		if (pIdx >= pattern.length) {
			return tIdx >= text.length;
		}

		const pChar = pattern[pIdx];
		if (pChar === "*") {
			for (let i = tIdx; i <= text.length; i++) {
				if (this.globMatchRecursive(pattern, text, pIdx + 1, i)) {
					return true;
				}
			}
			return false;
		} else if (pChar === "?") {
			if (tIdx < text.length) {
				return this.globMatchRecursive(pattern, text, pIdx + 1, tIdx + 1);
			}
			return false;
		} else {
			if (tIdx < text.length && text[tIdx] === pChar) {
				return this.globMatchRecursive(pattern, text, pIdx + 1, tIdx + 1);
			}
			return false;
		}
	}

	/**
	 * 检查路径是否应该被排除
	 */
	private static shouldExclude(pathStr: string, excludes: string[]): boolean {
		for (const exclude of excludes) {
			const expandedExclude = ConfigLoader.expandPath(exclude);
			if (pathStr.startsWith(expandedExclude)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 检查路径是否在已匹配的文件夹内
	 */
	private static isInMatchedFolder(
		pathStr: string,
		matchedFolders: Set<string>
	): boolean {
		for (const matchedFolder of matchedFolders) {
			if (
				pathStr !== matchedFolder &&
				pathStr.startsWith(matchedFolder + path.sep)
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 检查文件大小
	 */
	private static checkSize(
		size: number,
		minSize: number | undefined,
		maxSize: number | undefined
	): boolean {
		if (minSize !== undefined && size < minSize) {
			return false;
		}
		if (maxSize !== undefined && size > maxSize) {
			return false;
		}
		return true;
	}

	/**
	 * 检查文件年龄
	 */
	private static checkAge(
		stats: fs.Stats,
		minAgeDays: number | undefined,
		maxAgeDays: number | undefined
	): boolean {
		if (minAgeDays === undefined && maxAgeDays === undefined) {
			return true;
		}

		const now = Date.now();
		const modified = stats.mtimeMs;
		const ageMs = now - modified;
		const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

		if (minAgeDays !== undefined && ageDays < minAgeDays) {
			return false;
		}
		if (maxAgeDays !== undefined && ageDays > maxAgeDays) {
			return false;
		}
		return true;
	}
}
