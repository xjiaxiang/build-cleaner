import {
	List,
	ActionPanel,
	Action,
	Icon,
	showToast,
	Toast,
	getPreferenceValues,
	open,
} from "@raycast/api";
import {useState} from "react";
import {homedir} from "os";
import {existsSync} from "fs";
import {join} from "path";
import {clean, CleanOptions, CleanResult} from "@build-cleaner/node";

interface Preferences {
	defaultPath?: string;
	defaultPatterns?: string;
}

export default function Command() {
	const preferences = getPreferenceValues<Preferences>() || {};
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<CleanResult | null>(null);
	const [selectedPaths, setSelectedPaths] = useState<string[]>(
		preferences.defaultPath ? [preferences.defaultPath] : []
	);
	const [selectedPatterns, setSelectedPatterns] = useState<string[]>(
		preferences.defaultPatterns && preferences.defaultPatterns.trim()
			? preferences.defaultPatterns
					.split(",")
					.map((p) => p.trim())
					.filter((p) => p)
			: []
	);
	const [dryRun, setDryRun] = useState(true);
	const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
		undefined
	);
	const [customPaths, setCustomPaths] = useState<string[]>([]);
	const [customPatterns, setCustomPatterns] = useState<string[]>([]);
	const [searchText, setSearchText] = useState("");
	const [inputMode, setInputMode] = useState<"path" | "pattern" | null>(null);

	const handleSelectionChange = (id: string | null) => {
		setSelectedItemId(id ?? undefined);
	};

	// 展开路径，支持 ~
	const expandPath = (pathStr: string): string => {
		if (pathStr.startsWith("~")) {
			if (pathStr === "~") {
				return homedir();
			} else if (pathStr.startsWith("~/")) {
				return join(homedir(), pathStr.slice(2));
			}
		}
		return pathStr;
	};

	// 常用路径
	const commonPaths = [
		{title: "Home 目录", path: homedir(), icon: Icon.House},
		{title: "桌面", path: join(homedir(), "Desktop"), icon: Icon.Document},
		{title: "下载", path: join(homedir(), "Downloads"), icon: Icon.Download},
		{title: "文档", path: join(homedir(), "Documents"), icon: Icon.Folder},
	]
		.filter((item) => item && item.path && existsSync(item.path))
		.filter(Boolean);

	// 常用清理模式
	const commonPatterns = [
		{name: "node_modules/", description: "Node.js 依赖目录"},
		{name: "dist/", description: "构建输出目录"},
		{name: "build/", description: "构建目录"},
		{name: "target/", description: "Rust 构建目录"},
		{name: ".next/", description: "Next.js 构建目录"},
		{name: "__pycache__/", description: "Python 缓存目录"},
		{name: "*.log", description: "日志文件"},
		{name: "*.tmp", description: "临时文件"},
	];

	const handleClean = async (options: CleanOptions) => {
		setIsLoading(true);
		// 显示加载提示
		const loadingToast = await showToast({
			style: Toast.Style.Animated,
			title: options.dryRun ? "正在预览..." : "正在清理...",
			message: "请稍候，正在处理文件",
		});

		try {
			// 直接调用 npm 包的 clean 函数
			const cleanResult = await clean(options);
			setResult(cleanResult);

			// 隐藏加载提示
			await loadingToast.hide();

			await showToast({
				style: Toast.Style.Success,
				title: "清理完成",
				message: `删除了 ${cleanResult.dirsDeleted} 个目录，${cleanResult.filesDeleted} 个文件`,
			});
		} catch (error) {
			// 隐藏加载提示
			await loadingToast.hide();

			await showToast({
				style: Toast.Style.Failure,
				title: "清理失败",
				message: error instanceof Error ? error.message : "未知错误",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const formatSize = (bytes: number): string => {
		const units = ["B", "KB", "MB", "GB", "TB"];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(2)} ${units[unitIndex]}`;
	};

	if (result) {
		const maxDisplayItems = 50;
		const deletedDirs = result.deletedDirs || [];
		const deletedFiles = result.deletedFiles || [];
		const failedDirs = result.failedDirs || [];
		const failedFiles = result.failedFiles || [];

		return (
			<List
				isLoading={isLoading}
				selectedItemId={selectedItemId}
				onSelectionChange={handleSelectionChange}
			>
				<List.Section title="清理结果">
					<List.Item
						id="result-summary"
						title="✅ 清理完成"
						subtitle={`释放了 ${formatSize(result.spaceFreed)} 空间`}
						icon={Icon.CheckCircle}
					/>
					<List.Item
						id="result-dirs"
						title={`目录: ${result.dirsDeleted} 个已删除`}
						subtitle={`扫描了 ${result.dirsScanned} 个目录`}
						icon={Icon.Folder}
					/>
					<List.Item
						id="result-files"
						title={`文件: ${result.filesDeleted} 个已删除`}
						subtitle={`扫描了 ${result.filesScanned} 个文件`}
						icon={Icon.Document}
					/>
					{result.filesFailed > 0 || result.dirsFailed > 0 ? (
						<List.Item
							id="result-failed"
							title={`⚠️ 失败: ${result.filesFailed} 个文件, ${result.dirsFailed} 个目录`}
							subtitle="部分文件删除失败"
							icon={Icon.ExclamationMark}
						/>
					) : null}
					<List.Item
						id="result-time"
						title={`耗时: ${result.timeTaken.toFixed(2)} 秒`}
						subtitle="操作完成时间"
						icon={Icon.Clock}
					/>
				</List.Section>

				{deletedDirs.length > 0 && (
					<List.Section
						title={`已删除的目录 (${deletedDirs.length})`}
						subtitle={
							deletedDirs.length > maxDisplayItems
								? `显示前 ${maxDisplayItems} 个，共 ${deletedDirs.length} 个`
								: undefined
						}
					>
						{deletedDirs
							.slice(0, maxDisplayItems)
							.map((dir: string, index: number) => (
								<List.Item
									key={`deleted-dir-${index}`}
									id={`deleted-dir-${index}`}
									title={dir}
									subtitle="已删除"
									icon={Icon.Folder}
									actions={
										<ActionPanel>
											<Action
												title="在 Finder 中打开"
												onAction={() => {
													const parentDir = join(dir, "..");
													open(parentDir);
												}}
												icon={Icon.Finder}
											/>
										</ActionPanel>
									}
								/>
							))}
						{deletedDirs.length > maxDisplayItems && (
							<List.Item
								id="deleted-dirs-more"
								title={`... 还有 ${deletedDirs.length - maxDisplayItems} 个目录`}
								subtitle="详细信息请查看完整输出"
								icon={Icon.Ellipsis}
							/>
						)}
					</List.Section>
				)}

				{deletedFiles.length > 0 && (
					<List.Section
						title={`已删除的文件 (${deletedFiles.length})`}
						subtitle={
							deletedFiles.length > maxDisplayItems
								? `显示前 ${maxDisplayItems} 个，共 ${deletedFiles.length} 个`
								: undefined
						}
					>
						{deletedFiles
							.slice(0, maxDisplayItems)
							.map((file: string, index: number) => (
								<List.Item
									key={`deleted-file-${index}`}
									id={`deleted-file-${index}`}
									title={file}
									subtitle="已删除"
									icon={Icon.Document}
									actions={
										<ActionPanel>
											<Action
												title="在 Finder 中打开"
												onAction={() => {
													const parentDir = join(file, "..");
													open(parentDir);
												}}
												icon={Icon.Finder}
											/>
										</ActionPanel>
									}
								/>
							))}
						{deletedFiles.length > maxDisplayItems && (
							<List.Item
								id="deleted-files-more"
								title={`... 还有 ${deletedFiles.length - maxDisplayItems} 个文件`}
								subtitle="详细信息请查看完整输出"
								icon={Icon.Ellipsis}
							/>
						)}
					</List.Section>
				)}

				{(failedDirs.length > 0 || failedFiles.length > 0) && (
					<List.Section title="删除失败">
						{failedDirs.map(
							(item: {path: string; error: string}, index: number) => (
								<List.Item
									key={`failed-dir-${index}`}
									id={`failed-dir-${index}`}
									title={item.path}
									subtitle={`错误: ${item.error}`}
									icon={Icon.ExclamationMark}
									actions={
										<ActionPanel>
											<Action
												title="在 Finder 中打开"
												onAction={() => {
													const parentDir = join(item.path, "..");
													open(parentDir);
												}}
												icon={Icon.Finder}
											/>
										</ActionPanel>
									}
								/>
							)
						)}
						{failedFiles.map(
							(item: {path: string; error: string}, index: number) => (
								<List.Item
									key={`failed-file-${index}`}
									id={`failed-file-${index}`}
									title={item.path}
									subtitle={`错误: ${item.error}`}
									icon={Icon.ExclamationMark}
									actions={
										<ActionPanel>
											<Action
												title="在 Finder 中打开"
												onAction={() => {
													const parentDir = join(item.path, "..");
													open(parentDir);
												}}
												icon={Icon.Finder}
											/>
										</ActionPanel>
									}
								/>
							)
						)}
					</List.Section>
				)}

				<List.Section title="操作">
					<List.Item
						id="result-back"
						title="重新清理"
						subtitle="返回主界面"
						icon={Icon.ArrowClockwise}
						actions={
							<ActionPanel>
								<Action
									title="返回"
									onAction={() => {
										setResult(null);
										setSelectedItemId(undefined);
									}}
									icon={Icon.ArrowLeft}
								/>
							</ActionPanel>
						}
					/>
				</List.Section>
			</List>
		);
	}

	const handleSearchTextChange = (text: string) => {
		setSearchText(text);
		// 如果处于输入模式且用户按了 Enter（通过空字符串判断，实际应该通过其他方式）
		// 这里我们通过 Action 来处理输入
	};

	const handleAddCustomPath = () => {
		if (inputMode === "path" && searchText.trim()) {
			const inputPath = searchText.trim();
			// 展开 ~ 路径用于验证
			const expandedPath = expandPath(inputPath);

			// 检查是否已存在（比较展开后的路径）
			const allPaths = [
				...commonPaths.map((p) => p.path),
				...customPaths.map((p) => expandPath(p)),
			];

			if (allPaths.includes(expandedPath)) {
				showToast({
					style: Toast.Style.Failure,
					title: "路径已存在",
				});
				return;
			}

			// 存储原始路径（保留 ~）
			setCustomPaths([...customPaths, inputPath]);
			setSearchText("");
			setInputMode(null);
			showToast({
				style: Toast.Style.Success,
				title: "已添加自定义路径",
				message: inputPath,
			});
		} else {
			setInputMode("path");
			setSearchText("");
			showToast({
				style: Toast.Style.Animated,
				title: "请输入路径",
				message: "在搜索框中输入路径（支持 ~），然后点击确认",
			});
		}
	};

	const handleAddCustomPattern = () => {
		if (inputMode === "pattern" && searchText.trim()) {
			const pattern = searchText.trim();
			if (
				!customPatterns.includes(pattern) &&
				!commonPatterns.some((p) => p.name === pattern)
			) {
				setCustomPatterns([...customPatterns, pattern]);
				setSearchText("");
				setInputMode(null);
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
			setInputMode("pattern");
			setSearchText("");
			showToast({
				style: Toast.Style.Animated,
				title: "请输入模式",
				message: "在搜索框中输入模式，然后点击确认",
			});
		}
	};

	return (
		<List
			isLoading={isLoading}
			searchBarPlaceholder={
				isLoading
					? "正在处理..."
					: inputMode === "path"
						? "输入自定义路径..."
						: inputMode === "pattern"
							? "输入自定义模式..."
							: "选择路径或清理模式..."
			}
			searchText={inputMode ? searchText : undefined}
			onSearchTextChange={handleSearchTextChange}
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
			<List.Section title="选择路径">
				{commonPaths.map((item) => {
					const isSelected = selectedPaths.includes(item.path);
					return (
						<List.Item
							id={`path-${item.path}`}
							key={item.path}
							title={item.title}
							subtitle={item.path}
							icon={isSelected ? Icon.CheckCircle : item.icon}
							actions={
								<ActionPanel>
									<Action
										title={isSelected ? "取消选择" : "选择"}
										onAction={() => {
											if (isSelected) {
												setSelectedPaths(
													selectedPaths.filter((p) => p !== item.path)
												);
											} else {
												setSelectedPaths([...selectedPaths, item.path]);
											}
										}}
										icon={isSelected ? Icon.Circle : Icon.CheckCircle}
									/>
									<Action
										title="在 Finder 中打开"
										onAction={() => open(item.path)}
										icon={Icon.Finder}
									/>
								</ActionPanel>
							}
						/>
					);
				})}
				{/* 自定义路径 */}
				{customPaths.map((customPath, index) => {
					const expandedPath = expandPath(customPath);
					const isSelected = selectedPaths.some(
						(p) => expandPath(p) === expandedPath
					);
					const pathExists = existsSync(expandedPath);
					const displayPath = customPath.startsWith("~")
						? `${customPath} (${expandedPath})`
						: customPath;
					return (
						<List.Item
							id={`custom-path-${index}`}
							key={`custom-${customPath}-${index}`}
							title={displayPath}
							subtitle={pathExists ? "自定义路径" : "⚠️ 路径不存在"}
							icon={isSelected ? Icon.CheckCircle : Icon.Folder}
							actions={
								<ActionPanel>
									<Action
										title={isSelected ? "取消选择" : "选择"}
										onAction={() => {
											if (isSelected) {
												setSelectedPaths(
													selectedPaths.filter(
														(p) => expandPath(p) !== expandedPath
													)
												);
											} else {
												setSelectedPaths([...selectedPaths, customPath]);
											}
										}}
										icon={isSelected ? Icon.Circle : Icon.CheckCircle}
									/>
									{pathExists && (
										<Action
											title="在 Finder 中打开"
											onAction={() => open(expandedPath)}
											icon={Icon.Finder}
										/>
									)}
									<Action
										title="删除自定义路径"
										onAction={() => {
											setCustomPaths(customPaths.filter((_, i) => i !== index));
											setSelectedPaths(
												selectedPaths.filter(
													(p) => expandPath(p) !== expandedPath
												)
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
				{/* 添加自定义路径 */}
				{inputMode === "path" ? (
					<List.Item
						id="confirm-add-path"
						title={`✓ 确认添加路径: ${searchText || "(空)"}`}
						subtitle="点击确认添加此路径"
						icon={Icon.CheckCircle}
						actions={
							<ActionPanel>
								<Action
									title="确认添加"
									onAction={handleAddCustomPath}
									icon={Icon.CheckCircle}
								/>
								<Action
									title="取消"
									onAction={() => {
										setInputMode(null);
										setSearchText("");
									}}
									icon={Icon.XMarkCircle}
								/>
							</ActionPanel>
						}
					/>
				) : (
					<List.Item
						id="add-custom-path"
						title="➕ 添加自定义路径"
						subtitle="输入自定义路径"
						icon={Icon.Plus}
						actions={
							<ActionPanel>
								<Action
									title="添加自定义路径"
									onAction={handleAddCustomPath}
									icon={Icon.Plus}
								/>
							</ActionPanel>
						}
					/>
				)}
			</List.Section>

			<List.Section title="清理模式">
				{commonPatterns.map((pattern) => {
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
												setSelectedPatterns(
													selectedPatterns.filter((p) => p !== pattern.name)
												);
											} else {
												setSelectedPatterns([
													...selectedPatterns,
													pattern.name,
												]);
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
												setSelectedPatterns(
													selectedPatterns.filter((p) => p !== customPattern)
												);
											} else {
												setSelectedPatterns([
													...selectedPatterns,
													customPattern,
												]);
											}
										}}
										icon={isSelected ? Icon.Circle : Icon.CheckCircle}
									/>
									<Action
										title="删除自定义模式"
										onAction={() => {
											setCustomPatterns(
												customPatterns.filter((_, i) => i !== index)
											);
											setSelectedPatterns(
												selectedPatterns.filter((p) => p !== customPattern)
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
				{inputMode === "pattern" ? (
					<List.Item
						id="confirm-add-pattern"
						title={`✓ 确认添加模式: ${searchText || "(空)"}`}
						subtitle="点击确认添加此模式"
						icon={Icon.CheckCircle}
						actions={
							<ActionPanel>
								<Action
									title="确认添加"
									onAction={handleAddCustomPattern}
									icon={Icon.CheckCircle}
								/>
								<Action
									title="取消"
									onAction={() => {
										setInputMode(null);
										setSearchText("");
									}}
									icon={Icon.XMarkCircle}
								/>
							</ActionPanel>
						}
					/>
				) : (
					<List.Item
						id="add-custom-pattern"
						title="➕ 添加自定义清理模式"
						subtitle="输入自定义模式（如 *.bak 或 cache/）"
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
				)}
			</List.Section>

			<List.Section title="当前设置">
				<List.Item
					id="setting-path"
					title="路径"
					subtitle={
						selectedPaths.length > 0 ? selectedPaths.join(", ") : "未选择路径"
					}
					icon={Icon.Folder}
				/>
				<List.Item
					id="setting-patterns"
					title="清理模式"
					subtitle={
						selectedPatterns.length > 0
							? selectedPatterns.join(", ")
							: "使用默认配置"
					}
					icon={Icon.List}
				/>
				<List.Item
					id="setting-dryrun"
					title="预览模式"
					subtitle={dryRun ? "开启（不会实际删除）" : "关闭（将实际删除）"}
					icon={dryRun ? Icon.Eye : Icon.Trash}
					actions={
						<ActionPanel>
							<Action
								title={dryRun ? "关闭预览模式" : "开启预览模式"}
								onAction={() => setDryRun(!dryRun)}
								icon={dryRun ? Icon.EyeDisabled : Icon.Eye}
							/>
						</ActionPanel>
					}
				/>
			</List.Section>

			<List.Section title="执行清理">
				<List.Item
					id="action-clean"
					title={dryRun ? "预览清理" : "执行清理"}
					subtitle={
						dryRun
							? "查看将要删除的内容（不会实际删除）"
							: "⚠️ 将实际删除文件，请谨慎操作"
					}
					icon={dryRun ? Icon.Eye : Icon.Trash}
					actions={
						<ActionPanel>
							<Action
								title={dryRun ? "预览清理" : "执行清理"}
								onAction={() => {
									if (selectedPaths.length === 0) {
										showToast({
											style: Toast.Style.Failure,
											title: "请至少选择一个路径",
										});
										return;
									}
									handleClean({
										paths: selectedPaths,
										patterns:
											selectedPatterns.length > 0
												? selectedPatterns
												: undefined,
										dryRun,
										verbose: true,
									});
								}}
								icon={dryRun ? Icon.Eye : Icon.Trash}
							/>
						</ActionPanel>
					}
				/>
			</List.Section>
		</List>
	);
}
