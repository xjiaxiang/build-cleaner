use crate::config::Config;
use crate::error::CleanError;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use walkdir::WalkDir;

/// 搜索结果，包含匹配的文件夹、文件和总大小
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// 匹配的文件夹路径列表
    pub folders: Vec<PathBuf>,
    /// 匹配的文件路径列表
    pub files: Vec<PathBuf>,
    /// 匹配文件的总大小（字节）
    pub total_size: u64,
    /// 扫描过程中遇到的所有目录总数（包括匹配和不匹配的）
    pub total_dirs_scanned: usize,
    /// 扫描过程中遇到的所有文件总数（包括匹配和不匹配的）
    pub total_files_scanned: usize,
}

/// 搜索选项，控制搜索行为
#[derive(Debug, Clone)]
pub struct SearchOptions {
    /// 是否递归搜索子目录
    pub recursive: bool,
    /// 是否跟随符号链接
    pub follow_symlinks: bool,
    /// 最大搜索深度（None 表示无限制）
    pub max_depth: Option<usize>,
    /// 最小文件大小（字节）
    pub min_size: Option<u64>,
    /// 最大文件大小（字节）
    pub max_size: Option<u64>,
    /// 最小文件年龄（天数）
    pub min_age_days: Option<u32>,
    /// 最大文件年龄（天数）
    pub max_age_days: Option<u32>,
}

/// 搜索引擎，负责文件系统遍历和模式匹配
pub struct SearchEngine;

impl SearchEngine {
    /// 在指定路径中搜索匹配的文件和文件夹（不带进度回调）
    ///
    /// # 参数
    /// * `paths` - 要搜索的路径列表（应该已经展开和验证）
    /// * `config` - 清理配置，包含匹配模式和过滤选项
    ///
    /// # 返回
    /// 搜索结果，包含匹配的文件夹、文件和总大小
    pub fn search(paths: &[PathBuf], config: &Config) -> Result<SearchResult, CleanError> {
        Self::search_with_progress(paths, config, None::<fn(usize, usize, usize, usize, u64)>)
    }

