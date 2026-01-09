/**
 * 清理选项接口
 */
export interface CleanOptions {
	/**
	 * 要搜索的路径列表（必需，至少一个）
	 */
	paths: string[];
	/**
	 * 清理模式列表（可选，文件夹以 / 结尾，文件使用通配符）
	 */
	patterns?: string[];
	/**
	 * 配置文件路径（可选）
	 */
	configFile?: string;
	/**
	 * 是否启用预览模式（不实际删除）
	 */
	dryRun?: boolean;
	/**
	 * 是否启用交互式确认
	 */
	interactive?: boolean;
	/**
	 * 是否启用详细输出
	 */
	verbose?: boolean;
	/**
	 * 是否启用静默模式（最小输出）
	 */
	quiet?: boolean;
	/**
	 * 是否启用调试模式
	 */
	debug?: boolean;
}

/**
 * 清理结果接口
 */
export interface CleanResult {
	/**
	 * 扫描的文件数量
	 */
	filesScanned: number;
	/**
	 * 扫描的目录数量
	 */
	dirsScanned: number;
	/**
	 * 匹配的文件数量
	 */
	filesMatched: number;
	/**
	 * 匹配的目录数量
	 */
	dirsMatched: number;
	/**
	 * 成功删除的文件数量
	 */
	filesDeleted: number;
	/**
	 * 成功删除的目录数量
	 */
	dirsDeleted: number;
	/**
	 * 删除失败的文件数量
	 */
	filesFailed: number;
	/**
	 * 删除失败的目录数量
	 */
	dirsFailed: number;
	/**
	 * 释放的磁盘空间（字节）
	 */
	spaceFreed: number;
	/**
	 * 操作耗时（秒）
	 */
	timeTaken: number;
	/**
	 * 删除的目录列表（仅在 verbose 模式下）
	 */
	deletedDirs?: string[];
	/**
	 * 删除的文件列表（仅在 verbose 模式下）
	 */
	deletedFiles?: string[];
	/**
	 * 失败的目录列表（仅在 verbose 模式下）
	 */
	failedDirs?: Array<{path: string; error: string}>;
	/**
	 * 失败的文件列表（仅在 verbose 模式下）
	 */
	failedFiles?: Array<{path: string; error: string}>;
	/**
	 * 原始输出（仅在 verbose 模式下）
	 */
	rawOutput?: string;
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
	/**
	 * 出错的路径
	 */
	path: string;
	/**
	 * 错误消息
	 */
	error: string;
}

/**
 * CLI 调用结果
 */
export interface CLIResult {
	/**
	 * 退出码
	 */
	exitCode: number;
	/**
	 * 标准输出
	 */
	stdout: string;
	/**
	 * 标准错误输出
	 */
	stderr: string;
}
