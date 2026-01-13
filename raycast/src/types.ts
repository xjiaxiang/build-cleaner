import { Icon } from "@raycast/api";

export interface Preferences {
  defaultPath?: string;
  defaultPatterns?: string;
}

export type InputMode = "path" | "pattern" | null;

export interface PathSuggestion {
  title: string;
  path: string;
  icon: Icon; // Icon from @raycast/api
  matchScore: number;
}
