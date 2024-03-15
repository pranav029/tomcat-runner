// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { WebProvider } from './webProvider';
import { TomcatConfig, TomcatRunner, getConfig } from './app';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "firstext" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('firstext.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from FirstExt!');
	});
	const tomcatConfig: TomcatConfig = getConfig()
	const tomcatRunner: TomcatRunner = new TomcatRunner(tomcatConfig)
	let runner = vscode.commands.registerCommand('tomcat.run', () => tomcatRunner.run())
	const provider = new WebProvider(context.extensionUri,
		(tomcatConfig: TomcatConfig): TomcatRunner => {
			tomcatConfig = prepareContext(tomcatConfig)
			console.log(tomcatConfig)
			return new TomcatRunner(tomcatConfig)
		});
	const pdispo = vscode.window.registerWebviewViewProvider('customwebprovider', provider)
	context.subscriptions.push(disposable)
	context.subscriptions.push(pdispo)
	context.subscriptions.push(runner)
}
function prepareContext(tomcatConfig: TomcatConfig): TomcatConfig {
	if (tomcatConfig.contextPath === '/')
		tomcatConfig.contextPath = 'root'
	tomcatConfig.contextPath = tomcatConfig.contextPath.replace('/', '#')
	tomcatConfig.workingDir = 'C:/cgiTraining/JpaWebApp'
	tomcatConfig.projectName = 'JpaWebApp'
	return tomcatConfig
}
// This method is called when your extension is deactivated
export function deactivate() { }
