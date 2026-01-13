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
      <List.Section title="Select Action">
        <List.Item
          id="action-preview"
          title="🔍 Preview Cleanup"
          subtitle="View what will be deleted (no actual deletion)"
          icon={Icon.Eye}
          actions={
            <ActionPanel>
              <Action
                title="Preview Cleanup"
                onAction={handlePreview}
                icon={Icon.Eye}
              />
              <Action
                title="Cancel"
                onAction={onCancel}
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["opt"], key: "escape" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="action-delete"
          title="🗑️  Execute Cleanup"
          subtitle="⚠️  Will actually delete files, use with caution"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title="Execute Cleanup"
                onAction={handleDelete}
                icon={Icon.Trash}
              />
              <Action
                title="Cancel"
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
