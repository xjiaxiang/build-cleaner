import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * 项目类型枚举
 */
export enum ProjectType {
	NodeJs = "NodeJs",
	Rust = "Rust",
	Python = "Python",
	Go = "Go",
	Java = "Java",
	Unknown = "Unknown",
}

/**
 * 清理配置，定义要清理的目标
 */
export interface CleanConfig {
	/** 要清理的文件夹名称列表（如 node_modules/, dist/） */
	folders: string[];
	/** 要清理的文件模式列表（如 *.log, *.tmp） */
	files: string[];
}

/**
 * 搜索和删除选项
 */
export interface Options {
	/** 是否递归搜索子目录 */
	recursive?: boolean;
	/** 是否跟随符号链接 */
	followSymlinks?: boolean;
	/** 最小文件大小（字节） */
	minSize?: number;
	/** 最大文件大小（字节） */
	maxSize?: number;
	/** 最小文件年龄（天数） */
	minAgeDays?: number;
	/** 最大文件年龄（天数） */
	maxAgeDays?: number;
}

/**
 * 清理配置，包含清理目标、排除路径和搜索选项
 */
export interface Config {
	/** 清理配置，定义要清理的文件夹和文件 */
	clean: CleanConfig;
	/** 排除路径列表，这些路径及其子路径不会被清理 */
	exclude: string[];
	/** 搜索和删除选项 */
	options: Options;
}

/**
 * 配置加载器，负责加载、解析和合并配置
 */
export class ConfigLoader {
	/**
	 * 展开路径，支持 ~ 展开为用户主目录
	 */
	static expandPath(pathStr: string): string {
		if (pathStr.startsWith("~")) {
			const home = os.homedir();
			if (pathStr === "~") {
				return home;
			} else if (pathStr.startsWith("~/")) {
				return path.join(home, pathStr.slice(2));
			}
		}
		return pathStr;
	}

	/**
	 * 验证路径是否存在和可访问
	 */
	static validatePath(pathStr: string): void {
		if (!fs.existsSync(pathStr)) {
			throw new Error(`Path not found: ${pathStr}`);
		}
		const stat = fs.statSync(pathStr);
		if (!stat.isDirectory() && !stat.isFile()) {
			throw new Error(`Path is not a file or directory: ${pathStr}`);
		}
	}

	/**
	 * 检测项目类型，通过检查项目根目录中的特征文件
	 */
	static detectProjectType(projectPath: string): ProjectType {
		try {
			const entries = fs.readdirSync(projectPath);
			for (const entry of entries) {
				switch (entry) {
					case "package.json":
						return ProjectType.NodeJs;
					case "Cargo.toml":
						return ProjectType.Rust;
					case "go.mod":
						return ProjectType.Go;
					case "pom.xml":
					case "build.gradle":
						return ProjectType.Java;
					case "requirements.txt":
					case "setup.py":
					case "pyproject.toml":
						return ProjectType.Python;
				}
			}
		} catch {
			// 忽略错误
		}
		return ProjectType.Unknown;
	}

	/**
	 * 根据项目类型加载默认配置
	 */
	static loadDefaultConfig(projectType: ProjectType): Config {
		let folders: string[] = [];
		let files: string[] = [];

		switch (projectType) {
			case ProjectType.NodeJs:
				folders = ["node_modules", "dist", "build", ".next"];
				files = [];
				break;
			case ProjectType.Rust:
				folders = ["target"];
				files = [];
				break;
			case ProjectType.Python:
				folders = ["__pycache__"];
				files = ["*.pyc"];
				break;
			case ProjectType.Go:
				folders = ["vendor", "bin"];
				files = [];
				break;
			case ProjectType.Java:
				folders = ["target", "build"];
				files = [];
				break;
			case ProjectType.Unknown:
				folders = ["node_modules", "dist", "build", "target"];
				files = [];
				break;
		}

		return {
			clean: {folders, files},
			exclude: [],
			options: {
				recursive: true,
				followSymlinks: false,
			},
		};
	}

	/**
	 * 解析配置文件（支持 YAML 和 JSON 格式）
	 */
	static parseConfigFile(configPath: string): Config {
		const content = fs.readFileSync(configPath, "utf-8");
		const ext = path.extname(configPath).toLowerCase();

		if (ext === ".yaml" || ext === ".yml") {
			// 简单的 YAML 解析（如果需要完整支持，可以使用 js-yaml）
			try {
				return JSON.parse(content);
			} catch {
				throw new Error(`Failed to parse YAML config file: ${configPath}`);
			}
		} else {
			try {
				return JSON.parse(content);
			} catch (e) {
				throw new Error(
					`Failed to parse JSON config file: ${configPath}: ${e}`
				);
			}
		}
	}

	/**
	 * 合并配置，优先级：命令行参数 > 配置文件 > 默认配置
	 */
	static mergeConfigs(
		defaultConfig: Config,
		fileConfig: Config | null,
		cliPatterns: string[]
	): Config {
		const merged: Config = {
			clean: {
				folders: [...defaultConfig.clean.folders],
				files: [...defaultConfig.clean.files],
			},
			exclude: [...defaultConfig.exclude],
			options: {...defaultConfig.options},
		};

		if (fileConfig) {
			merged.clean.folders.push(...fileConfig.clean.folders);
			merged.clean.files.push(...fileConfig.clean.files);
			merged.exclude.push(...fileConfig.exclude);
			merged.options = {...merged.options, ...fileConfig.options};
		}

		for (const pattern of cliPatterns) {
			if (pattern.endsWith("/")) {
				const folder = pattern.slice(0, -1);
				if (!merged.clean.folders.includes(folder)) {
					merged.clean.folders.push(folder);
				}
			} else {
				if (!merged.clean.files.includes(pattern)) {
					merged.clean.files.push(pattern);
				}
			}
		}

		return merged;
	}

	/**
	 * 验证配置的有效性
	 */
	static validateConfig(config: Config): void {
		if (config.clean.folders.length === 0 && config.clean.files.length === 0) {
			throw new Error("At least one folder or file pattern must be specified");
		}
	}

	/**
	 * 加载配置，合并默认配置、配置文件（如果存在）和命令行参数
	 */
	static loadConfig(
		projectPath: string,
		configFile: string | null,
		cliPatterns: string[]
	): Config {
		// 验证路径
		this.validatePath(projectPath);

		const projectType = this.detectProjectType(projectPath);
		const defaultConfig = this.loadDefaultConfig(projectType);

		let fileConfig: Config | null = null;
		if (configFile) {
			this.validatePath(configFile);
			fileConfig = this.parseConfigFile(configFile);
		}

		const merged = this.mergeConfigs(defaultConfig, fileConfig, cliPatterns);
		this.validateConfig(merged);

		return merged;
	}
}
