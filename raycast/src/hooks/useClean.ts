import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { clean, CleanOptions, CleanResult } from "@build-cleaner/node";

export function useClean() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanResult | null>(null);

  const executeClean = async (options: CleanOptions) => {
    setIsLoading(true);
    // Show loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: options.dryRun ? "Previewing..." : "Cleaning...",
      message: "Please wait, processing files",
    });

    try {
      // Directly call the npm package's clean function
      const cleanResult = await clean(options);

      // Hide loading toast first
      await loadingToast.hide();

      // Set result, this will trigger view switch to result page
      setResult(cleanResult);

      // Delay showing success toast to ensure view has switched
      setTimeout(async () => {
        await showToast({
          style: Toast.Style.Success,
          title: "Cleanup completed",
          message: `Deleted ${cleanResult.dirsDeleted} directories, ${cleanResult.filesDeleted} files`,
        });
      }, 100);
    } catch (error) {
      // Hide loading toast
      await loadingToast.hide();

      await showToast({
        style: Toast.Style.Failure,
        title: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetResult = () => {
    setResult(null);
  };

  return {
    isLoading,
    result,
    executeClean,
    resetResult,
  };
}
