import {useState} from "react";
import {showToast, Toast} from "@raycast/api";
import {clean, CleanOptions, CleanResult} from "@build-cleaner/node";

export function useClean() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<CleanResult | null>(null);

	const executeClean = async (options: CleanOptions) => {
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
			
			// 先隐藏加载提示
			await loadingToast.hide();
			
			// 设置结果，这会触发视图切换到结果页面
			setResult(cleanResult);

			// 延迟显示成功提示，确保视图已经切换
			setTimeout(async () => {
				await showToast({
					style: Toast.Style.Success,
					title: "清理完成",
					message: `删除了 ${cleanResult.dirsDeleted} 个目录，${cleanResult.filesDeleted} 个文件`,
				});
			}, 100);
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
