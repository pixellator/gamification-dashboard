import * as vscode from 'vscode';
import { DashboardPanel } from './panels/DashboardPanel';
console.log('Hello from the Typescript file.  Starting my extension.')
export function activate(context: vscode.ExtensionContext) {
    console.log('Gamification Dashboard extension is now active');

    // Set extension as enabled
    vscode.commands.executeCommand('setContext', 'gamificationDashboard.enabled', true);

    // Register command to show dashboard
    const showDashboardCommand = vscode.commands.registerCommand('gamificationDashboard.showDashboard', () => {
        DashboardPanel.createOrShow(context.extensionUri);
    });

    // Register command to create new project
    const newProjectCommand = vscode.commands.registerCommand('gamificationDashboard.newProject', () => {
        DashboardPanel.createOrShow(context.extensionUri);
        // Send message to webview to create new project
        DashboardPanel.currentPanel?.postMessage({ command: 'newProject' });
    });

    // Register command to open existing project
    const openProjectCommand = vscode.commands.registerCommand('gamificationDashboard.openProject', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Gamification Projects': ['gip'],
                'All Files': ['*']
            },
            openLabel: 'Open Project'
        });

        if (fileUri && fileUri[0]) {
            DashboardPanel.createOrShow(context.extensionUri);
            // Send message to webview to open project
            DashboardPanel.currentPanel?.postMessage({
                command: 'openProject',
                projectPath: fileUri[0].fsPath
            });
        }
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        showDashboardCommand,
        newProjectCommand,
        openProjectCommand
    );

    // Register webview serializer for panel restoration
    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer(DashboardPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                console.log('Restoring dashboard panel from state:', state);
                DashboardPanel.revive(webviewPanel, context.extensionUri);
            }
        });
    }
}

export function deactivate() {
    console.log('Gamification Dashboard extension is deactivated');
}