use crate::error::CleanError;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

/// 清理配置，包含清理目标、排除路径和搜索选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 清理配置，定义要清理的文件夹和文件
    pub clean: CleanConfig,
    /// 排除路径列表，这些路径及其子路径不会被清理
    pub exclude: Vec<PathBuf>,
    /// 搜索和删除选项
    pub options: Options,
}

/// 清理配置，定义要清理的目标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanConfig {
    /// 要清理的文件夹名称列表（如 node_modules/, dist/）
    pub folders: Vec<String>,
    /// 要清理的文件模式列表（如 *.log, *.tmp）
    pub files: Vec<String>,
}

/// 搜索和删除选项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Options {
    /// 是否递归搜索子目录
    #[serde(default = "default_true")]
    pub recursive: bool,
    /// 是否跟随符号链接
    #[serde(default)]
    pub follow_symlinks: bool,
    /// 最小文件大小（字节），小于此大小的文件不清理
    pub min_size: Option<u64>,
    /// 最大文件大小（字节），大于此大小的文件不清理
    pub max_size: Option<u64>,
    /// 最小文件年龄（天数），小于此年龄的文件不清理
    pub min_age_days: Option<u32>,
    /// 最大文件年龄（天数），大于此年龄的文件不清理
    pub max_age_days: Option<u32>,
}

fn default_true() -> bool {
    true
}

/// 项目类型枚举
#[derive(Debug, Clone, PartialEq)]
pub enum ProjectType {
    /// Node.js 项目
    NodeJs,
    /// Rust 项目
    Rust,
    /// Python 项目
    Python,
    /// Go 项目
    Go,
    /// Java 项目
    Java,
    /// 未知项目类型
    Unknown,
}

/// 配置加载器，负责加载、解析和合并配置
pub struct ConfigLoader;

impl ConfigLoader {
    /// 展开路径，支持 `~` 展开为用户主目录
    ///
    /// # 参数
    /// * `path` - 原始路径字符串
    ///
    /// # 返回
    /// 展开后的路径
    pub fn expand_path(path: &str) -> PathBuf {
        if path.starts_with('~') {
            if path == "~" || path.starts_with("~/") {
                let home = env::var("HOME")
                    .or_else(|_| env::var("USERPROFILE"))
                    .unwrap_or_else(|_| ".".to_string());
                let home_path = PathBuf::from(home);
                if path == "~" {
                    home_path
                } else {
                    home_path.join(&path[2..])
                }
            } else {
                PathBuf::from(path)
            }
        } else {
            PathBuf::from(path)
        }
    }

    /// 验证路径是否存在和可访问
    ///
    /// # 参数
    /// * `path` - 要验证的路径
    ///
    /// # 返回
    /// 如果路径有效返回 `Ok(())`，否则返回错误
    pub fn validate_path(path: &Path) -> Result<(), CleanError> {
        if !path.exists() {
            return Err(CleanError::PathNotFound(path.to_path_buf()));
        }
        if !path.is_dir() && !path.is_file() {
            return Err(CleanError::Other(format!(
                "Path is not a file or directory: {}",
                path.display()
            )));
        }
        Ok(())
    }

    /// 加载配置，合并默认配置、配置文件（如果存在）和命令行参数
    ///
    /// # 参数
    /// * `path` - 项目根路径，用于识别项目类型
    /// * `config_file` - 可选的配置文件路径（YAML 或 JSON）
    /// * `cli_patterns` - 命令行传入的清理模式列表
    ///
    /// # 返回
    /// 返回合并后的配置，如果配置无效则返回错误
    pub fn load_config(
        path: &Path,
        config_file: Option<&Path>,
        cli_patterns: &[String],
    ) -> Result<Config, CleanError> {
        // 验证路径
        Self::validate_path(path)?;

        let project_type = Self::detect_project_type(path);
        let default_config = Self::load_default_config(&project_type);

        let file_config = if let Some(config_path) = config_file {
            // 验证配置文件路径
            Self::validate_path(config_path)?;
            Some(Self::parse_config_file(config_path)?)
        } else {
            None
        };

        let merged_config =
            Self::merge_configs(&default_config, file_config.as_ref(), cli_patterns);
        Self::validate_config(&merged_config)?;

        Ok(merged_config)
    }

