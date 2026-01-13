import { List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { Icon, showToast, Toast } from "@raycast/api";
import { Preferences } from "./types";
import { useClean } from "./hooks/useClean";
import { ResultView } from "./components/ResultView";
import { PathInput } from "./components/PathInput";
import { PatternSelector } from "./components/PatternSelector";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { expandPath, isUnderHomeDir } from "./utils/path";
import { existsSync } from "fs";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>() || {};
  const [inputPath, setInputPath] = useState<string>(
    preferences.defaultPath || "",
  );
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(
    preferences.defaultPatterns && preferences.defaultPatterns.trim()
      ? preferences.defaultPatterns
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p)
      : [],
  );
  const [dryRun] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    undefined,
  );
  const [customPatterns, setCustomPatterns] = useState<string[]>([]);
  const [pathConfirmed, setPathConfirmed] = useState(false);

  const { isLoading, result, executeClean, resetResult } = useClean();

  // 当 pathConfirmed 变为 true 时，确保选中 action-preview
  useEffect(() => {
    if (pathConfirmed && selectedItemId !== "action-preview") {
      setSelectedItemId("action-preview");
    }
  }, [pathConfirmed]);

  const handleSelectionChange = (id: string | null) => {
    setSelectedItemId(id ?? undefined);
  };

  const handleBack = () => {
    resetResult();
    setSelectedItemId(undefined);
    setPathConfirmed(false);
  };

  // 处理回车键：检查路径并显示确认对话框
  const handleEnterKey = () => {
    const trimmedPath = inputPath.trim();
    if (!trimmedPath) {
      showToast({
        style: Toast.Style.Failure,
        title: "请输入路径",
        message: "在搜索框中输入要清理的路径",
      });
      return;
    }

    const expanded = expandPath(trimmedPath);
    if (!existsSync(expanded)) {
      showToast({
        style: Toast.Style.Failure,
        title: "路径不存在",
        message: `路径 ${expanded} 不存在，请检查输入是否正确`,
      });
      return;
    }

    // 检查路径是否在 ~ 目录下
    if (!isUnderHomeDir(trimmedPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "路径限制",
        message: `路径必须在 ~ 目录下，当前路径: ${expanded}`,
      });
      return;
    }

    // 路径存在且在 ~ 目录下，显示确认对话框
    setPathConfirmed(true);
    // 延迟设置选中项，确保 ConfirmDialog 已经渲染
    setTimeout(() => {
      setSelectedItemId("action-preview");
    }, 0);
  };

  const handleConfirmCancel = () => {
    setPathConfirmed(false);
    setSelectedItemId(undefined);
  };

  // 如果显示结果，渲染结果视图
  if (result) {
    return (
      <ResultView
        result={result}
        onBack={handleBack}
        selectedItemId={selectedItemId}
        onSelectionChange={handleSelectionChange}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        isLoading
          ? "正在处理..."
          : pathConfirmed
            ? "确认清理操作..."
            : "输入路径后按 Enter 确认（仅支持 ~ 目录下，如 ~/Documents）..."
      }
      searchText={inputPath}
      onSearchTextChange={setInputPath}
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
    >
      {isLoading && (
        <List.Section title="处理中">
          <List.Item
            id="loading-item"
            title={dryRun ? "正在预览清理..." : "正在执行清理..."}
            subtitle="请稍候，正在处理文件"
            icon={Icon.Clock}
          />
        </List.Section>
      )}

      {pathConfirmed ? (
        <>
          <ConfirmDialog
            inputPath={inputPath}
            selectedPatterns={selectedPatterns}
            onConfirm={(options) => {
              setPathConfirmed(false);
              executeClean(options);
            }}
            onCancel={handleConfirmCancel}
          />
          <PatternSelector
            selectedPatterns={selectedPatterns}
            onPatternsChange={setSelectedPatterns}
            customPatterns={customPatterns}
            onCustomPatternsChange={setCustomPatterns}
          />

          {/* <SettingsView
						inputPath={inputPath}
						selectedPatterns={selectedPatterns}
						dryRun={dryRun}
						onDryRunChange={setDryRun}
						onEditPath={() => {
							setSelectedItemId("setting-path");
						}}
					/> */}

          {/* <CleanAction
						inputPath={inputPath}
						selectedPatterns={selectedPatterns}
						dryRun={dryRun}
						onClean={executeClean}
					/> */}
        </>
      ) : (
        <PathInput
          inputPath={inputPath}
          onPathChange={setInputPath}
          selectedItemId={selectedItemId}
          onSelectionChange={handleSelectionChange}
          onEnterKey={handleEnterKey}
        />
      )}
    </List>
  );
}
