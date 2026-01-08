use crate::delete::DeleteResult;
use crate::search::SearchResult;
use std::time::Duration;

/// 清理统计信息
#[derive(Debug)]
pub struct Stats {
    /// 扫描的文件数量
    pub files_scanned: usize,
    /// 扫描的目录数量
    pub dirs_scanned: usize,
    /// 成功删除的文件数量
    pub files_deleted: usize,
    /// 成功删除的目录数量
    pub dirs_deleted: usize,
    /// 删除失败的文件数量
    pub files_failed: usize,
    /// 删除失败的目录数量
    pub dirs_failed: usize,
    /// 释放的磁盘空间（字节）
    pub space_freed: u64,
    /// 操作耗时
    pub time_taken: Duration,
}

/// 报告生成器，负责收集统计信息和格式化报告
pub struct ReportGenerator;

impl ReportGenerator {
    /// 收集统计信息
    ///
    /// # 参数
    /// * `search_result` - 搜索结果
    /// * `delete_result` - 删除结果
    /// * `start_time` - 操作开始时间
    ///
    /// # 返回
    /// 统计信息
    pub fn collect_stats(
        search_result: &SearchResult,
        delete_result: &DeleteResult,
        start_time: std::time::Instant,
    ) -> Stats {
        let time_taken = start_time.elapsed();

        Stats {
            files_scanned: search_result.total_files_scanned,
            dirs_scanned: search_result.total_dirs_scanned,
            files_deleted: delete_result.deleted_files.len(),
            dirs_deleted: delete_result.deleted_dirs.len(),
            files_failed: delete_result.failed_files.len(),
            dirs_failed: delete_result.failed_dirs.len(),
            space_freed: delete_result.total_size,
            time_taken,
        }
    }

    /// 格式化报告
    ///
    /// # 参数
    /// * `stats` - 统计信息
    /// * `delete_result` - 删除结果（用于显示详细信息）
    /// * `verbose` - 是否使用详细模式
    ///
    /// # 返回
    /// 格式化后的报告字符串
    pub fn format_report(stats: &Stats, delete_result: &DeleteResult, verbose: bool) -> String {
        if verbose {
            // 计算匹配的数量（已删除 + 失败）
            let files_matched = stats.files_deleted + stats.files_failed;
            let dirs_matched = stats.dirs_deleted + stats.dirs_failed;

            let mut report = format!(
                "📊 Cleanup Report:\n\
                 - Files scanned: {}\n\
                 - Directories scanned: {}\n\
                 - Files matched: {}\n\
                 - Directories matched: {}\n\
                 - Files deleted: {}\n\
                 - Directories deleted: {}\n\
                 - Files failed: {}\n\
                 - Directories failed: {}\n\
                 - Space freed: {}\n\
                 - Time taken: {:.2}s",
                stats.files_scanned,
                stats.dirs_scanned,
                files_matched,
                dirs_matched,
                stats.files_deleted,
                stats.dirs_deleted,
                stats.files_failed,
                stats.dirs_failed,
                Self::format_size(stats.space_freed),
                stats.time_taken.as_secs_f64()
            );

            // 添加删除的目录详细信息
            if !delete_result.deleted_dirs.is_empty() {
                report.push_str("\n\n📁 Deleted Directories:");
                for (idx, dir) in delete_result.deleted_dirs.iter().enumerate() {
                    if idx < 50 {
                        // 最多显示50个
                        report.push_str(&format!("\n   - {}", dir.display()));
                    } else {
                        report.push_str(&format!(
                            "\n   ... and {} more directories",
                            delete_result.deleted_dirs.len() - 50
                        ));
                        break;
                    }
                }
            }

            // 添加删除的文件详细信息
            if !delete_result.deleted_files.is_empty() {
                report.push_str("\n\n📄 Deleted Files:");
                for (idx, file) in delete_result.deleted_files.iter().enumerate() {
                    if idx < 50 {
                        // 最多显示50个
                        report.push_str(&format!("\n   - {}", file.display()));
                    } else {
                        report.push_str(&format!(
                            "\n   ... and {} more files",
                            delete_result.deleted_files.len() - 50
                        ));
                        break;
                    }
                }
            }

            // 添加失败的目录详细信息
            if !delete_result.failed_dirs.is_empty() {
                report.push_str("\n\n❌ Failed Directories:");
                for (dir, error) in &delete_result.failed_dirs {
                    report.push_str(&format!("\n   - {}: {}", dir.display(), error));
                }
            }

            // 添加失败的文件详细信息
            if !delete_result.failed_files.is_empty() {
                report.push_str("\n\n❌ Failed Files:");
                for (file, error) in &delete_result.failed_files {
                    report.push_str(&format!("\n   - {}: {}", file.display(), error));
                }
            }

            report
        } else {
            format!(
                "Cleaned {} directories, {} files, freed {}",
                stats.dirs_deleted,
                stats.files_deleted,
                Self::format_size(stats.space_freed)
            )
        }
    }

