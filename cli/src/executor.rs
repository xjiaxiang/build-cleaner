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

        // 显示扫描开始信息
        if args.verbose && !args.quiet {
            crate::output::print_scanning_start(args.dry_run);
        }

        let search_result = SearchEngine::search(&expanded_paths, &config)?;

        if args.dry_run {
            let delete_result = DeleteEngine::execute_deletion(
                &DeleteEngine::create_delete_plan(&search_result),
                true,
            );
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
