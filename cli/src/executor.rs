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
            let delete_plan = DeleteEngine::create_delete_plan(&search_result);
            let delete_result = DeleteEngine::execute_deletion(&delete_plan, true);
            let stats = ReportGenerator::collect_stats(&search_result, &delete_result, start_time);
            let report = ReportGenerator::format_report(&stats, &delete_result, args.verbose);
            println!("{}", report);
            if !args.verbose {
                println!("ℹ️  Run without --dry-run to actually clean");
            }
            return Ok(());
        }

        let delete_plan = DeleteEngine::create_delete_plan(&search_result);

        // 交互模式下，直接逐个确认删除（不再显示批量确认，避免重复）
        let delete_result = if args.interactive {
            if !args.quiet {
                let total_items = delete_plan.files.len() + delete_plan.dirs.len();
                println!(
                    "\n📋 Found {} directories and {} files to delete ({} items total).",
                    delete_plan.dirs.len(),
                    delete_plan.files.len(),
                    total_items
                );
                println!(
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                );
                println!(
                    "⚠️  You will be prompted for each item. Options: y=yes, N=skip, a=all, q=quit"
                );
                println!(
                    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                );
            }
            Self::execute_deletion_interactive(&delete_plan, args.quiet)?
        } else {
            // 非交互模式下，显示清理开始信息
            if args.verbose && !args.quiet {
                println!("🧹 Cleaning...");
            }
            DeleteEngine::execute_deletion(&delete_plan, false)
        };

        let stats = ReportGenerator::collect_stats(&search_result, &delete_result, start_time);

        let report = ReportGenerator::format_report(&stats, &delete_result, args.verbose);
        crate::output::print_report(&report, args.quiet);

        // 显示完成信息
        if args.verbose && !args.quiet {
            println!("✅ Cleanup completed");
        }

        // 如果有失败的项目，显示警告
        if (stats.files_failed > 0 || stats.dirs_failed > 0) && !args.quiet {
            crate::output::print_warning(&format!(
                "Some items failed to delete: {} files, {} directories",
                stats.files_failed, stats.dirs_failed
            ));
        }

        Ok(())
    }

    /// 交互式执行删除操作，逐个确认每个文件/目录
    fn execute_deletion_interactive(
        plan: &build_cleaner_core::delete::DeletePlan,
        quiet: bool,
    ) -> Result<build_cleaner_core::delete::DeleteResult, CleanError> {
        use build_cleaner_core::delete::{DeleteEngine, DeleteResult};
        use std::fs;
        use trash;

        let mut deleted_files = Vec::new();
        let mut deleted_dirs = Vec::new();
        let mut failed_files = Vec::new();
        let mut failed_dirs = Vec::new();
        let mut total_size = 0u64;
        let mut confirm_all = false;

        // 删除文件
        for file in &plan.files {
            match DeleteEngine::check_safety(file) {
                Ok(_) => {
                    let file_size = fs::metadata(file).map(|m| m.len()).unwrap_or(0);

                    if !confirm_all {
                        match crate::interactive::confirm_item_deletion(file, false, file_size) {
                            Ok(true) => {
                                // 用户确认删除
                            }
                            Ok(false) => {
                                if !quiet {
                                    println!("  ⏭️  Skipped: {}", file.display());
                                }
                                continue;
                            }
                            Err(ref e) if e == "all" => {
                                confirm_all = true;
                                if !quiet {
                                    println!("  ✅ All remaining items will be deleted");
                                }
                            }
                            Err(ref e) if e == "quit" => {
                                if !quiet {
                                    println!("  ❌ Operation cancelled by user");
                                }
                                return Err(CleanError::Other("User cancelled".to_string()));
                            }
                            Err(e) => {
                                if !quiet {
                                    println!("  ❌ Error: {}", e);
                                }
                                return Err(CleanError::Other(e));
                            }
                        }
                    }

                    match trash::delete(file) {
                        Ok(_) => {
                            total_size += file_size;
                            deleted_files.push(file.clone());
                            if !quiet {
                                println!("  ✅ Deleted: {}", file.display());
                            }
                        }
                        Err(e) => {
                            failed_files.push((file.clone(), e.to_string()));
                            if !quiet {
                                println!("  ❌ Failed: {} - {}", file.display(), e);
                            }
                        }
                    }
                }
                Err(e) => {
                    failed_files.push((file.clone(), e.to_string()));
                    if !quiet {
                        println!("  ⚠️  Safety check failed: {} - {}", file.display(), e);
                    }
                }
            }
        }

        // 删除目录（需要计算目录大小）
        for dir in &plan.dirs {
            match DeleteEngine::check_safety(dir) {
                Ok(_) => {
                    // 计算目录大小
                    let dir_size = {
                        use walkdir::WalkDir;
                        let mut size = 0u64;
                        for entry in WalkDir::new(dir).into_iter().flatten() {
                            if entry.file_type().is_file() {
                                if let Ok(metadata) = entry.metadata() {
                                    size += metadata.len();
                                }
                            }
                        }
                        size
                    };

                    if !confirm_all {
                        match crate::interactive::confirm_item_deletion(dir, true, dir_size) {
                            Ok(true) => {
                                // 用户确认删除
                            }
                            Ok(false) => {
                                if !quiet {
                                    println!("  ⏭️  Skipped: {}", dir.display());
                                }
                                continue;
                            }
                            Err(ref e) if e == "all" => {
                                confirm_all = true;
                                if !quiet {
                                    println!("  ✅ All remaining items will be deleted");
                                }
                            }
                            Err(ref e) if e == "quit" => {
                                if !quiet {
                                    println!("  ❌ Operation cancelled by user");
                                }
                                return Err(CleanError::Other("User cancelled".to_string()));
                            }
                            Err(e) => {
                                if !quiet {
                                    println!("  ❌ Error: {}", e);
                                }
                                return Err(CleanError::Other(e));
                            }
                        }
                    }

                    match trash::delete(dir) {
                        Ok(_) => {
                            total_size += dir_size;
                            deleted_dirs.push(dir.clone());
                            if !quiet {
                                println!("  ✅ Deleted: {}", dir.display());
                            }
                        }
                        Err(e) => {
                            failed_dirs.push((dir.clone(), e.to_string()));
                            if !quiet {
                                println!("  ❌ Failed: {} - {}", dir.display(), e);
                            }
                        }
                    }
                }
                Err(e) => {
                    failed_dirs.push((dir.clone(), e.to_string()));
                    if !quiet {
                        println!("  ⚠️  Safety check failed: {} - {}", dir.display(), e);
                    }
                }
            }
        }

        Ok(DeleteResult {
            deleted_files,
            deleted_dirs,
            failed_files,
            failed_dirs,
            total_size,
        })
    }
}