    /// 检测项目类型，通过检查项目根目录中的特征文件
    ///
    /// # 参数
    /// * `path` - 项目根路径
    ///
    /// # 返回
    /// 检测到的项目类型，如果无法识别则返回 `ProjectType::Unknown`
    pub fn detect_project_type(path: &Path) -> ProjectType {
        let entries = match fs::read_dir(path) {
            Ok(entries) => entries,
            Err(_) => return ProjectType::Unknown,
        };

        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();

            match name.as_ref() {
                "package.json" => return ProjectType::NodeJs,
                "Cargo.toml" => return ProjectType::Rust,
                "go.mod" => return ProjectType::Go,
                "pom.xml" | "build.gradle" => return ProjectType::Java,
                "requirements.txt" | "setup.py" | "pyproject.toml" => return ProjectType::Python,
                _ => continue,
            }
        }

        ProjectType::Unknown
    }

    /// 根据项目类型加载默认配置
    ///
    /// # 参数
    /// * `project_type` - 项目类型
    ///
    /// # 返回
    /// 该项目类型的默认配置
    pub fn load_default_config(project_type: &ProjectType) -> Config {
        let (folders, files) = match project_type {
            ProjectType::NodeJs => (
                vec![
                    "node_modules".to_string(),
                    "dist".to_string(),
                    "build".to_string(),
                    ".next".to_string(),
                ],
                vec![],
            ),
            ProjectType::Rust => (vec!["target".to_string()], vec![]),
            ProjectType::Python => (vec!["__pycache__".to_string()], vec!["*.pyc".to_string()]),
            ProjectType::Go => (vec!["vendor".to_string(), "bin".to_string()], vec![]),
            ProjectType::Java => (vec!["target".to_string(), "build".to_string()], vec![]),
            ProjectType::Unknown => (
                vec![
                    "node_modules".to_string(),
                    "dist".to_string(),
                    "build".to_string(),
                    "target".to_string(),
                ],
                vec![],
            ),
        };

        Config {
            clean: CleanConfig { folders, files },
            exclude: vec![],
            options: Options {
                recursive: true,
                follow_symlinks: false,
                min_size: None,
                max_size: None,
                min_age_days: None,
                max_age_days: None,
            },
        }
    }

    /// 解析配置文件（支持 YAML 和 JSON 格式）
    ///
    /// # 参数
    /// * `path` - 配置文件路径
    ///
    /// # 返回
    /// 解析后的配置，如果解析失败则返回错误
    pub fn parse_config_file(path: &Path) -> Result<Config, CleanError> {
        let content = fs::read_to_string(path).map_err(|e| {
            CleanError::ConfigParseError(format!("Failed to read config file: {}", e))
        })?;

        if path.extension().and_then(|s| s.to_str()) == Some("yaml")
            || path.extension().and_then(|s| s.to_str()) == Some("yml")
        {
            serde_yaml::from_str(&content)
                .map_err(|e| CleanError::ConfigParseError(format!("Failed to parse YAML: {}", e)))
        } else {
            serde_json::from_str(&content)
                .map_err(|e| CleanError::ConfigParseError(format!("Failed to parse JSON: {}", e)))
        }
    }

    /// 合并配置，优先级：命令行参数 > 配置文件 > 默认配置
    ///
    /// # 参数
    /// * `default` - 默认配置
    /// * `file_config` - 可选的配置文件
    /// * `cli_patterns` - 命令行传入的清理模式
    ///
    /// # 返回
    /// 合并后的配置
    pub fn merge_configs(
        default: &Config,
        file_config: Option<&Config>,
        cli_patterns: &[String],
    ) -> Config {
        let mut merged = default.clone();

        if let Some(file_cfg) = file_config {
            merged.clean.folders.extend(file_cfg.clean.folders.clone());
            merged.clean.files.extend(file_cfg.clean.files.clone());
            merged.exclude.extend(file_cfg.exclude.clone());
            merged.options = file_cfg.options.clone();
        }

        for pattern in cli_patterns {
            if pattern.ends_with('/') {
                let folder = pattern.trim_end_matches('/').to_string();
                if !merged.clean.folders.contains(&folder) {
                    merged.clean.folders.push(folder);
                }
            } else {
                if !merged.clean.files.contains(pattern) {
                    merged.clean.files.push(pattern.clone());
                }
            }
        }

        merged
    }

    /// 验证配置的有效性
    ///
    /// # 参数
    /// * `config` - 要验证的配置
    ///
    /// # 返回
    /// 如果配置有效返回 `Ok(())`，否则返回错误
    pub fn validate_config(config: &Config) -> Result<(), CleanError> {
        if config.clean.folders.is_empty() && config.clean.files.is_empty() {
            return Err(CleanError::ConfigParseError(
                "At least one folder or file pattern must be specified".to_string(),
            ));
        }
        Ok(())
    }
}

