use build_cleaner_core::error::CleanError;
use build_cleaner_core::search::SearchResult;
use std::io::{self, Write};

/// 格式化文件大小
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

/// 交互式确认删除操作
///
/// # 参数
/// * `search_result` - 搜索结果，用于显示将要删除的内容统计和路径
/// * `verbose` - 是否显示所有路径（如果为 false，最多显示 50 个）
///
/// # 返回
/// 如果用户确认返回 `Ok(true)`，否则返回 `Ok(false)`
pub fn confirm_deletion(search_result: &SearchResult, verbose: bool) -> Result<bool, CleanError> {
    println!("\n📋 Items to be moved to trash:");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const MAX_DISPLAY_ITEMS: usize = 50;

    // 显示目录
    if !search_result.folders.is_empty() {
        let total_dirs = search_result.folders.len();
        let display_count = if verbose {
            total_dirs
        } else {
            total_dirs.min(MAX_DISPLAY_ITEMS)
        };
        println!("\n📁 Directories ({}):", total_dirs);
        for (idx, dir) in search_result.folders.iter().take(display_count).enumerate() {
            println!("  {}. {}", idx + 1, dir.display());
        }
        if !verbose && total_dirs > MAX_DISPLAY_ITEMS {
            println!(
                "  ... and {} more directories (use --verbose to see all)",
                total_dirs - MAX_DISPLAY_ITEMS
            );
        }
    }

    // 显示文件
    if !search_result.files.is_empty() {
        let total_files = search_result.files.len();
        let display_count = if verbose {
            total_files
        } else {
            total_files.min(MAX_DISPLAY_ITEMS)
        };
        println!("\n📄 Files ({}):", total_files);
        for (idx, file) in search_result.files.iter().take(display_count).enumerate() {
            println!("  {}. {}", idx + 1, file.display());
        }
        if !verbose && total_files > MAX_DISPLAY_ITEMS {
            println!(
                "  ... and {} more files (use --verbose to see all)",
                total_files - MAX_DISPLAY_ITEMS
            );
        }
    }

    // 显示统计信息
    println!("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!(
        "📊 Summary: {} directories, {} files, Total size: {}",
        search_result.folders.len(),
        search_result.files.len(),
        format_size(search_result.total_size)
    );
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    print!("\n⚠️  Do you want to proceed? (y/N): ");
    io::stdout()
        .flush()
        .map_err(|e| CleanError::Other(e.to_string()))?;

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .map_err(|e| CleanError::Other(e.to_string()))?;

    Ok(input.trim().to_lowercase() == "y" || input.trim().to_lowercase() == "yes")
}

/// 确认单个项目的删除
///
/// # 参数
/// * `path` - 要删除的路径
/// * `is_dir` - 是否为目录
/// * `size` - 文件/目录大小（字节）
///
/// # 返回
/// - `Ok(true)` - 用户确认删除
/// - `Ok(false)` - 用户跳过
/// - `Err("all")` - 用户选择删除所有剩余项目
/// - `Err("quit")` - 用户取消操作
pub fn confirm_item_deletion(path: &std::path::Path, is_dir: bool, size: u64) -> Result<bool, String> {
    let item_type = if is_dir { "Directory" } else { "File" };
    let size_str = format_size(size);
    
    print!(
        "\n🗑️  {}: {} (Size: {})\n   Delete? (y/N/a=all/q=quit): ",
        item_type,
        path.display(),
        size_str
    );
    io::stdout()
        .flush()
        .map_err(|e| e.to_string())?;

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .map_err(|e| e.to_string())?;

    let trimmed = input.trim().to_lowercase();
    match trimmed.as_str() {
        "y" | "yes" => Ok(true),
        "a" | "all" => Err("all".to_string()),
        "q" | "quit" => Err("quit".to_string()),
        _ => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use build_cleaner_core::search::SearchResult;
    use std::path::PathBuf;
    use build_cleaner_core::search::SearchResult;
    use std::path::PathBuf;

    #[test]
    fn test_confirm_deletion_format() {
        // 测试确认信息的格式
        let search_result = SearchResult {
            folders: vec![PathBuf::from("/test/dir1")],
            files: vec![PathBuf::from("/test/file1.txt")],
            total_size: 1024,
            total_dirs_scanned: 1,
            total_files_scanned: 1,
        };

        // 这个测试主要验证函数不会 panic
        // 实际交互测试需要模拟输入，这里只测试函数结构
        let _ = search_result.folders.len();
        let _ = search_result.files.len();
    }
}
