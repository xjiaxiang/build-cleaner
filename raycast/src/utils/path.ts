import { homedir } from "os";
import { join, dirname, basename } from "path";
import { existsSync, readdirSync, statSync, realpathSync } from "fs";
import { Icon } from "@raycast/api";
import { PathSuggestion } from "../types";

/**
 * 展开路径，支持 ~
 */
export function expandPath(pathStr: string): string {
  if (pathStr.startsWith("~")) {
    if (pathStr === "~") {
      return homedir();
    } else if (pathStr.startsWith("~/")) {
      return join(homedir(), pathStr.slice(2));
    }
  }
  return pathStr;
}

/**
 * 检查路径是否在 ~ 目录下
 */
export function isUnderHomeDir(pathStr: string): boolean {
  const expanded = expandPath(pathStr);
  const home = homedir();
  // 确保路径在 home 目录下（使用 realpath 处理符号链接）
  try {
    const realExpanded = realpathSync(expanded);
    const realHome = realpathSync(home);
    return realExpanded.startsWith(realHome + "/") || realExpanded === realHome;
  } catch {
    // 如果 realpathSync 失败，使用简单的字符串比较
    return expanded.startsWith(home + "/") || expanded === home;
  }
}

/**
 * 计算匹配分数（用于排序）
 */
function calculateMatchScore(
  name: string,
  searchTerm: string,
  isHidden: boolean,
  shouldShowHidden: boolean,
): number {
  const lowerName = name.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  let score = 0;
  // 完全匹配得分最高
  if (lowerName === lowerSearch) score = 100;
  // 以搜索词开头得分较高
  else if (lowerName.startsWith(lowerSearch)) score = 80;
  // 包含搜索词得分中等
  else if (lowerName.includes(lowerSearch)) score = 50;

  // 非隐藏文件夹额外加分（除非用户明确搜索隐藏文件）
  if (!isHidden && !shouldShowHidden) {
    score += 20;
  }

  return score;
}

/**
 * 检查是否应该显示隐藏文件（用户明确输入了 . 开头）
 */
export function shouldShowHidden(inputPath: string): boolean {
  const lastPart = basename(inputPath.trim());
  return lastPart.startsWith(".");
}

/**
 * 过滤函数：决定是否包含某个目录
 */
function shouldIncludeEntry(
  entryName: string,
  shouldShowHidden: boolean,
): boolean {
  // 如果用户明确输入了 . 开头，显示所有匹配的
  if (shouldShowHidden) return true;
  // 否则，过滤掉隐藏文件夹
  return !entryName.startsWith(".");
}

/**
 * 获取路径建议（自动完成，类似 shell tab 补全）
 */
