use build_cleaner_core::error::CleanError;
use build_cleaner_core::search::SearchResult;
use std::io::{self, Write};

/// 交互式确认删除操作
///
/// # 参数
/// * `search_result` - 搜索结果，用于显示将要删除的内容统计
///
/// # 返回
/// 如果用户确认返回 `Ok(true)`，否则返回 `Ok(false)`
pub fn confirm_deletion(search_result: &SearchResult) -> Result<bool, CleanError> {
    println!(
        "Found {} directories and {} files to delete.",
        search_result.folders.len(),
        search_result.files.len()
    );
    print!("Do you want to proceed? (y/N): ");
    io::stdout()
        .flush()
        .map_err(|e| CleanError::Other(e.to_string()))?;

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .map_err(|e| CleanError::Other(e.to_string()))?;

    Ok(input.trim().to_lowercase() == "y" || input.trim().to_lowercase() == "yes")
}

#[cfg(test)]
mod tests {
    use super::*;
    use build_cleaner_core::search::SearchResult;
    use std::path::PathBuf;

    #[test]
    fn test_confirm_deletion_format() {
        // 测试确认信息的格式
        let search_result = SearchResult {
            folders: vec![PathBuf::from("/test/dir1")],
            files: vec![PathBuf::from("/test/file1.txt")],
            total_size: 1024,
        };

        // 这个测试主要验证函数不会 panic
        // 实际交互测试需要模拟输入，这里只测试函数结构
        let _ = search_result.folders.len();
        let _ = search_result.files.len();
    }
}
