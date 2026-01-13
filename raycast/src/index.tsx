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
        title: "Please enter a path",
        message: "Enter the path to clean in the search box",
      });
      return;
    }

    const expanded = expandPath(trimmedPath);
    if (!existsSync(expanded)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Path does not exist",
        message: `Path ${expanded} does not exist, please check your input`,
      });
      return;
    }

    // 检查路径是否在 ~ 目录下
    if (!isUnderHomeDir(trimmedPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Path restriction",
        message: `Path must be under ~ directory, current path: ${expanded}`,
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
          ? "Processing..."
          : pathConfirmed
            ? "Confirm cleanup operation..."
            : "Enter path and press Enter to confirm (only ~ directory, e.g., ~/Documents)..."
      }
      searchText={inputPath}
      onSearchTextChange={setInputPath}
      selectedItemId={selectedItemId}
      onSelectionChange={handleSelectionChange}
    >
      {isLoading && (
        <List.Section title="Processing">
          <List.Item
            id="loading-item"
            title={dryRun ? "Previewing cleanup..." : "Executing cleanup..."}
            subtitle="Please wait, processing files"
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