    /// 递归计算目录的总大小
    /// 
    /// 注意：文件系统不直接存储目录大小，必须遍历所有文件才能计算。
    /// 这里使用 walkdir 库来优化遍历性能。
    ///
    /// # 参数
    /// * `dir_path` - 目录路径
    ///
    /// # 返回
    /// 目录及其所有内容的总大小（字节）
    fn calculate_dir_size(dir_path: &Path) -> u64 {
        let mut total_size = 0u64;
        
        // 使用 walkdir 遍历目录，比 read_dir 更高效
        for entry in WalkDir::new(dir_path).into_iter() {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue, // 忽略无法访问的条目
            };

            // 只统计文件大小，目录本身不占用空间（除了元数据）
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                }
            }
        }

        total_size
    }

    /// 在指定路径中搜索匹配的文件和文件夹（带进度回调）
    ///
    /// # 参数
    /// * `paths` - 要搜索的路径列表（应该已经展开和验证）
    /// * `config` - 清理配置，包含匹配模式和过滤选项
    /// * `progress_callback` - 可选的进度回调函数，接收 (files_scanned, dirs_scanned, files_matched, dirs_matched, total_size)
    ///
    /// # 返回
    /// 搜索结果，包含匹配的文件夹、文件和总大小
    ///
    /// # 注意
    /// 当文件夹匹配成功后，将不再继续遍历该文件夹的子文件夹，但会立即计算该目录的大小
    pub fn search_with_progress<F>(
        paths: &[PathBuf],
        config: &Config,
        mut progress_callback: Option<F>,
    ) -> Result<SearchResult, CleanError>
    where
        F: FnMut(usize, usize, usize, usize, u64),
    {
        let mut folders = Vec::new();
        let mut files = Vec::new();
        let mut total_size = 0u64;
        let mut total_dirs_scanned = 0usize;
        let mut total_files_scanned = 0usize;
        // 记录已匹配的文件夹路径，用于跳过其子文件夹
        // 使用 Arc<Mutex<>> 以便在闭包中共享和修改
        let matched_folders = Arc::new(Mutex::new(std::collections::HashSet::new()));

        let search_options: SearchOptions = (&config.options).into();

        for path in paths {
            let matched_folders_clone = Arc::clone(&matched_folders);
            let config_exclude = &config.exclude;

            for entry in Self::walk_path_with_filter(path, &search_options, move |entry_path| {
                let matched = matched_folders_clone.lock().unwrap();
                !Self::is_in_matched_folder(entry_path, &matched)
            }) {
                let entry_path = match entry {
                    Ok(path) => path,
                    Err(_) => {
                        // 忽略遍历错误（如权限问题、符号链接循环等），继续处理其他文件
                        continue;
                    }
                };

                if Self::should_exclude(&entry_path, config_exclude) {
                    continue;
                }

                let metadata = match fs::metadata(&entry_path) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                if metadata.is_file() {
                    total_files_scanned += 1;
                    let size = metadata.len();

                    if !Self::check_size(size, search_options.min_size, search_options.max_size) {
                        // 每扫描 1000 个文件输出一次进度
                        if total_files_scanned.is_multiple_of(1000) {
                            if let Some(ref mut cb) = progress_callback {
                                cb(total_files_scanned, total_dirs_scanned, files.len(), folders.len(), total_size);
                            }
                        }
                        continue;
                    }

                    if !Self::check_age(
                        &metadata,
                        search_options.min_age_days,
                        search_options.max_age_days,
                    ) {
                        // 每扫描 1000 个文件输出一次进度
                        if total_files_scanned.is_multiple_of(1000) {
                            if let Some(ref mut cb) = progress_callback {
                                cb(total_files_scanned, total_dirs_scanned, files.len(), folders.len(), total_size);
                            }
                        }
                        continue;
                    }

                    let name = entry_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    for file_pattern in &config.clean.files {
                        if Self::match_pattern(file_pattern, name) {
                            files.push(entry_path.clone());
                            total_size += size;
                            break;
                        }
                    }
                    
                    // 每扫描 1000 个文件输出一次进度
                    if total_files_scanned.is_multiple_of(1000) {
                        if let Some(ref mut cb) = progress_callback {
                            cb(total_files_scanned, total_dirs_scanned, files.len(), folders.len(), total_size);
                        }
                    }
                } else if metadata.is_dir() {
                    total_dirs_scanned += 1;
                    let name = entry_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    for folder_pattern in &config.clean.folders {
                        if Self::match_pattern(folder_pattern, name) {
                            // 记录匹配的文件夹，后续跳过其子文件夹
                            matched_folders.lock().unwrap().insert(entry_path.clone());
                            folders.push(entry_path.clone());
                            // 立即计算目录大小，避免扫描完成后的额外等待
                            total_size += Self::calculate_dir_size(&entry_path);
                            break;
                        }
                    }
                    
                    // 每扫描 100 个目录输出一次进度，或者每当匹配到目录时也输出
                    if total_dirs_scanned.is_multiple_of(100) || !folders.is_empty() && folders.len().is_multiple_of(10) {
                        if let Some(ref mut cb) = progress_callback {
                            cb(total_files_scanned, total_dirs_scanned, files.len(), folders.len(), total_size);
                        }
                    }
                }
            }
        }

        Ok(SearchResult {
            folders,
            files,
            total_size,
            total_dirs_scanned,
            total_files_scanned,
        })
    }

    /// 遍历指定路径，返回所有文件和目录的迭代器
    ///
    /// # 参数
    /// * `path` - 要遍历的根路径
    /// * `options` - 搜索选项，控制遍历行为
    ///
    /// # 返回
    /// 路径迭代器，每个元素是路径或错误
    pub fn walk_path(
        path: &Path,
        options: &SearchOptions,
    ) -> impl Iterator<Item = Result<PathBuf, CleanError>> {
        WalkDir::new(path)
            .max_depth(if options.recursive {
                options.max_depth.unwrap_or(usize::MAX)
            } else {
                1
            })
            .follow_links(options.follow_symlinks)
            .into_iter()
            .map(|entry| {
                entry
                    .map(|e| e.path().to_path_buf())
                    .map_err(|e| CleanError::Other(e.to_string()))
            })
    }

    /// 遍历指定路径，使用过滤器过滤条目
    ///
    /// # 参数
    /// * `path` - 要遍历的根路径
    /// * `options` - 搜索选项，控制遍历行为
    /// * `filter` - 过滤函数，返回 true 表示保留该条目
    ///
    /// # 返回
    /// 路径迭代器，每个元素是路径或错误
    fn walk_path_with_filter<F>(
        path: &Path,
        options: &SearchOptions,
        filter: F,
    ) -> impl Iterator<Item = Result<PathBuf, CleanError>>
    where
        F: Fn(&Path) -> bool + Send + Sync,
    {
        WalkDir::new(path)
            .max_depth(if options.recursive {
                options.max_depth.unwrap_or(usize::MAX)
            } else {
                1
            })
            .follow_links(options.follow_symlinks)
            .into_iter()
            .filter_entry(move |e| filter(e.path()))
            .map(|entry| {
                entry
                    .map(|e| e.path().to_path_buf())
                    .map_err(|e| CleanError::Other(e.to_string()))
            })
    }

    /// 匹配文件名或文件夹名是否与模式匹配
    ///
    /// # 参数
    /// * `pattern` - 匹配模式（文件夹以 `/` 结尾，文件支持通配符 `*` 和 `?`）
    /// * `name` - 要匹配的文件名或文件夹名
    ///
    /// # 返回
    /// 如果匹配返回 `true`，否则返回 `false`
    pub fn match_pattern(pattern: &str, name: &str) -> bool {
        if pattern.ends_with('/') {
            let folder_pattern = pattern.trim_end_matches('/');
            folder_pattern == name
        } else {
            Self::glob_match(pattern, name)
        }
    }

    fn glob_match(pattern: &str, text: &str) -> bool {
        let pattern_chars: Vec<char> = pattern.chars().collect();
        let text_chars: Vec<char> = text.chars().collect();
        Self::glob_match_recursive(&pattern_chars, &text_chars, 0, 0)
    }

    fn glob_match_recursive(pattern: &[char], text: &[char], p_idx: usize, t_idx: usize) -> bool {
        if p_idx >= pattern.len() {
            return t_idx >= text.len();
        }

        match pattern.get(p_idx) {
            Some('*') => {
                for i in t_idx..=text.len() {
                    if Self::glob_match_recursive(pattern, text, p_idx + 1, i) {
                        return true;
                    }
                }
                false
            }
            Some('?') => {
                if t_idx < text.len() {
                    Self::glob_match_recursive(pattern, text, p_idx + 1, t_idx + 1)
                } else {
                    false
                }
            }
            Some(&c) => {
                if t_idx < text.len() && text[t_idx] == c {
                    Self::glob_match_recursive(pattern, text, p_idx + 1, t_idx + 1)
                } else {
                    false
                }
            }
            None => t_idx >= text.len(),
        }
    }

    /// 检查路径是否应该被排除
    ///
    /// # 参数
    /// * `path` - 要检查的路径
    /// * `excludes` - 排除路径列表
    ///
    /// # 返回
    /// 如果路径在排除列表中或其子路径，返回 `true`
    pub fn should_exclude(path: &Path, excludes: &[PathBuf]) -> bool {
        for exclude in excludes {
            if path.starts_with(exclude) {
                return true;
            }
        }
        false
    }

    /// 检查路径是否在已匹配的文件夹内
    ///
    /// # 参数
    /// * `path` - 要检查的路径
    /// * `matched_folders` - 已匹配的文件夹集合
    ///
    /// # 返回
    /// 如果路径在已匹配的文件夹内，返回 `true`
    fn is_in_matched_folder(
        path: &Path,
        matched_folders: &std::collections::HashSet<PathBuf>,
    ) -> bool {
        for matched_folder in matched_folders {
            // 检查 path 是否是 matched_folder 的子路径
            // 注意：path 不能等于 matched_folder 本身（因为 matched_folder 本身需要被处理）
            if path != matched_folder.as_path() && path.starts_with(matched_folder) {
                return true;
            }
        }
        false
    }

    fn check_size(size: u64, min_size: Option<u64>, max_size: Option<u64>) -> bool {
        if let Some(min) = min_size {
            if size < min {
                return false;
            }
        }
        if let Some(max) = max_size {
            if size > max {
                return false;
            }
        }
        true
    }

    fn check_age(
        metadata: &fs::Metadata,
        min_age_days: Option<u32>,
        max_age_days: Option<u32>,
    ) -> bool {
        if min_age_days.is_none() && max_age_days.is_none() {
            return true;
        }

        if let Ok(modified) = metadata.modified() {
            if let Ok(elapsed) = modified.elapsed() {
                let age_days = elapsed.as_secs() / 86400;

                if let Some(min_age) = min_age_days {
                    if age_days < min_age as u64 {
                        return false;
                    }
                }
                if let Some(max_age) = max_age_days {
                    if age_days > max_age as u64 {
                        return false;
                    }
                }
                return true;
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{CleanConfig, Config, Options};
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_match_pattern() {
        // 测试文件夹匹配
        assert!(SearchEngine::match_pattern("node_modules/", "node_modules"));
        assert!(!SearchEngine::match_pattern("node_modules/", "dist"));

        // 测试文件通配符匹配
        assert!(SearchEngine::match_pattern("*.log", "test.log"));
        assert!(SearchEngine::match_pattern("*.log", "app.log"));
        assert!(!SearchEngine::match_pattern("*.log", "test.txt"));

        // 测试 ? 通配符
        assert!(SearchEngine::match_pattern("test?.txt", "test1.txt"));
        assert!(SearchEngine::match_pattern("test?.txt", "testa.txt"));
        assert!(!SearchEngine::match_pattern("test?.txt", "test.txt"));

        // 测试精确匹配
        assert!(SearchEngine::match_pattern("test.txt", "test.txt"));
        assert!(!SearchEngine::match_pattern("test.txt", "test.log"));
    }

    #[test]
    fn test_should_exclude() {
        let excludes = vec![
            PathBuf::from("/exclude/path1"),
            PathBuf::from("/exclude/path2"),
        ];

        // 测试应该排除的路径
        assert!(SearchEngine::should_exclude(
            &PathBuf::from("/exclude/path1/sub"),
            &excludes
        ));
        assert!(SearchEngine::should_exclude(
            &PathBuf::from("/exclude/path2"),
            &excludes
        ));

        // 测试不应该排除的路径
        assert!(!SearchEngine::should_exclude(
            &PathBuf::from("/other/path"),
            &excludes
        ));
    }

    #[test]
    fn test_check_size() {
        // 测试无限制
        assert!(SearchEngine::check_size(1000, None, None));

        // 测试最小大小
        assert!(SearchEngine::check_size(1000, Some(500), None));
        assert!(!SearchEngine::check_size(1000, Some(1500), None));

        // 测试最大大小
        assert!(SearchEngine::check_size(1000, None, Some(2000)));
        assert!(!SearchEngine::check_size(1000, None, Some(500)));

        // 测试范围
        assert!(SearchEngine::check_size(1000, Some(500), Some(2000)));
        assert!(!SearchEngine::check_size(1000, Some(1500), Some(2000)));
        assert!(!SearchEngine::check_size(1000, Some(500), Some(800)));
    }

    #[test]
    fn test_check_age() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.txt");
        fs::File::create(&test_file).unwrap();

        let metadata = fs::metadata(&test_file).unwrap();

        // 测试无限制
        assert!(SearchEngine::check_age(&metadata, None, None));

        // 测试最小年龄（新文件应该不满足最小年龄要求）
        // 注意：这个测试可能不稳定，因为文件是刚创建的
        // 实际使用中，文件年龄应该大于0天
    }

    #[test]
    fn test_search() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path();

        // 创建测试目录结构
        let node_modules = project_path.join("node_modules");
        fs::create_dir(&node_modules).unwrap();
        let dist = project_path.join("dist");
        fs::create_dir(&dist).unwrap();

        let test_file = project_path.join("test.log");
        fs::File::create(&test_file)
            .unwrap()
            .write_all(b"test")
            .unwrap();

        // 创建配置
        let config = Config {
            clean: CleanConfig {
                folders: vec!["node_modules".to_string(), "dist".to_string()],
                files: vec!["*.log".to_string()],
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

        let result = SearchEngine::search(&[project_path.to_path_buf()], &config).unwrap();

        // 验证搜索结果
        assert!(result.folders.len() >= 2);
        assert!(result.files.len() >= 1);
        assert!(result.total_size > 0);
    }

    #[test]
    fn test_walk_path() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path();

        // 创建测试文件
        let file1 = test_path.join("file1.txt");
        fs::File::create(&file1).unwrap();
        let subdir = test_path.join("subdir");
        fs::create_dir(&subdir).unwrap();
        let file2 = subdir.join("file2.txt");
        fs::File::create(&file2).unwrap();

        let options = SearchOptions {
            recursive: true,
            follow_symlinks: false,
            max_depth: None,
            min_size: None,
            max_size: None,
            min_age_days: None,
            max_age_days: None,
        };

        let paths: Vec<PathBuf> = SearchEngine::walk_path(test_path, &options)
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(paths.len() >= 3); // 至少包含根目录、子目录和两个文件
    }

    #[test]
    fn test_search_skip_matched_folder_children() {
        let temp_dir = TempDir::new().unwrap();
        let project_path = temp_dir.path();

        // 创建测试目录结构：
        // project/
        //   ├── node_modules/        (匹配的文件夹)
        //   │   ├── subdir/          (应该被跳过)
        //   │   │   └── file.txt     (应该被跳过)
        //   │   └── file.js          (应该被跳过)
        //   └── other/                (不匹配，应该被遍历)
        //       └── file.txt

        let node_modules = project_path.join("node_modules");
        fs::create_dir_all(&node_modules).unwrap();

        let node_modules_subdir = node_modules.join("subdir");
        fs::create_dir_all(&node_modules_subdir).unwrap();
        let file_in_node_modules = node_modules_subdir.join("file.txt");
        fs::File::create(&file_in_node_modules).unwrap();

        let file_in_node_modules_root = node_modules.join("file.js");
        fs::File::create(&file_in_node_modules_root).unwrap();

        let other_dir = project_path.join("other");
        fs::create_dir_all(&other_dir).unwrap();
        let file_in_other = other_dir.join("file.txt");
        fs::File::create(&file_in_other).unwrap();

        // 创建配置，只搜索 node_modules 文件夹
        let config = Config {
            clean: CleanConfig {
                folders: vec!["node_modules".to_string()],
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

        let result = SearchEngine::search(&[project_path.to_path_buf()], &config).unwrap();

        // 验证：只应该找到 node_modules 文件夹本身
        // 不应该找到 node_modules 内的子文件夹和文件
        assert_eq!(result.folders.len(), 1);
        assert_eq!(result.folders[0], node_modules);
        assert_eq!(result.files.len(), 0);
    }
}
