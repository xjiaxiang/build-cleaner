import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { existsSync } from "fs";
import { open } from "@raycast/api";
import { useEffect } from "react";
import { expandPath, isUnderHomeDir } from "../utils/path";
import { usePathSuggestions } from "../hooks/usePathSuggestions";

interface PathInputProps {
  inputPath: string;
  onPathChange: (path: string) => void;
  selectedItemId?: string;
  onSelectionChange: (id: string | null) => void;
  onSuggestionsChange?: (hasSuggestions: boolean) => void;
  onEnterKey?: (selectedPath: string) => void;
}

export function PathInput({
  inputPath,
  onPathChange,
  onSelectionChange,
  onSuggestionsChange,
  onEnterKey,
}: PathInputProps) {
  const suggestions = usePathSuggestions(inputPath);

  // 通知父组件是否有建议
  useEffect(() => {
    if (onSuggestionsChange) {
      onSuggestionsChange(suggestions.length > 0);
    }
  }, [suggestions.length, onSuggestionsChange]);

  const handleSelectPath = (path: string) => {
    onPathChange(path);
    onSelectionChange(null);
  };

  // 获取最佳补全路径（用于唯一匹配时的补全）
  const getBestCompletion = (): string | null => {
    if (suggestions.length === 0) return null;

    // 如果有唯一匹配，直接返回
    if (suggestions.length === 1) {
      return suggestions[0].path;
    }

    // 如果有多个建议，找到第一个非精确匹配的建议（用于补全）
    // 优先选择匹配分数最高的
    const trimmedPath = inputPath.trim();
    const bestMatch = suggestions.find(s => s.path !== trimmedPath);
    return bestMatch?.path || null;
  };

  // 处理补全：只更新路径，不触发选中状态变化
  const handleTabComplete = (suggestionPath?: string) => {
    if (suggestionPath) {
      // 如果指定了路径，直接补全该路径（只更新路径，不改变选中状态）
      onPathChange(suggestionPath);
      // 保持当前选中状态不变，不调用 onSelectionChange
    } else {
      // 否则补全最佳匹配
      const bestPath = getBestCompletion();
      if (bestPath) {
        onPathChange(bestPath);
        // 保持当前选中状态不变，不调用 onSelectionChange
      }
    }
  };

  return (
    <List.Section title="Path Input">
      {/* 路径自动完成建议 */}
      {suggestions.length > 0 && (
        <>
          {suggestions.map((suggestion, index) => {
            const expanded = expandPath(suggestion.path);
            const pathExists = existsSync(expanded);
            const isExactMatch = suggestion.path === inputPath.trim();
            const isUnderHome = isUnderHomeDir(suggestion.path);
            // 所有非精确匹配的建议都可以补全
            const canTabComplete = !isExactMatch;

            return (
              <List.Item
                key={`suggestion-${index}`}
                id={`suggestion-${index}`}
                title={suggestion.title}
                subtitle={suggestion.path}
                icon={suggestion.icon}
                actions={
                  <ActionPanel>
                    {/* 精确匹配且路径有效时，确认清理应该是第一个 Action */}
                    {pathExists && isUnderHome && (
                      <Action
                        title="Confirm Cleanup"
                        onAction={() => onEnterKey?.(suggestion.path)}
                        icon={Icon.CheckCircle}
                      />
                    )}
                    {canTabComplete && (
                      <Action
                        title="Quick Complete"
                        onAction={() => handleTabComplete(suggestion.path)}
                        icon={Icon.ArrowRight}
                        shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                      />
                    )}
                    <Action
                      title="Use This Path"
                      onAction={() => handleSelectPath(suggestion.path)}
                      icon={Icon.CheckCircle}
                    />
                    {pathExists && (
                      <Action
                        title="Open in Finder"
                        onAction={() => open(expanded)}
                        icon={Icon.Finder}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
      {!inputPath && (
        <List.Item
          id="path-hint"
          title="💡 Tip"
          subtitle="Auto-complete suggestions appear while typing (similar to shell tab completion)"
          icon={Icon.Info}
        />
      )}
      {inputPath && suggestions.length === 0 && (
        <List.Item
          id="no-suggestions"
          title="⚠️ No matching suggestions"
          subtitle="No matching paths found, please check your input"
          icon={Icon.ExclamationMark}
        />
      )}
    </List.Section>
  );
}
