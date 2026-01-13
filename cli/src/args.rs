use clap::Parser;
use std::path::PathBuf;

/// 命令行参数结构
#[derive(Parser, Debug)]
#[command(
    name = "bc",
    about = "A fast tool for batch cleaning temporary directories and files in projects",
    long_about = None,
    version = env!("CARGO_PKG_VERSION")
)]
pub struct Args {
    /// List of paths to search (required, at least one)
    #[arg(required = true, num_args = 1..)]
    pub paths: Vec<PathBuf>,

    /// Cleanup pattern list (folders end with /, files use wildcards)
    #[arg(long = "clean", num_args = 1..)]
    pub clean_patterns: Vec<String>,

    /// Configuration file path (optional, supports YAML and JSON formats)
    #[arg(long = "config")]
    pub config_file: Option<PathBuf>,

    /// Enable preview mode (does not actually delete, only shows what will be deleted)
    #[arg(long = "dry-run")]
    pub dry_run: bool,

    /// Enable interactive confirmation (asks for user confirmation before deletion)
    #[arg(long = "interactive", short = 'i')]
    pub interactive: bool,

    /// Enable verbose output (shows detailed cleanup report)
    #[arg(long = "verbose", short = 'v')]
    pub verbose: bool,

    /// Enable quiet mode (minimal output, only shows errors)
    #[arg(long = "quiet", short = 'q')]
    pub quiet: bool,

    /// Enable debug mode (shows debug logs)
    #[arg(long = "debug")]
    pub debug: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_args_parsing() {
        // 测试基本参数解析
        let args = Args::try_parse_from(&["bc", "."]).unwrap();
        assert_eq!(args.paths.len(), 1);
        assert!(!args.dry_run);
        assert!(!args.interactive);
        assert!(!args.verbose);
        assert!(!args.quiet);
        assert!(!args.debug);
    }

    #[test]
    fn test_args_with_options() {
        // 测试带选项的参数解析
        // 注意：--clean 需要单独的参数，路径必须在最后
        let args = Args::try_parse_from(&[
            "bc",
            ".",
            "--dry-run",
            "--interactive",
            "--verbose",
            "--clean",
            "node_modules/",
        ])
        .unwrap();
        assert!(args.dry_run);
        assert!(args.interactive);
        assert!(args.verbose);
        assert_eq!(args.clean_patterns.len(), 1);
        assert_eq!(args.clean_patterns[0], "node_modules/");
        assert_eq!(args.paths.len(), 1);
    }

    #[test]
    fn test_args_multiple_paths() {
        // 测试多个路径
        let args = Args::try_parse_from(&["bc", ".", "~/project1", "~/project2"]).unwrap();
        assert_eq!(args.paths.len(), 3);
    }

    #[test]
    fn test_args_multiple_clean_patterns() {
        // 测试多个清理模式（多次使用 --clean 选项）
        let args = Args::try_parse_from(&[
            "bc",
            ".",
            "--clean",
            "node_modules/",
            "--clean",
            "dist/",
            "--clean",
            "*.log",
        ])
        .unwrap();
        assert_eq!(args.clean_patterns.len(), 3);
        assert!(args.clean_patterns.contains(&"node_modules/".to_string()));
        assert!(args.clean_patterns.contains(&"dist/".to_string()));
        assert!(args.clean_patterns.contains(&"*.log".to_string()));
        assert_eq!(args.paths.len(), 1);
    }

    #[test]
    fn test_args_short_options() {
        // 测试短选项
        let args = Args::try_parse_from(&["bc", "-i", "-v", "-q", "."]).unwrap();
        assert!(args.interactive);
        assert!(args.verbose);
        assert!(args.quiet);
    }

    #[test]
    fn test_args_config_file() {
        // 测试配置文件选项
        let args = Args::try_parse_from(&["bc", "--config", ".bc.yaml", "."]).unwrap();
        assert_eq!(args.config_file, Some(PathBuf::from(".bc.yaml")));
    }
}
