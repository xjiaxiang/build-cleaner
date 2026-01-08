//! Build Cleaner Core Library
//!
//! 提供清理项目临时文件和目录的核心功能，包括：
//! - 配置管理：项目类型识别、配置加载和合并
//! - 文件搜索：路径遍历、模式匹配、过滤规则
//! - 文件删除：删除计划生成、安全检查、删除执行
//! - 报告生成：统计信息收集、报告格式化
//! - 日志记录：多级别日志支持

pub mod config;
pub mod delete;
pub mod error;
pub mod log;
pub mod report;
pub mod search;

pub use config::{Config, ConfigLoader, ProjectType};
pub use delete::{DeleteEngine, DeletePlan, DeleteResult};
pub use error::CleanError;
pub use report::{ReportGenerator, Stats};
pub use search::{SearchEngine, SearchOptions, SearchResult};
