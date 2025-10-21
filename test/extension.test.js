const assert = require('assert');
const vscode = require('vscode');
const myExtension = require('../extension');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Water Commit Command exists', async () => {
    // 查询命令列表
		await myExtension.activate();
    const allCommands = await vscode.commands.getCommands(true);
    const cmdExists = allCommands.includes('water-commit.start');
    assert.strictEqual(cmdExists, true, '命令 water-commit.start 未注册');
  });
});
