import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CleanOptions } from "@build-cleaner/node";

interface ConfirmDialogProps {
  inputPath: string;
  selectedPatterns: string[];
  onConfirm: (options: CleanOptions) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  inputPath,
  selectedPatterns,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handlePreview = () => {
    onConfirm({
      paths: [inputPath.trim()],
      patterns: selectedPatterns.length > 0 ? selectedPatterns : undefined,
      dryRun: true,
      verbose: true,
    });
  };

  const handleDelete = () => {
    onConfirm({
      paths: [inputPath.trim()],
      patterns: selectedPatterns.length > 0 ? selectedPatterns : undefined,
      dryRun: false,
      verbose: true,
    });
  };

  return (
    <>
      <List.Section title="选择操作">
        <List.Item
          id="action-preview"
          title="🔍 预览清理"
          subtitle="查看将要删除的内容（不会实际删除）"
          icon={Icon.Eye}
          actions={
            <ActionPanel>
              <Action
                title="预览清理"
                onAction={handlePreview}
                icon={Icon.Eye}
              />
              <Action
                title="取消"
                onAction={onCancel}
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["opt"], key: "escape" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="action-delete"
          title="🗑️  执行清理"
          subtitle="⚠️  将实际删除文件，请谨慎操作"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="执行清理"
                onAction={handleDelete}
                icon={Icon.Trash}
              />
              <Action
                title="取消"
                onAction={onCancel}
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["opt"], key: "escape" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}
