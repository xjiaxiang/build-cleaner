import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { expandPath } from "../utils/path";
import { existsSync } from "fs";

interface SettingsViewProps {
  inputPath: string;
  selectedPatterns: string[];
  dryRun: boolean;
  onDryRunChange: (dryRun: boolean) => void;
  onEditPath: () => void;
}

export function SettingsView({
  inputPath,
  selectedPatterns,
  dryRun,
  onDryRunChange,
  onEditPath,
}: SettingsViewProps) {
  return (
    <List.Section title="Current Settings">
      <List.Item
        id="setting-path"
        title="Path"
        subtitle={
          inputPath
            ? `${inputPath}${existsSync(expandPath(inputPath)) ? " ✓" : " ⚠️"}`
            : "No path entered"
        }
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action
              title="Edit Path"
              onAction={onEditPath}
              icon={Icon.Pencil}
            />
          </ActionPanel>
        }
      />
      <List.Item
        id="setting-patterns"
        title="Cleanup Patterns"
        subtitle={
          selectedPatterns.length > 0
            ? selectedPatterns.join(", ")
            : "Use default configuration"
        }
        icon={Icon.List}
      />
      <List.Item
        id="setting-dryrun"
        title="Preview Mode"
        subtitle={
          dryRun
            ? "Enabled (will not actually delete)"
            : "Disabled (will actually delete)"
        }
        icon={dryRun ? Icon.Eye : Icon.Trash}
        actions={
          <ActionPanel>
            <Action
              title={dryRun ? "Disable Preview Mode" : "Enable Preview Mode"}
              onAction={() => onDryRunChange(!dryRun)}
              icon={dryRun ? Icon.EyeDisabled : Icon.Eye}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
