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

  // Copy path to clipboard
  const copyToClipboard = async (
    text: string,
    message: string = "Copied to clipboard",
  ) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: message,
    });
  };

  // Generate result summary text
  const generateSummary = (): string => {
    const lines = [
      `Cleanup completed - ${new Date().toLocaleString()}`,
      "",
      "Statistics:",
      `- Scanned ${result.dirsScanned} directories, ${result.filesScanned} files`,
      `- Deleted ${result.dirsDeleted} directories, ${result.filesDeleted} files`,
      `- Freed ${formatSize(result.spaceFreed)} space`,
      `- Time taken: ${result.timeTaken.toFixed(2)} seconds`,
    ];

    if (result.filesFailed > 0 || result.dirsFailed > 0) {
      lines.push(
        `- Failed: ${result.filesFailed} files, ${result.dirsFailed} directories`,
      );
    }

    if (deletedDirs.length > 0) {
      lines.push("", `Deleted directories (${deletedDirs.length}):`);
      deletedDirs.forEach(dir => lines.push(`  ${dir}`));
    }

    if (deletedFiles.length > 0) {
      lines.push("", `Deleted files (${deletedFiles.length}):`);
      deletedFiles.forEach(file => lines.push(`  ${file}`));
    }

    if (failedDirs.length > 0) {
      lines.push("", `Failed directories (${failedDirs.length}):`);
      failedDirs.forEach(item =>
        lines.push(`  ${item.path} - Error: ${item.error}`),
      );
    }

    if (failedFiles.length > 0) {
      lines.push("", `Failed files (${failedFiles.length}):`);
      failedFiles.forEach(item =>
        lines.push(`  ${item.path} - Error: ${item.error}`),
      );
    }

    return lines.join("\n");
  };

  return (
    <List
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
      searchBarPlaceholder="Cleanup Results"
      searchText=""
      onSearchTextChange={() => {
        // Search is not allowed in result view, keep search box empty
      }}
      isLoading={false}
    >
      <List.Section title="Cleanup Results">
        <List.Item
          id="result-summary"
          title="✅ Cleanup Completed"
          subtitle={`Freed ${formatSize(result.spaceFreed)} space`}
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title="Copy Full Results"
                onAction={() =>
                  copyToClipboard(generateSummary(), "Full results copied")
                }
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action
                title="Copy Statistics"
                onAction={() =>
                  copyToClipboard(
                    `Deleted ${result.dirsDeleted} directories, ${result.filesDeleted} files, freed ${formatSize(result.spaceFreed)} space`,
                    "Statistics copied",
                  )
                }
                icon={Icon.Document}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="result-dirs"
          title={`Directories: ${result.dirsDeleted} deleted`}
          subtitle={`Scanned ${result.dirsScanned} directories`}
          icon={Icon.Folder}
        />
        <List.Item
          id="result-files"
          title={`Files: ${result.filesDeleted} deleted`}
          subtitle={`Scanned ${result.filesScanned} files`}
          icon={Icon.Document}
        />
        {result.filesFailed > 0 || result.dirsFailed > 0 ? (
          <List.Item
            id="result-failed"
            title={`⚠️ Failed: ${result.filesFailed} files, ${result.dirsFailed} directories`}
            subtitle="Some files failed to delete"
            icon={Icon.ExclamationMark}
          />
        ) : null}
        <List.Item
          id="result-time"
          title={`Time taken: ${result.timeTaken.toFixed(2)} seconds`}
          subtitle="Operation completion time"
          icon={Icon.Clock}
        />
      </List.Section>

      {deletedDirs.length > 0 && (
        <List.Section
          title={`Deleted Directories (${deletedDirs.length})`}
          subtitle={
            deletedDirs.length > maxDisplayItems
              ? `Showing first ${maxDisplayItems} of ${deletedDirs.length}`
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
                subtitle="Deleted"
                icon={Icon.Folder}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Finder"
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
              title={`... ${deletedDirs.length - maxDisplayItems} more directories`}
              subtitle="See full output for details"
              icon={Icon.Ellipsis}
            />
          )}
        </List.Section>
      )}

      {deletedFiles.length > 0 && (
        <List.Section
          title={`Deleted Files (${deletedFiles.length})`}
          subtitle={
            deletedFiles.length > maxDisplayItems
              ? `Showing first ${maxDisplayItems} of ${deletedFiles.length}`
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
                subtitle="Deleted"
                icon={Icon.Document}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Finder"
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
              title={`... ${deletedFiles.length - maxDisplayItems} more files`}
              subtitle="See full output for details"
              icon={Icon.Ellipsis}
            />
          )}
        </List.Section>
      )}

      {(failedDirs.length > 0 || failedFiles.length > 0) && (
        <List.Section title="Deletion Failed">
          {failedDirs.map(
            (item: { path: string; error: string }, index: number) => (
              <List.Item
                key={`failed-dir-${index}`}
                id={`failed-dir-${index}`}
                title={item.path}
                subtitle={`Error: ${item.error}`}
                icon={Icon.ExclamationMark}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Finder"
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
                subtitle={`Error: ${item.error}`}
                icon={Icon.ExclamationMark}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Finder"
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

      <List.Section title="Actions">
        <List.Item
          id="result-back"
          title="Clean Again"
          subtitle="Return to main interface"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action title="Back" onAction={onBack} icon={Icon.ArrowLeft} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
