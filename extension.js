const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process')

async function getWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders) return null;
  const rootPath = folders[0].uri.fsPath;
  const gitPath = path.join(rootPath, '.git');
  return fs.existsSync(gitPath) ? rootPath : null;
}
async function pickType(config) {
  let typePick = null;

  while (!typePick || typePick.name === '提交前请确保 暂存的更改 里有文件，即已执行过git add，请在下方选择提交类型') {
    typePick = await vscode.window.showQuickPick(
      config.types.map((t) => ({
        label: `${t.emoji ?? ''} ${t.name}`,
        description: t.description ?? '',
        name: t.name,
        emoji: t.emoji
      })),
      { placeHolder: '请选择提交类型 (type)' }
    );

    if (!typePick) {
      return null;
    }
  }
  return typePick;
}


function activate(context) {

	const disposable = vscode.commands.registerCommand('water-commit.start', async function () {

		try {
			const rootPath = await getWorkspaceRoot();
			if (!rootPath) {
				vscode.window.showInformationMessage('【waterCommit提示】：未检测到Git仓库，请先初始化仓库');
				return;
			}

			const workspaceFolders = vscode.workspace.workspaceFolders;
			const cwd = workspaceFolders[0].uri.fsPath;
			const commitrcPath = path.join(cwd, '.commitrc');

			let config = { types: [], scopes: [] };

			if (fs.existsSync(commitrcPath)) {
				try {
					const content = fs.readFileSync(commitrcPath, 'utf-8');
					config = JSON.parse(content);
				} catch (err) {
					console.log(err);
					vscode.window.showErrorMessage('【waterCommit提示】：.commitrc文件解析失败，请检查文件是否JSON格式');
					return;
				}
			} else {
				config = {
					types: [
						{ name: '提交前请确保 暂存的更改 里有文件，即已执行过git add，请在下方选择提交类型' },
						{ name: 'feat', emoji: '✨', description: '：新功能，新增页面、组件、API接口等' },
						{ name: 'fix', emoji: '🐛', description: '：修复bug，修复逻辑错误、功能错误、代码报错等' },
						{ name: 'ui', emoji: '🎨', description: '：ui更新、修改styles样式' },
						{ name: 'text', emoji: '✏️', description: '：修改项目里的文本文字、文案描述等' },
						{ name: 'refactor', emoji: '💎', description: '：重构某个功能、重写组件结构、逻辑优化' },
						{ name: 'perf', emoji: '⚡️', description: '：性能优化(优化算法、优化渲染、减少请求、缓存处理等)' },
						{ name: 'docs', emoji: '📝', description: '：更新项目文档、手册、README、注释等' },
						{ name: 'chore', emoji: '🔧', description: '：其他杂项任务，更新各种配置文件' },
						{ name: 'deps', emoji: '📦️', description: '：更新项目依赖、第三方库' },
						{ name: 'revert', emoji: '🚑️', description: '：版本回滚、修复误提交' }
					],
					scopes: [
						{ name: 'api', description: '：接口相关，接口的增删改' },
						{ name: 'map', description: '：地图底层相关，与pages不同' },
						{ name: 'components', description: '：组件相关，更新组件功能、逻辑' },
						{ name: 'chart', description: '：图表相关，更新图表的绘制、option等' },
						{ name: 'pages', description: '：页面相关，新增了xx页面，修改了xx页面功能、逻辑、样式' },
						{ name: 'utils', description: '：工具方法相关' },
						{ name: 'layout', description: '：布局相关' },
						{ name: 'styles', description: '：样式相关，仅更新样式时候选择此项' },
						{ name: 'vitepress', description: '：更新项目文档' },
						{ name: 'store', description: '：状态相关，如Pinia、前端存储' },
						{ name: 'eslint', description: '：eslint相关，修改、更新某些规则' },
						{ name: 'config', description: '：配置文件相关，dockerfile、vite.config等' },
						{ name: 'other', description: '：其他' },
						{ name: '', description: '无(谨慎选择)' },
					]
				};
			}

			// Step1: 选择type
			const typePick = await pickType(config);
			if (!typePick) {
				return;
			}

			// Step2: 选择scope
			const scopePick = await vscode.window.showQuickPick(
				config.scopes.map(s => ({
					label: s.name,
					description: s.description ?? '',
					name: s.name
				})),
				{ placeHolder: '请选择提交范围 (scope)' }
			);

			if (!scopePick) {
				return;
			}

			// Step3: 输入提交描述
			const message = await vscode.window.showInputBox({
				placeHolder: '请输入提交描述，例如：新增xx功能，修复xx问题，修改xx描述',
				prompt: '输入提交信息',
				validateInput: text => (text.trim() ? null : '提交信息不能为空')
			});

			if (!message) {
				vscode.window.showInformationMessage('【waterCommit提示】：已取消提交');
				return;
			}

			// 拼接完整提交信息，如果scope选择无，去掉括号
			const scopeText = scopePick.name === '' ? '' : `(${scopePick.name})`
			const finalMessage = `${typePick.emoji ? typePick.emoji + ' ' : ''}${typePick.name}${scopeText}: ${message}`;

			// Step4: 执行 git commit
			exec(`git commit -m "${finalMessage}"`, { cwd }, (error, stdout, stderr) => {
			  if (error) {
			    vscode.window.showErrorMessage(`【waterCommit提示】：提交失败：${stderr || error.message}`);
			  } else {
			    vscode.window.showInformationMessage(`【waterCommit提示】：✅ 提交成功：${finalMessage}`);
			  }
			});
		} catch (err) {
			vscode.window.showErrorMessage(`【waterCommit提示】：出错啦：${err.message}`);
		}
	});
	if (context) {
		context.subscriptions.push(disposable);
	}
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