impl From<&Options> for crate::search::SearchOptions {
    fn from(options: &Options) -> Self {
        crate::search::SearchOptions {
            recursive: options.recursive,
            follow_symlinks: options.follow_symlinks,
            max_depth: None,
            min_size: options.min_size,
            max_size: options.max_size,
            min_age_days: options.min_age_days,
            max_age_days: options.max_age_days,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_expand_path() {
        // 测试普通路径
        let path = ConfigLoader::expand_path("/some/path");
        assert_eq!(path, PathBuf::from("/some/path"));

        // 测试 ~ 展开
        let home = env::var("HOME")
            .or_else(|_| env::var("USERPROFILE"))
            .unwrap();
        let expanded = ConfigLoader::expand_path("~");
        assert_eq!(expanded, PathBuf::from(home.clone()));

        let expanded = ConfigLoader::expand_path("~/test");
        assert_eq!(expanded, PathBuf::from(home).join("test"));
    }

    #[test]
    fn test_validate_path() {
        let temp_dir = TempDir::new().unwrap();
        let valid_path = temp_dir.path();

        // 测试有效路径
        assert!(ConfigLoader::validate_path(valid_path).is_ok());

        // 测试无效路径
        let invalid_path = PathBuf::from("/nonexistent/path/12345");
        assert!(ConfigLoader::validate_path(&invalid_path).is_err());
    }

    #[test]
    fn test_detect_project_type() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path();

        // 测试 Node.js 项目
        let package_json = project_path.join("package.json");
        fs::File::create(&package_json).unwrap();
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::NodeJs
        );
        fs::remove_file(&package_json).unwrap();

        // 测试 Rust 项目
        let cargo_toml = project_path.join("Cargo.toml");
        fs::File::create(&cargo_toml).unwrap();
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::Rust
        );
        fs::remove_file(&cargo_toml).unwrap();

        // 测试 Python 项目
        let requirements_txt = project_path.join("requirements.txt");
        fs::File::create(&requirements_txt).unwrap();
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::Python
        );
        fs::remove_file(&requirements_txt).unwrap();

        // 测试 Go 项目
        let go_mod = project_path.join("go.mod");
        fs::File::create(&go_mod).unwrap();
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::Go
        );
        fs::remove_file(&go_mod).unwrap();

        // 测试 Java 项目
        let pom_xml = project_path.join("pom.xml");
        fs::File::create(&pom_xml).unwrap();
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::Java
        );
        fs::remove_file(&pom_xml).unwrap();

        // 测试未知项目
        assert_eq!(
            ConfigLoader::detect_project_type(project_path),
            ProjectType::Unknown
        );
    }

    #[test]
    fn test_load_default_config() {
        // 测试 Node.js 默认配置
        let config = ConfigLoader::load_default_config(&ProjectType::NodeJs);
        assert!(config.clean.folders.contains(&"node_modules".to_string()));
        assert!(config.clean.folders.contains(&"dist".to_string()));
        assert!(config.options.recursive);

        // 测试 Rust 默认配置
        let config = ConfigLoader::load_default_config(&ProjectType::Rust);
        assert!(config.clean.folders.contains(&"target".to_string()));

        // 测试 Python 默认配置
        let config = ConfigLoader::load_default_config(&ProjectType::Python);
        assert!(config.clean.folders.contains(&"__pycache__".to_string()));
        assert!(config.clean.files.contains(&"*.pyc".to_string()));
    }

    #[test]
    fn test_parse_config_file() {
        let temp_dir = TempDir::new().unwrap();

        // 测试 JSON 配置
        let json_config = r#"{
            "clean": {
                "folders": ["test_dir"],
                "files": ["*.test"]
            },
            "exclude": [],
            "options": {
                "recursive": true,
                "follow_symlinks": false
            }
        }"#;
        let json_path = temp_dir.path().join("config.json");
        fs::File::create(&json_path)
            .unwrap()
            .write_all(json_config.as_bytes())
            .unwrap();

        let config = ConfigLoader::parse_config_file(&json_path).unwrap();
        assert_eq!(config.clean.folders, vec!["test_dir"]);
        assert_eq!(config.clean.files, vec!["*.test"]);

        // 测试 YAML 配置
        let yaml_config = r#"clean:
  folders:
    - test_dir
  files:
    - "*.test"
