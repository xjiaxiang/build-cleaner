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
            title: "Custom pattern added",
            message: pattern,
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Pattern already exists",
          });
        }
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "No text selected",
          message: "Please select the pattern text first, then click add",
        });
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot get selected text",
        message: "Please enter the pattern name manually",
      });
    }
  };

  return (
    <List.Section title="Cleanup Patterns">
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
                  title={isSelected ? "Deselect" : "Select"}
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
      {/* Custom patterns */}
      {customPatterns.map((customPattern, index) => {
        const isSelected = selectedPatterns.includes(customPattern);
        return (
          <List.Item
            id={`custom-pattern-${index}`}
            key={`custom-${customPattern}-${index}`}
            title={customPattern}
            subtitle="Custom cleanup pattern"
            icon={isSelected ? Icon.CheckCircle : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={isSelected ? "Deselect" : "Select"}
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
                  title="Delete Custom Pattern"
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
      {/* Add custom pattern */}
      <List.Item
        id="add-custom-pattern"
        title="➕ Add Custom Cleanup Pattern"
        subtitle="Select pattern text then click add (e.g., *.bak or cache/)"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title="Add Custom Pattern"
              onAction={handleAddCustomPattern}
              icon={Icon.Plus}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