    fn format_size(bytes: u64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        let mut size = bytes as f64;
        let mut unit_idx = 0;

        while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
            size /= 1024.0;
            unit_idx += 1;
        }

        format!("{:.2} {}", size, UNITS[unit_idx])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::Instant;

    #[test]
    fn test_collect_stats() {
        let search_result = SearchResult {
            folders: vec![PathBuf::from("/test/dir1"), PathBuf::from("/test/dir2")],
            files: vec![
                PathBuf::from("/test/file1.txt"),
                PathBuf::from("/test/file2.txt"),
            ],
            total_size: 2048,
            total_dirs_scanned: 10,
            total_files_scanned: 20,
        };

        let delete_result = DeleteResult {
            deleted_files: vec![PathBuf::from("/test/file1.txt")],
            deleted_dirs: vec![PathBuf::from("/test/dir1")],
            failed_files: vec![(
                PathBuf::from("/test/file2.txt"),
                "Permission denied".to_string(),
            )],
            failed_dirs: vec![],
            total_size: 1024,
        };

        let start_time = Instant::now();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let stats = ReportGenerator::collect_stats(&search_result, &delete_result, start_time);

        assert_eq!(stats.files_scanned, 20);
        assert_eq!(stats.dirs_scanned, 10);
        assert_eq!(stats.files_deleted, 1);
        assert_eq!(stats.dirs_deleted, 1);
        assert_eq!(stats.files_failed, 1);
        assert_eq!(stats.dirs_failed, 0);
        assert_eq!(stats.space_freed, 1024);
        assert!(stats.time_taken.as_millis() >= 10);
    }

    #[test]
    fn test_format_report() {
        let stats = Stats {
            files_scanned: 10,
            dirs_scanned: 5,
            files_deleted: 8,
            dirs_deleted: 4,
            files_failed: 2,
            dirs_failed: 1,
            space_freed: 1024 * 1024, // 1MB
            time_taken: std::time::Duration::from_secs(1),
        };

        let delete_result = DeleteResult {
            deleted_files: vec![],
            deleted_dirs: vec![],
            failed_files: vec![],
            failed_dirs: vec![],
            total_size: 0,
        };

        // 测试详细模式
        let verbose_report = ReportGenerator::format_report(&stats, &delete_result, true);
        assert!(verbose_report.contains("Files scanned: 10"));
        assert!(verbose_report.contains("Directories scanned: 5"));
        assert!(verbose_report.contains("Files deleted: 8"));
        assert!(verbose_report.contains("Space freed"));

        // 测试简洁模式
        let simple_report = ReportGenerator::format_report(&stats, &delete_result, false);
        assert!(simple_report.contains("Cleaned 4 directories"));
        assert!(simple_report.contains("8 files"));
        assert!(simple_report.contains("freed"));
    }

    #[test]
    fn test_format_size() {
        let empty_delete_result = DeleteResult {
            deleted_files: vec![],
            deleted_dirs: vec![],
            failed_files: vec![],
            failed_dirs: vec![],
            total_size: 0,
        };

        // 测试字节
        let stats = Stats {
            files_scanned: 0,
            dirs_scanned: 0,
            files_deleted: 0,
            dirs_deleted: 0,
            files_failed: 0,
            dirs_failed: 0,
            space_freed: 512,
            time_taken: std::time::Duration::from_secs(0),
        };
        let report = ReportGenerator::format_report(&stats, &empty_delete_result, false);
        assert!(report.contains("B"));

        // 测试 KB
        let stats = Stats {
            files_scanned: 0,
            dirs_scanned: 0,
            files_deleted: 0,
            dirs_deleted: 0,
            files_failed: 0,
            dirs_failed: 0,
            space_freed: 2048,
            time_taken: std::time::Duration::from_secs(0),
        };
        let report = ReportGenerator::format_report(&stats, &empty_delete_result, false);
        assert!(report.contains("KB"));

        // 测试 MB
        let stats = Stats {
            files_scanned: 0,
            dirs_scanned: 0,
            files_deleted: 0,
            dirs_deleted: 0,
            files_failed: 0,
            dirs_failed: 0,
            space_freed: 2 * 1024 * 1024,
            time_taken: std::time::Duration::from_secs(0),
        };
        let report = ReportGenerator::format_report(&stats, &empty_delete_result, false);
        assert!(report.contains("MB"));
    }
}
