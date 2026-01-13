import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { expandPath } from "../utils/path";
import { existsSync } from "fs";
import { CleanOptions } from "@build-cleaner/node";

interface CleanActionProps {
  inputPath: string;
  selectedPatterns: string[];
  dryRun: boolean;
  onClean: (options: CleanOptions) => void;
}

export function CleanAction({
  inputPath,
  selectedPatterns,
  dryRun,
  onClean,
}: CleanActionProps) {
  const handleClean = () => {
    if (!inputPath || inputPath.trim() === "") {
      showToast({
        style: Toast.Style.Failure,
        title: "请输入路径",
        message: "在搜索框中输入要清理的路径",
      });
      return;
    }
    const expandedPath = expandPath(inputPath.trim());
    if (!existsSync(expandedPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "路径不存在",
        message: `路径 ${expandedPath} 不存在`,
      });
      return;
    }
    onClean({
      paths: [inputPath.trim()],
      patterns: selectedPatterns.length > 0 ? selectedPatterns : undefined,
      dryRun,
      verbose: true,
    });
  };

  return (
    <List.Section title="执行清理">
      <List.Item
        id="action-clean"
        title={dryRun ? "预览清理" : "执行清理"}
        subtitle={
          dryRun
            ? "查看将要删除的内容（不会实际删除）"
            : "⚠️ 将实际删除文件，请谨慎操作"
        }
        icon={dryRun ? Icon.Eye : Icon.Trash}
        actions={
          <ActionPanel>
            <Action
              title={dryRun ? "预览清理" : "执行清理"}
              onAction={handleClean}
              icon={dryRun ? Icon.Eye : Icon.Trash}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
