import { useMemo } from "react";
import { getPathSuggestions } from "../utils/path";
import { PathSuggestion } from "../types";

export function usePathSuggestions(inputPath: string): PathSuggestion[] {
  return useMemo(() => {
    return getPathSuggestions(inputPath);
  }, [inputPath]);
}