exclude: []
options:
  recursive: true
  follow_symlinks: false"#;
        let yaml_path = temp_dir.path().join("config.yaml");
        fs::File::create(&yaml_path)
            .unwrap()
            .write_all(yaml_config.as_bytes())
            .unwrap();

        let config = ConfigLoader::parse_config_file(&yaml_path).unwrap();
        assert_eq!(config.clean.folders, vec!["test_dir"]);
        assert_eq!(config.clean.files, vec!["*.test"]);
    }

    #[test]
    fn test_merge_configs() {
        let default = Config {
            clean: CleanConfig {
                folders: vec!["default_folder".to_string()],
                files: vec![],
            },
            exclude: vec![],
            options: Options {
                recursive: true,
                follow_symlinks: false,
                min_size: None,
                max_size: None,
                min_age_days: None,
                max_age_days: None,
            },
        };

        let file_config = Config {
            clean: CleanConfig {
                folders: vec!["file_folder".to_string()],
                files: vec!["*.log".to_string()],
            },
            exclude: vec![],
            options: Options {
                recursive: false,
                follow_symlinks: true,
                min_size: None,
                max_size: None,
                min_age_days: None,
                max_age_days: None,
            },
        };

        let cli_patterns = vec!["cli_folder/".to_string(), "*.tmp".to_string()];

        let merged = ConfigLoader::merge_configs(&default, Some(&file_config), &cli_patterns);

        // 配置文件应该覆盖默认配置的选项
        assert!(!merged.options.recursive);
        assert!(merged.options.follow_symlinks);

        // 文件夹和文件应该合并
        assert!(merged.clean.folders.contains(&"default_folder".to_string()));
        assert!(merged.clean.folders.contains(&"file_folder".to_string()));
        assert!(merged.clean.folders.contains(&"cli_folder".to_string()));
        assert!(merged.clean.files.contains(&"*.log".to_string()));
        assert!(merged.clean.files.contains(&"*.tmp".to_string()));
    }

    #[test]
    fn test_validate_config() {
        // 测试有效配置
        let valid_config = Config {
            clean: CleanConfig {
                folders: vec!["test".to_string()],
                files: vec![],
            },
            exclude: vec![],
            options: Options {
                recursive: true,
                follow_symlinks: false,
                min_size: None,
                max_size: None,
                min_age_days: None,
                max_age_days: None,
            },
        };
        assert!(ConfigLoader::validate_config(&valid_config).is_ok());

        // 测试无效配置（空文件夹和文件列表）
        let invalid_config = Config {
            clean: CleanConfig {
                folders: vec![],
                files: vec![],
            },
            exclude: vec![],
            options: Options {
                recursive: true,
                follow_symlinks: false,
                min_size: None,
                max_size: None,
                min_age_days: None,
                max_age_days: None,
            },
        };
        assert!(ConfigLoader::validate_config(&invalid_config).is_err());
    }
}
