/// 打印清理报告
///
/// # 参数
/// * `report` - 报告内容
/// * `quiet` - 是否为静默模式（静默模式下不输出）
pub fn print_report(report: &str, quiet: bool) {
    if !quiet {
        println!("{}", report);
    }
}

/// 打印错误信息
///
/// # 参数
/// * `error` - 错误信息
pub fn print_error(error: &str) {
    eprintln!("Error: {}", error);
}

/// 打印信息消息
///
/// # 参数
/// * `message` - 信息内容
#[allow(dead_code)]
pub fn print_info(message: &str) {
    println!("{}", message);
}

/// 打印警告信息
///
/// # 参数
/// * `warning` - 警告信息
pub fn print_warning(warning: &str) {
    eprintln!("Warning: {}", warning);
}

/// 打印扫描开始信息
///
/// # 参数
/// * `dry_run` - 是否为预览模式
pub fn print_scanning_start(dry_run: bool) {
    if dry_run {
        println!("🔍 Scanning for files to clean (dry-run mode)...");
    } else {
        println!("🔍 Scanning for files to clean...");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_print_report_quiet() {
        // 测试静默模式不输出
        // 这个测试主要验证函数不会 panic
        print_report("test report", true);
    }

    #[test]
    fn test_print_report_verbose() {
        // 测试正常模式输出
        // 这个测试主要验证函数不会 panic
        print_report("test report", false);
    }

    #[test]
    fn test_print_error() {
        // 测试错误输出
        // 这个测试主要验证函数不会 panic
        print_error("test error");
    }

    #[test]
    fn test_print_warning() {
        // 测试警告输出
        // 这个测试主要验证函数不会 panic
        print_warning("test warning");
    }

    #[test]
    fn test_print_scanning_start() {
        // 测试扫描开始信息
        print_scanning_start(false);
        print_scanning_start(true);
    }
}
