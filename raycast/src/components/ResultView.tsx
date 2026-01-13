import {
  List,
  ActionPanel,
  Action,
  Icon,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { join } from "path";
import { open } from "@raycast/api";
import { CleanResult } from "@build-cleaner/node";
import { formatSize } from "../utils/format";

interface ResultViewProps {
  result: CleanResult;
  onBack: () => void;
  selectedItemId?: string;
  onSelectionChange: (id: string | null) => void;
}

export function ResultView({
  result,
  onBack,
  selectedItemId,
  onSelectionChange,
}: ResultViewProps) {
  const maxDisplayItems = 50;
  const deletedDirs = result.deletedDirs || [];
  const deletedFiles = result.deletedFiles || [];
  const failedDirs = result.failedDirs || [];
  const failedFiles = result.failedFiles || [];

  // 复制路径到剪贴板
  const copyToClipboard = async (
    text: string,
    message: string = "已复制到剪贴板",
  ) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: message,
    });
  };

  // 生成结果摘要文本
  const generateSummary = (): string => {
    const lines = [
      `清理完成 - ${new Date().toLocaleString()}`,
      "",
      "统计信息:",
      `- 扫描了 ${result.dirsScanned} 个目录，${result.filesScanned} 个文件`,
      `- 删除了 ${result.dirsDeleted} 个目录，${result.filesDeleted} 个文件`,
      `- 释放了 ${formatSize(result.spaceFreed)} 空间`,
      `- 耗时 ${result.timeTaken.toFixed(2)} 秒`,
    ];

    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      lines.push(
        `- 失败: ${result.filesFailed} 个文件，${result.dirsFailed} 个目录`,
      );
    }

    if (deletedDirs.length > 0) {
      lines.push("", `已删除的目录 (${deletedDirs.length}):`);
      deletedDirs.forEach((dir) => lines.push(`  ${dir}`));
    }

    if (deletedFiles.length > 0) {
      lines.push("", `已删除的文件 (${deletedFiles.length}):`);
      deletedFiles.forEach((file) => lines.push(`  ${file}`));
    }

    if (failedDirs.length > 0) {
      lines.push("", `删除失败的目录 (${failedDirs.length}):`);
      failedDirs.forEach((item) =>
        lines.push(`  ${item.path} - 错误: ${item.error}`),
      );
    }

    if (failedFiles.length > 0) {
      lines.push("", `删除失败的文件 (${failedFiles.length}):`);
      failedFiles.forEach((item) =>
        lines.push(`  ${item.path} - 错误: ${item.error}`),
      );
    }

    return lines.join("\n");
  };

  return (
    <List
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
      searchBarPlaceholder="清理结果"
      searchText=""
      onSearchTextChange={() => {
        // 结果视图中不允许搜索，保持搜索框为空
      }}
      isLoading={false}
    >
      <List.Section title="清理结果">
        <List.Item
          id="result-summary"
          title="✅ 清理完成"
          subtitle={`释放了 ${formatSize(result.spaceFreed)} 空间`}
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title="复制完整结果"
                onAction={() =>
                  copyToClipboard(generateSummary(), "已复制完整结果")
                }
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="复制统计信息"
                onAction={() =>
                  copyToClipboard(
                    `删除了 ${result.dirsDeleted} 个目录，${result.filesDeleted} 个文件，释放了 ${formatSize(result.spaceFreed)} 空间`,
                    "已复制统计信息",
                  )
                }
                icon={Icon.Document}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="result-dirs"
          title={`目录: ${result.dirsDeleted} 个已删除`}
          subtitle={`扫描了 ${result.dirsScanned} 个目录`}
          icon={Icon.Folder}
        />
        <List.Item
          id="result-files"
          title={`文件: ${result.filesDeleted} 个已删除`}
          subtitle={`扫描了 ${result.filesScanned} 个文件`}
          icon={Icon.Document}
        />
        {result.filesFailed > 0 || result.dirsFailed > 0 ? (
          <List.Item
            id="result-failed"
            title={`⚠️ 失败: ${result.filesFailed} 个文件, ${result.dirsFailed} 个目录`}
            subtitle="部分文件删除失败"
            icon={Icon.ExclamationMark}
          />
        ) : null}
        <List.Item
          id="result-time"
          title={`耗时: ${result.timeTaken.toFixed(2)} 秒`}
          subtitle="操作完成时间"
          icon={Icon.Clock}
        />
      </List.Section>

      {deletedDirs.length > 0 && (
        <List.Section
          title={`已删除的目录 (${deletedDirs.length})`}
          subtitle={
            deletedDirs.length > maxDisplayItems
              ? `显示前 ${maxDisplayItems} 个，共 ${deletedDirs.length} 个`
              : undefined
          }
        >
          {deletedDirs
            .slice(0, maxDisplayItems)
            .map((dir: string, index: number) => (
              <List.Item
                key={`deleted-dir-${index}`}
                id={`deleted-dir-${index}`}
                title={dir}
                subtitle="已删除"
                icon={Icon.Folder}
                actions={
                  <ActionPanel>
                    <Action
                      title="在 Finder 中打开"
                      onAction={() => {
                        const parentDir = join(dir, "..");
                        open(parentDir);
                      }}
                      icon={Icon.Finder}
                    />
                  </ActionPanel>
                }
              />
            ))}
          {deletedDirs.length > maxDisplayItems && (
            <List.Item
              id="deleted-dirs-more"
              title={`... 还有 ${deletedDirs.length - maxDisplayItems} 个目录`}
              subtitle="详细信息请查看完整输出"
              icon={Icon.Ellipsis}
            />
          )}
        </List.Section>
      )}

      {deletedFiles.length > 0 && (
        <List.Section
          title={`已删除的文件 (${deletedFiles.length})`}
          subtitle={
            deletedFiles.length > maxDisplayItems
              ? `显示前 ${maxDisplayItems} 个，共 ${deletedFiles.length} 个`
              : undefined
          }
        >
          {deletedFiles
            .slice(0, maxDisplayItems)
            .map((file: string, index: number) => (
              <List.Item
                key={`deleted-file-${index}`}
                id={`deleted-file-${index}`}
                title={file}
                subtitle="已删除"
                icon={Icon.Document}
                actions={
                  <ActionPanel>
                    <Action
                      title="在 Finder 中打开"
                      onAction={() => {
                        const parentDir = join(file, "..");
                        open(parentDir);
                      }}
                      icon={Icon.Finder}
                    />
                  </ActionPanel>
                }
              />
            ))}
          {deletedFiles.length > maxDisplayItems && (
            <List.Item
              id="deleted-files-more"
              title={`... 还有 ${deletedFiles.length - maxDisplayItems} 个文件`}
              subtitle="详细信息请查看完整输出"
              icon={Icon.Ellipsis}
            />
          )}
        </List.Section>
      )}

      {(failedDirs.length > 0 || failedFiles.length > 0) && (
        <List.Section title="删除失败">
          {failedDirs.map(
            (item: { path: string; error: string }, index: number) => (
              <List.Item
                key={`failed-dir-${index}`}
                id={`failed-dir-${index}`}
                title={item.path}
                subtitle={`错误: ${item.error}`}
                icon={Icon.ExclamationMark}
                actions={
                  <ActionPanel>
                    <Action
                      title="在 Finder 中打开"
                      onAction={() => {
                        const parentDir = join(item.path, "..");
                        open(parentDir);
                      }}
                      icon={Icon.Finder}
                    />
                  </ActionPanel>
                }
              />
            ),
          )}
          {failedFiles.map(
            (item: { path: string; error: string }, index: number) => (
              <List.Item
                key={`failed-file-${index}`}
                id={`failed-file-${index}`}
                title={item.path}
                subtitle={`错误: ${item.error}`}
                icon={Icon.ExclamationMark}
                actions={
                  <ActionPanel>
                    <Action
                      title="在 Finder 中打开"
                      onAction={() => {
                        const parentDir = join(item.path, "..");
                        open(parentDir);
                      }}
                      icon={Icon.Finder}
                    />
                  </ActionPanel>
                }
              />
            ),
          )}
        </List.Section>
      )}

      <List.Section title="操作">
        <List.Item
          id="result-back"
          title="重新清理"
          subtitle="返回主界面"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="返回" onAction={onBack} icon={Icon.ArrowLeft} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
