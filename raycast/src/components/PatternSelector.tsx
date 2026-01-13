import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { getSelectedText } from "@raycast/api";
import { COMMON_PATTERNS } from "../constants/patterns";

interface PatternSelectorProps {
  selectedPatterns: string[];
  onPatternsChange: (patterns: string[]) => void;
  customPatterns: string[];
  onCustomPatternsChange: (patterns: string[]) => void;
}

export function PatternSelector({
  selectedPatterns,
  onPatternsChange,
  customPatterns,
  onCustomPatternsChange,
}: PatternSelectorProps) {
  const handleAddCustomPattern = async () => {
    try {
      // 尝试获取用户选中的文本作为模式
      const selectedText = await getSelectedText();
      const pattern = selectedText.trim();

      if (pattern) {
        if (
          !customPatterns.includes(pattern) &&
          !COMMON_PATTERNS.some((p) => p.name === pattern)
        ) {
          onCustomPatternsChange([...customPatterns, pattern]);
          showToast({
            style: Toast.Style.Success,
            title: "已添加自定义模式",
            message: pattern,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "模式已存在",
          });
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "未选中文本",
          message: "请先选中要添加的模式文本，然后点击添加",
        });
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "无法获取选中文本",
        message: "请手动输入模式名称",
      });
    }
  };

  return (
    <List.Section title="清理模式">
      {COMMON_PATTERNS.map((pattern) => {
        const isSelected = selectedPatterns.includes(pattern.name);
        return (
          <List.Item
            id={`pattern-${pattern.name}`}
            key={pattern.name}
            title={pattern.name}
            subtitle={pattern.description}
            icon={isSelected ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "取消选择" : "选择"}
                  onAction={() => {
                    if (isSelected) {
                      onPatternsChange(
                        selectedPatterns.filter((p) => p !== pattern.name),
                      );
                    } else {
                      onPatternsChange([...selectedPatterns, pattern.name]);
                    }
                  }}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {/* 自定义模式 */}
      {customPatterns.map((customPattern, index) => {
        const isSelected = selectedPatterns.includes(customPattern);
        return (
          <List.Item
            id={`custom-pattern-${index}`}
            key={`custom-${customPattern}-${index}`}
            title={customPattern}
            subtitle="自定义清理模式"
            icon={isSelected ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "取消选择" : "选择"}
                  onAction={() => {
                    if (isSelected) {
                      onPatternsChange(
                        selectedPatterns.filter((p) => p !== customPattern),
                      );
                    } else {
                      onPatternsChange([...selectedPatterns, customPattern]);
                    }
                  }}
                  icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                />
                <Action
                  title="删除自定义模式"
                  onAction={() => {
                    onCustomPatternsChange(
                      customPatterns.filter((_, i) => i !== index),
                    );
                    onPatternsChange(
                      selectedPatterns.filter((p) => p !== customPattern),
                    );
                  }}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {/* 添加自定义模式 */}
      <List.Item
        id="add-custom-pattern"
        title="➕ 添加自定义清理模式"
        subtitle="选中模式文本后点击添加（如 *.bak 或 cache/）"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title="添加自定义模式"
              onAction={handleAddCustomPattern}
              icon={Icon.Plus}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
