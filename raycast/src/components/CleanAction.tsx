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
        title: "Please enter a path",
        message: "Enter the path to clean in the search box",
      });
      return;
    }
    const expandedPath = expandPath(inputPath.trim());
    if (!existsSync(expandedPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Path does not exist",
        message: `Path ${expandedPath} does not exist`,
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
    <List.Section title="Execute Cleanup">
      <List.Item
        id="action-clean"
        title={dryRun ? "Preview Cleanup" : "Execute Cleanup"}
        subtitle={
          dryRun
            ? "View what will be deleted (no actual deletion)"
            : "⚠️ Will actually delete files, use with caution"
        }
        icon={dryRun ? Icon.Eye : Icon.Trash}
        actions={
          <ActionPanel>
            <Action
              title={dryRun ? "Preview Cleanup" : "Execute Cleanup"}
              onAction={handleClean}
              icon={dryRun ? Icon.Eye : Icon.Trash}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
