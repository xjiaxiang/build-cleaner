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
    <List.Section title="当前设置">
      <List.Item
        id="setting-path"
        title="路径"
        subtitle={
          inputPath
            ? `${inputPath}${existsSync(expandPath(inputPath)) ? " ✓" : " ⚠️"}`
            : "未输入路径"
        }
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action title="编辑路径" onAction={onEditPath} icon={Icon.Pencil} />
          </ActionPanel>
        }
      />
      <List.Item
        id="setting-patterns"
        title="清理模式"
        subtitle={
          selectedPatterns.length > 0
            ? selectedPatterns.join(", ")
            : "使用默认配置"
        }
        icon={Icon.List}
      />
      <List.Item
        id="setting-dryrun"
        title="预览模式"
        subtitle={dryRun ? "开启（不会实际删除）" : "关闭（将实际删除）"}
        icon={dryRun ? Icon.Eye : Icon.Trash}
        actions={
          <ActionPanel>
            <Action
              title={dryRun ? "关闭预览模式" : "开启预览模式"}
              onAction={() => onDryRunChange(!dryRun)}
              icon={dryRun ? Icon.EyeDisabled : Icon.Eye}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
