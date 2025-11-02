import * as vscode from 'vscode';
import * as path from 'path';
import { ProjectManager } from '../services/ProjectManager';
import { FileSelector } from '../services/FileSelector';
import { SOLUZIONLauncher } from '../services/SOLUZIONLauncher';
import { GamificationProject, WorkflowPhase } from '../models/ProjectModel';

export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    public static readonly viewType = 'gamificationDashboard';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private projectManager: ProjectManager;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            DashboardPanel.viewType,
            'Gamification Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.projectManager = ProjectManager.getInstance();

        // Set the webview's initial html content
        this._updateWebview();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                await this._handleWebviewMessage(message);
            },
            null,
            this._disposables
        );
    }

    public postMessage(message: any): void {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        DashboardPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _handleWebviewMessage(message: any) {
        try {
            switch (message.command) {
                case 'newProject':
                    await this._handleNewProject(message.data);
                    break;
                case 'openProject':
                    await this._handleOpenProject(message.data);
                    break;
                case 'saveProject':
                    await this._handleSaveProject();
                    break;
                case 'saveProjectAs':
                    await this._handleSaveProjectAs();
                    break;
                case 'updateProject':
                    await this._handleUpdateProject(message.data);
                    break;
                case 'selectSourceDocuments':
                    await this._handleSelectSourceDocuments();
                    break;
                case 'selectPromptingDocument':
                    await this._handleSelectPromptingDocument();
                    break;
                case 'selectGameSpecification':
                    await this._handleSelectGameSpecification();
                    break;
                case 'selectEvaluationTools':
                    await this._handleSelectEvaluationTools();
                    break;
                case 'openFile':
                    await this._handleOpenFile(message.data);
                    break;
                case 'launchTextSOLUZION':
                    await this._handleLaunchTextSOLUZION();
                    break;
                case 'launchWebSOLUZION':
                    await this._handleLaunchWebSOLUZION();
                    break;
                case 'configurePaths':
                    await this._handleConfigurePaths();
                    break;
                case 'customAnalysis':
                    await this._handleCustomAnalysis();
                    break;
                case 'exportReport':
                    await this._handleExportReport();
                    break;
                case 'ready':
                    await this._handleWebviewReady();
                    break;
                default:
                    console.log('Unknown command:', message.command);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error handling command: ${error}`);
        }
    }

    private async _handleNewProject(data?: { name?: string, saveLocation?: string }) {
        try {
            // Prompt for project name using VSCode native dialog
            const name = data?.name || await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'My Gamification Project',
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Project name cannot be empty';
                    }
                    return null;
                }
            });

            if (!name) {
                // User cancelled
                return;
            }

            const projectFile = await this.projectManager.createNewProject(name, data?.saveLocation);
            this.postMessage({
                command: 'projectLoaded',
                project: projectFile.project,
                filePath: projectFile.filePath
            });
            vscode.window.showInformationMessage(`New project created: ${name}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        }
    }

    private async _handleOpenProject(data: { filePath: string }) {
        try {
            const projectFile = await this.projectManager.openProject(data.filePath);
            this.postMessage({
                command: 'projectLoaded',
                project: projectFile.project,
                filePath: projectFile.filePath
            });
            vscode.window.showInformationMessage(`Project opened: ${projectFile.project.name}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open project: ${error}`);
        }
    }

    private async _handleSaveProject() {
        try {
            const currentProject = this.projectManager.getCurrentProject();
            if (currentProject) {
                if (currentProject.filePath) {
                    await this.projectManager.saveProject(currentProject);
                } else {
                    await this._handleSaveProjectAs();
                }
            } else {
                vscode.window.showWarningMessage('No project to save');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save project: ${error}`);
        }
    }

    private async _handleSaveProjectAs() {
        try {
            const currentProject = this.projectManager.getCurrentProject();
            if (currentProject) {
                const filePath = await this.projectManager.saveProjectAs(currentProject);
                if (filePath) {
                    this.postMessage({
                        command: 'projectSaved',
                        filePath: filePath
                    });
                }
            } else {
                vscode.window.showWarningMessage('No project to save');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save project: ${error}`);
        }
    }

    private async _handleUpdateProject(data: Partial<GamificationProject>) {
        this.projectManager.updateProject(data);

        // Send updated project back to webview
        const currentProject = this.projectManager.getCurrentProject();
        if (currentProject) {
            this.postMessage({
                command: 'projectUpdated',
                project: currentProject.project
            });
        }
    }

    private async _handleSelectSourceDocuments() {
        const files = await FileSelector.selectSourceDocuments();
        if (files.length > 0) {
            this.projectManager.updateProject({ sourceDocuments: files });
            this.postMessage({
                command: 'sourceDocumentsSelected',
                files: files
            });
        }
    }

    private async _handleSelectPromptingDocument() {
        const file = await FileSelector.selectPromptingDocument();
        if (file) {
            this.projectManager.updateProject({ promptingDocument: file });
            this.postMessage({
                command: 'promptingDocumentSelected',
                file: file
            });
        }
    }

    private async _handleSelectGameSpecification() {
        const file = await FileSelector.selectGameSpecification();
        if (file) {
            this.projectManager.updateProject({ gameSpecification: file });
            this.postMessage({
                command: 'gameSpecificationSelected',
                file: file
            });
        }
    }

    private async _handleSelectEvaluationTools() {
        const files = await FileSelector.selectEvaluationTools();
        if (files.length > 0) {
            this.projectManager.updateProject({ evaluationTools: files });
            this.postMessage({
                command: 'evaluationToolsSelected',
                files: files
            });
        }
    }

    private async _handleOpenFile(data: { filePath: string }) {
        await FileSelector.openFileInEditor(data.filePath);
    }

    private async _handleLaunchTextSOLUZION() {
        const currentProject = this.projectManager.getCurrentProject();
        if (!currentProject?.project.gameSpecification) {
            vscode.window.showWarningMessage('No game specification selected');
            return;
        }

        const result = await SOLUZIONLauncher.launchTextEngine(currentProject.project.gameSpecification);
        this.postMessage({
            command: 'launchResult',
            engine: 'text',
            result: result
        });

        if (result.success) {
            vscode.window.showInformationMessage(result.message);
        } else {
            vscode.window.showErrorMessage(result.message);
        }
    }

    private async _handleLaunchWebSOLUZION() {
        const currentProject = this.projectManager.getCurrentProject();
        if (!currentProject?.project.gameSpecification) {
            vscode.window.showWarningMessage('No game specification selected');
            return;
        }

        const result = await SOLUZIONLauncher.launchWebEngine(currentProject.project.gameSpecification);
        this.postMessage({
            command: 'launchResult',
            engine: 'web',
            result: result
        });

        if (result.success) {
            vscode.window.showInformationMessage(result.message);
        } else {
            vscode.window.showErrorMessage(result.message);
        }
    }

    private async _handleConfigurePaths() {
        await SOLUZIONLauncher.configurePaths();
    }

    private async _handleCustomAnalysis() {
        const currentProject = this.projectManager.getCurrentProject();
        if (!currentProject) {
            vscode.window.showWarningMessage('No project loaded for analysis');
            return;
        }

        // Example custom analysis functionality
        vscode.window.showInformationMessage(`Running analysis on project: ${currentProject.project.name}`);

        // Here you could add actual analysis logic, such as:
        // - Analyzing source documents
        // - Running automated tests on game specification
        // - Generating insights report

        this.postMessage({
            command: 'statusUpdate',
            message: 'Custom analysis completed!'
        });
    }

    private async _handleExportReport() {
        const currentProject = this.projectManager.getCurrentProject();
        if (!currentProject) {
            vscode.window.showWarningMessage('No project to export');
            return;
        }

        const uri = await vscode.window.showSaveDialog({
            filters: {
                'Text Files': ['txt'],
                'Markdown Files': ['md'],
                'PDF Files': ['pdf']
            },
            defaultUri: vscode.Uri.file(`${currentProject.project.name}_report.txt`)
        });

        if (uri) {
            // Generate a simple report
            const report = this._generateProjectReport(currentProject.project);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(report, 'utf8'));
            vscode.window.showInformationMessage(`Report exported to: ${uri.fsPath}`);
        }
    }

    private _generateProjectReport(project: any): string {
        const report = `
# Project Report: ${project.name}

**Version:** ${project.version}
**Current Phase:** ${project.currentPhase}
**Created:** ${project.metadata.created}
**Last Modified:** ${project.metadata.lastModified}

## Source Documents
${project.sourceDocuments.map((doc: string, i: number) => `${i + 1}. ${doc}`).join('\n')}

## Prompting Document
${project.promptingDocument || 'Not selected'}

## Game Specification
${project.gameSpecification || 'Not selected'}

## Evaluation Tools
${project.evaluationTools.map((tool: string, i: number) => `${i + 1}. ${tool}`).join('\n')}

## Metadata
${Object.entries(project.metadata).map(([key, value]) => `**${key}:** ${value}`).join('\n')}

---
Generated by Gamification Dashboard Extension
        `;
        return report.trim();
    }

    private async _handleWebviewReady() {
        // Send current project to webview if available
        const currentProject = this.projectManager.getCurrentProject();
        if (currentProject) {
            this.postMessage({
                command: 'projectLoaded',
                project: currentProject.project,
                filePath: currentProject.filePath
            });
        }
    }

    private _updateWebview() {
        this._panel.webview.html = this._getHtmlForWebview();
    }

    private _getHtmlForWebview() {
        // Get the local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
        const scriptUri = this._panel.webview.asWebviewUri(scriptPathOnDisk);

        // Get the local path to CSS file
        const stylePathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css');
        const styleUri = this._panel.webview.asWebviewUri(stylePathOnDisk);

        // Use a nonce to only allow specific scripts to be run
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Gamification Dashboard</title>
</head>
<body>
    <div id="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
            <h1 class="main-title">New Inferences from Gamification Project</h1>
            <h2 class="sub-title">Gamification and Inference Workflow Dashboard</h2>
        </header>

        <!-- File Menu -->
        <section class="file-menu">
            <button id="new-project-btn" class="menu-btn">New Project</button>
            <button id="open-project-btn" class="menu-btn">Open Project</button>
            <button id="save-project-btn" class="menu-btn">Save Project</button>
            <button id="save-as-btn" class="menu-btn">Save As...</button>
        </section>

        <!-- Project Info -->
        <section class="project-info">
            <div class="info-row">
                <label for="project-name">Project Name:</label>
                <input type="text" id="project-name" placeholder="Enter project name...">
            </div>
            <div class="info-row">
                <label for="current-phase">Current Phase:</label>
                <select id="current-phase">
                    <option value="source-selection">Source Selection</option>
                    <option value="game-design">Game Design</option>
                    <option value="game-implementation">Game Implementation</option>
                    <option value="play-testing">Play Testing</option>
                    <option value="technical-analysis">Technical Analysis</option>
                    <option value="inference">Inference</option>
                    <option value="documentation">Documentation</option>
                </select>
            </div>
        </section>

        <!-- Workflow Phases -->
        <section class="workflow-phases">
            <!-- Source Documents -->
            <div class="phase-section">
                <h3>Source Documents</h3>
                <div class="file-selection">
                    <div class="file-list" id="source-documents-list"></div>
                    <button id="select-source-btn" class="select-btn">Add Source Documents</button>
                </div>
            </div>

            <!-- Prompting Document -->
            <div class="phase-section">
                <h3>Prompting Document</h3>
                <div class="file-selection">
                    <div class="selected-file" id="prompting-document">
                        <span class="file-name">No document selected</span>
                        <button class="open-file-btn" style="display: none;">Open</button>
                    </div>
                    <button id="select-prompting-btn" class="select-btn">Select Prompting Document</button>
                </div>
            </div>

            <!-- Game Specification -->
            <div class="phase-section">
                <h3>Game Specification</h3>
                <div class="file-selection">
                    <div class="selected-file" id="game-specification">
                        <span class="file-name">No specification selected</span>
                        <button class="open-file-btn" style="display: none;">Open</button>
                    </div>
                    <button id="select-game-spec-btn" class="select-btn">Select Game Specification</button>
                </div>
            </div>

            <!-- Game Testing -->
            <div class="phase-section">
                <h3>Game Testing</h3>
                <div class="testing-controls">
                    <button id="launch-text-btn" class="launch-btn" disabled>Launch Text SOLUZION</button>
                    <button id="launch-web-btn" class="launch-btn" disabled>Launch Web SOLUZION</button>
                </div>
            </div>

            <!-- Evaluation Tools -->
            <div class="phase-section">
                <h3>Evaluation Tools</h3>
                <div class="file-selection">
                    <div class="file-list" id="evaluation-tools-list"></div>
                    <button id="select-eval-tools-btn" class="select-btn">Add Evaluation Tools</button>
                </div>
            </div>
        </section>

        <!-- Extension Points Section -->
        <!-- DEVELOPER NOTE: Add new buttons and functionality below this comment -->
        <!-- This section is designed for future extensions and custom workflow additions -->
        <section class="extension-section">
            <h3>Additional Tools</h3>
            <div class="extension-buttons">
                <button id="configure-paths-btn" class="config-btn">Configure SOLUZION Paths</button>
                <!-- ADD NEW BUTTONS HERE -->
                <button id="custom-analysis-btn" class="config-btn">Run Custom Analysis</button>
                <button id="export-report-btn" class="config-btn">Export Project Report</button>
            </div>
        </section>

        <!-- Status Bar -->
        <footer class="status-bar">
            <span id="status-text">Ready</span>
        </footer>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}