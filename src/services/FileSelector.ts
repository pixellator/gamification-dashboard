import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FileOption {
    label: string;
    value: string;
    description?: string;
}

export class FileSelector {
    static async selectSourceDocuments(): Promise<string[]> {
        const defaultPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('sourceDocumentsDirectory');

        let defaultUri: vscode.Uri | undefined;
        if (defaultPath && fs.existsSync(defaultPath)) {
            defaultUri = vscode.Uri.file(defaultPath);
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri,
            filters: {
                'Documents': ['pdf', 'txt', 'md', 'docx'],
                'All Files': ['*']
            },
            openLabel: 'Select Source Documents'
        });

        return files ? files.map(file => file.fsPath) : [];
    }

    static async selectPromptingDocuments(): Promise<string[]> {
        const guidelinesPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('guidelinesRepository');

        let defaultUri: vscode.Uri | undefined;
        if (guidelinesPath && fs.existsSync(guidelinesPath)) {
            defaultUri = vscode.Uri.file(guidelinesPath);
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri,
            filters: {
                'Text Files': ['txt', 'md'],
                'All Files': ['*']
            },
            openLabel: 'Select Prompting Documents'
        });

        return files ? files.map(file => file.fsPath) : [];
    }

    static async selectGameSpecifications(): Promise<string[]> {
        const defaultPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('gameSpecificationsDirectory');

        let defaultUri: vscode.Uri | undefined;
        if (defaultPath && fs.existsSync(defaultPath)) {
            defaultUri = vscode.Uri.file(defaultPath);
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri,
            filters: {
                'Python Files': ['py'],
                'All Files': ['*']
            },
            openLabel: 'Select Game Specifications'
        });

        return files ? files.map(file => file.fsPath) : [];
    }

    static async selectGameImplementations(): Promise<string[]> {
        const defaultPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('gameImplementationsDirectory');

        let defaultUri: vscode.Uri | undefined;
        if (defaultPath && fs.existsSync(defaultPath)) {
            defaultUri = vscode.Uri.file(defaultPath);
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri,
            filters: {
                'Python Files': ['py'],
                'JavaScript Files': ['js'],
                'All Files': ['*']
            },
            openLabel: 'Select Game Implementations'
        });

        return files ? files.map(file => file.fsPath) : [];
    }

    static async selectEvaluationTools(): Promise<string[]> {
        const defaultPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('evaluationToolsDirectory');

        let defaultUri: vscode.Uri | undefined;
        if (defaultPath && fs.existsSync(defaultPath)) {
            defaultUri = vscode.Uri.file(defaultPath);
        }

        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri,
            filters: {
                'Python Files': ['py'],
                'Executable Files': ['exe', 'sh'],
                'All Files': ['*']
            },
            openLabel: 'Select Evaluation Tools'
        });

        return files ? files.map(file => file.fsPath) : [];
    }

    static async getFilesFromDirectory(dirPath: string, extensions: string[]): Promise<FileOption[]> {
        try {
            if (!fs.existsSync(dirPath)) {
                return [];
            }

            const files = await fs.promises.readdir(dirPath);
            const options: FileOption[] = [];

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.promises.stat(filePath);
                
                if (stat.isFile()) {
                    const ext = path.extname(file).toLowerCase().slice(1);
                    if (extensions.length === 0 || extensions.includes(ext)) {
                        options.push({
                            label: file,
                            value: filePath,
                            description: this.formatFileSize(stat.size)
                        });
                    }
                }
            }

            return options.sort((a, b) => a.label.localeCompare(b.label));
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }

    static async openFileInEditor(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }

    private static formatFileSize(bytes: number): string {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    static getRelativePath(filePath: string, basePath?: string): string {
        if (!basePath) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                basePath = workspaceFolders[0].uri.fsPath;
            }
        }

        if (basePath && filePath.startsWith(basePath)) {
            return path.relative(basePath, filePath);
        }

        return filePath;
    }
}