export function getPathSuggestions(inputPath: string): PathSuggestion[] {
  if (!inputPath || inputPath.trim() === "") {
    // 如果没有输入，返回常用路径建议（都在 ~ 目录下）
    return [
      { title: "Home", path: "~", icon: Icon.House, matchScore: 0 },
      {
        title: "Desktop",
        path: "~/Desktop",
        icon: Icon.Document,
        matchScore: 0,
      },
      {
        title: "Downloads",
        path: "~/Downloads",
        icon: Icon.Download,
        matchScore: 0,
      },
      {
        title: "Documents",
        path: "~/Documents",
        icon: Icon.Folder,
        matchScore: 0,
      },
    ]
      .filter(item => {
        const expanded = expandPath(item.path);
        return existsSync(expanded) && isUnderHomeDir(item.path);
      })
      .map(item => ({ ...item, matchScore: 0 }));
  }

  const trimmedPath = inputPath.trim();
  const expandedPath = expandPath(trimmedPath);
  const suggestions: PathSuggestion[] = [];
  const shouldShowHiddenFlag = shouldShowHidden(trimmedPath);

  // 如果输入的路径不在 ~ 目录下，不返回任何建议
  if (!isUnderHomeDir(trimmedPath)) {
    return [];
  }

  try {
    // 情况1: 路径存在且是目录
    if (existsSync(expandedPath)) {
      const stat = statSync(expandedPath);
      if (stat.isDirectory()) {
        // 只有当路径以 / 结尾时，才列出所有子目录（类似 shell 的 tab 补全）
        const shouldListChildren =
          trimmedPath.endsWith("/") || trimmedPath.endsWith("\\");

        if (shouldListChildren) {
          try {
            const entries = readdirSync(expandedPath, {
              withFileTypes: true,
            });
            // 先分离隐藏和非隐藏文件夹
            const visibleDirs: typeof entries = [];
            const hiddenDirs: typeof entries = [];

            for (const entry of entries) {
              if (entry.isDirectory()) {
                if (entry.name.startsWith(".")) {
                  hiddenDirs.push(entry);
                } else {
                  visibleDirs.push(entry);
                }
              }
            }

            // 优先显示非隐藏文件夹，然后显示隐藏文件夹（如果用户明确搜索）
            const dirsToShow = shouldShowHiddenFlag
              ? [...visibleDirs, ...hiddenDirs]
              : visibleDirs;

            for (const entry of dirsToShow.slice(0, 30)) {
              let relativePath: string;
              if (trimmedPath === "~") {
                // 如果输入的是 ~，补全为 ~/目录名
                relativePath = `~/${entry.name}`;
              } else if (
                trimmedPath.endsWith("/") ||
                trimmedPath.endsWith("\\")
              ) {
                relativePath = `${trimmedPath}${entry.name}`;
              } else {
                relativePath = `${trimmedPath}/${entry.name}`;
              }
              const isHidden = entry.name.startsWith(".");
              suggestions.push({
                title: entry.name,
                path: relativePath,
                icon: Icon.Folder,
                matchScore: isHidden ? 90 : 100, // 非隐藏文件夹得分更高
              });
            }
          } catch {
            // 忽略读取错误
          }
        } else {
          // 路径存在但不是以 / 结尾，显示当前路径作为建议（如果它在 ~ 目录下）
          if (isUnderHomeDir(trimmedPath)) {
            suggestions.push({
              title: basename(expandedPath) || trimmedPath,
              path: trimmedPath,
              icon: stat.isDirectory() ? Icon.Folder : Icon.Document,
              matchScore: 100,
            });
          }
        }
      } else {
        // 是文件，显示当前路径（如果它在 ~ 目录下）
        if (isUnderHomeDir(trimmedPath)) {
          suggestions.push({
            title: basename(expandedPath) || trimmedPath,
            path: trimmedPath,
            icon: Icon.Document,
            matchScore: 100,
          });
        }
      }
    } else {
      // 情况2: 路径不存在，尝试在父目录中查找匹配的目录（模糊匹配）
      const parentDir = dirname(expandedPath);
      const searchName = basename(expandedPath);

      if (existsSync(parentDir) && searchName) {
        try {
          const entries = readdirSync(parentDir, { withFileTypes: true });
          // 先分离隐藏和非隐藏文件夹
          const visibleDirs: typeof entries = [];
          const hiddenDirs: typeof entries = [];

          for (const entry of entries) {
            if (
              entry.isDirectory() &&
              shouldIncludeEntry(entry.name, shouldShowHiddenFlag)
            ) {
              if (entry.name.startsWith(".")) {
                hiddenDirs.push(entry);
              } else {
                visibleDirs.push(entry);
              }
            }
          }

          // 优先处理非隐藏文件夹
          const dirsToProcess = shouldShowHiddenFlag
            ? [...visibleDirs, ...hiddenDirs]
            : visibleDirs;

          for (const entry of dirsToProcess.slice(0, 30)) {
            const isHidden = entry.name.startsWith(".");
            const matchScore = calculateMatchScore(
              entry.name,
              searchName,
              isHidden,
              shouldShowHiddenFlag,
            );
            // 只显示匹配的目录
            if (matchScore > 0) {
              const parentPath = dirname(trimmedPath);
              let relativePath: string;
              if (parentPath === "." || parentPath === "/") {
                relativePath = entry.name;
              } else if (parentPath === "~") {
                // 保留 ~ 前缀
                relativePath = `~/${entry.name}`;
              } else if (
                parentPath.endsWith("/") ||
                parentPath.endsWith("\\")
              ) {
                relativePath = `${parentPath}${entry.name}`;
              } else {
                relativePath = `${parentPath}/${entry.name}`;
              }
              // 只添加在 ~ 目录下的路径建议
              if (isUnderHomeDir(relativePath)) {
                suggestions.push({
                  title: entry.name,
                  path: relativePath,
                  icon: Icon.Folder,
                  matchScore,
                });
              }
            }
          }
        } catch {
          // 忽略读取错误
        }
      }

      // 情况3: 如果输入的是部分路径（如 ~/Doc），尝试查找匹配的完整路径
      if (trimmedPath.includes("/") || trimmedPath.includes("\\")) {
        const pathParts = trimmedPath.split(/[/\\]/);
        const lastPart = pathParts[pathParts.length - 1];
        const parentParts = pathParts.slice(0, -1);
        const parentPathStr = parentParts.join("/");
        const parentExpanded = expandPath(
          parentPathStr || (trimmedPath.startsWith("~") ? "~" : "/"),
        );

        if (existsSync(parentExpanded) && lastPart) {
          try {
            const entries = readdirSync(parentExpanded, {
              withFileTypes: true,
            });
            // 先分离隐藏和非隐藏文件夹
            const visibleDirs: typeof entries = [];
            const hiddenDirs: typeof entries = [];

            for (const entry of entries) {
              if (
                entry.isDirectory() &&
                shouldIncludeEntry(entry.name, shouldShowHiddenFlag)
              ) {
                if (entry.name.startsWith(".")) {
                  hiddenDirs.push(entry);
                } else {
                  visibleDirs.push(entry);
                }
              }
            }

            // 优先处理非隐藏文件夹
            const dirsToProcess = shouldShowHiddenFlag
              ? [...visibleDirs, ...hiddenDirs]
              : visibleDirs;

            for (const entry of dirsToProcess.slice(0, 30)) {
              const isHidden = entry.name.startsWith(".");
              const matchScore = calculateMatchScore(
                entry.name,
                lastPart,
                isHidden,
                shouldShowHiddenFlag,
              );
              if (matchScore > 0) {
                let fullPath: string;
                if (parentPathStr === "") {
                  fullPath = entry.name;
                } else if (parentPathStr === "~") {
                  // 保留 ~ 前缀
                  fullPath = `~/${entry.name}`;
                } else if (
                  parentPathStr.endsWith("/") ||
                  parentPathStr.endsWith("\\")
                ) {
                  fullPath = `${parentPathStr}${entry.name}`;
                } else {
                  fullPath = `${parentPathStr}/${entry.name}`;
                }
                // 只添加在 ~ 目录下的路径建议
                if (isUnderHomeDir(fullPath)) {
                  suggestions.push({
                    title: entry.name,
                    path: fullPath,
                    icon: Icon.Folder,
                    matchScore,
                  });
                }
              }
            }
          } catch {
            // 忽略读取错误
          }
        }
      }
    }
  } catch {
    // 忽略错误
  }

  // 按匹配分数排序，分数高的在前
  suggestions.sort((a, b) => b.matchScore - a.matchScore);

  // 去重（基于路径），并确保所有建议都在 ~ 目录下
  const seen = new Set<string>();
  const uniqueSuggestions = suggestions.filter(s => {
    if (seen.has(s.path)) {
      return false;
    }
    // 再次检查路径是否在 ~ 目录下（双重保险）
    if (!isUnderHomeDir(s.path)) {
      return false;
    }
    seen.add(s.path);
    return true;
  });

  return uniqueSuggestions.slice(0, 20); // 最多返回20个建议
}
