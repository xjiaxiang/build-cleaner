use crate::args::Args;
use build_cleaner_core::{CleanError, ConfigLoader, DeleteEngine, ReportGenerator, SearchEngine};
use std::time::Instant;

/// 命令执行器，负责执行清理命令的完整流程
pub struct CommandExecutor;

impl CommandExecutor {
    /// 执行清理命令
    ///
    /// # 流程
    /// 1. 加载配置（默认配置 + 配置文件 + 命令行参数）
    /// 2. 搜索匹配的文件和目录
    /// 3. 如果是预览模式，生成预览报告并返回
    /// 4. 如果是交互模式，询问用户确认
    /// 5. 执行删除操作
    /// 6. 生成并输出清理报告
    ///
    /// # 参数
    /// * `args` - 命令行参数
    ///
    /// # 返回
    /// 如果执行成功返回 `Ok(())`，否则返回错误
    pub fn execute(args: Args) -> Result<(), CleanError> {
        let start_time = Instant::now();

        // 展开并验证所有路径
        let mut expanded_paths = Vec::new();
        for path in &args.paths {
            let expanded = if path.to_string_lossy().starts_with('~') {
                ConfigLoader::expand_path(&path.to_string_lossy())
            } else {
                path.clone()
            };
            ConfigLoader::validate_path(&expanded)?;
            expanded_paths.push(expanded);
        }

        let config = ConfigLoader::load_config(
            &expanded_paths[0],
            args.config_file.as_deref(),
            &args.clean_patterns,
        )?;

        // 显示扫描开始信息（即使非 verbose 模式也显示，避免用户以为程序卡住）
        if !args.quiet {
            crate::output::print_scanning_start(args.dry_run);
        }

        // 格式化大小的辅助函数
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

        // 设置进度回调
        let progress_callback = if !args.quiet {
            Some(
                |files_scanned: usize,
                 dirs_scanned: usize,
                 files_matched: usize,
                 dirs_matched: usize,
                 total_size: u64| {
                    // 格式化大小
                    let size_str = format_size(total_size);
                    eprint!(
                        "\r📊 Scanning... Files: {}, Dirs: {}, Matched: {} files, {} dirs, Size: {}",
                        files_scanned, dirs_scanned, files_matched, dirs_matched, size_str
                    );
                    use std::io::Write;
                    let _ = std::io::stderr().flush();
                },
            )
        } else {
            None
        };

        let search_result =
            SearchEngine::search_with_progress(&expanded_paths, &config, progress_callback)?;

        // 清除进度行并换行
        if !args.quiet {
            eprintln!("\r✅ Scanning completed");
        }

        if args.dry_run {
            // 在 dry-run 模式下，文件大小和目录大小都已经在搜索阶段计算完成了
            // 直接使用 SearchResult 中的 total_size，避免重复计算
            let delete_result = DeleteEngine::execute_deletion_from_search(&search_result, true);
            let stats = ReportGenerator::collect_stats(&search_result, &delete_result, start_time);
            let report = ReportGenerator::format_report(&stats, &delete_result, args.verbose);
            println!("{}", report);
            if !args.verbose {
                println!("ℹ️  Run without --dry-run to actually clean");
            }
            return Ok(());
        }

        if args.interactive {
            if !crate::interactive::confirm_deletion(&search_result)? {
                if !args.quiet {
                    println!("Operation cancelled.");
                }
                return Ok(());
            }
        }

        // 显示清理开始信息
        if args.verbose && !args.quiet {
            println!("🧹 Cleaning...");
        }

        let delete_plan = DeleteEngine::create_delete_plan(&search_result);
        let delete_result = DeleteEngine::execute_deletion(&delete_plan, false);

        let stats = ReportGenerator::collect_stats(&search_result, &delete_result, start_time);

        let report = ReportGenerator::format_report(&stats, &delete_result, args.verbose);
        crate::output::print_report(&report, args.quiet);

        // 显示完成信息
        if args.verbose && !args.quiet {
            println!("✅ Cleanup completed");
        }

        // 如果有失败的项目，显示警告
        if stats.files_failed > 0 || stats.dirs_failed > 0 {
            if !args.quiet {
                crate::output::print_warning(&format!(
                    "Some items failed to delete: {} files, {} directories",
                    stats.files_failed, stats.dirs_failed
                ));
            }
        }

        Ok(())
    }
}
