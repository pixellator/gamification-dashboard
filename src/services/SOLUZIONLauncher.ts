import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export interface LaunchResult {
    success: boolean;
    message: string;
    process?: cp.ChildProcess;
}

export class SOLUZIONLauncher {
    private static textEngineProcess: cp.ChildProcess | null = null;
    private static webEngineProcess: cp.ChildProcess | null = null;

    static async launchTextEngine(gameFilePath: string): Promise<LaunchResult> {
        try {
            const soluzionTextPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('soluzionTextPath');

            if (!soluzionTextPath) {
                return {
                    success: false,
                    message: 'SOLUZION Text engine path not configured. Please set gamificationDashboard.soluzionTextPath in settings.'
                };
            }

            // Kill existing process if running
            if (this.textEngineProcess) {
                this.textEngineProcess.kill();
            }

            // Launch SOLUZION Text engine
            const args = [gameFilePath];
            this.textEngineProcess = cp.spawn(soluzionTextPath, args, {
                stdio: 'pipe',
                cwd: path.dirname(gameFilePath)
            });

            // Handle process events
            this.textEngineProcess.on('error', (error) => {
                vscode.window.showErrorMessage(`SOLUZION Text engine error: ${error.message}`);
            });

            this.textEngineProcess.on('exit', (code) => {
                console.log(`SOLUZION Text engine exited with code ${code}`);
                this.textEngineProcess = null;
            });

            // Show output in terminal
            const terminal = vscode.window.createTerminal({
                name: 'SOLUZION Text Engine',
                shellPath: soluzionTextPath,
                shellArgs: args
            });
            terminal.show();

            return {
                success: true,
                message: 'SOLUZION Text engine launched successfully',
                process: this.textEngineProcess
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to launch SOLUZION Text engine: ${error}`
            };
        }
    }

    static async launchWebEngine(gameFilePath: string): Promise<LaunchResult> {
        try {
            const soluzionWebPath = vscode.workspace.getConfiguration('gamificationDashboard').get<string>('soluzionWebPath');

            if (!soluzionWebPath) {
                return {
                    success: false,
                    message: 'SOLUZION Web engine path not configured. Please set gamificationDashboard.soluzionWebPath in settings.'
                };
            }

            // Kill existing process if running
            if (this.webEngineProcess) {
                this.webEngineProcess.kill();
            }

            // Launch SOLUZION Web engine
            const args = [gameFilePath];
            this.webEngineProcess = cp.spawn(soluzionWebPath, args, {
                stdio: 'pipe',
                cwd: path.dirname(gameFilePath)
            });

            // Handle process events
            this.webEngineProcess.on('error', (error) => {
                vscode.window.showErrorMessage(`SOLUZION Web engine error: ${error.message}`);
            });

            this.webEngineProcess.on('exit', (code) => {
                console.log(`SOLUZION Web engine exited with code ${code}`);
                this.webEngineProcess = null;
            });

            // Show output in terminal
            const terminal = vscode.window.createTerminal({
                name: 'SOLUZION Web Engine',
                shellPath: soluzionWebPath,
                shellArgs: args
            });
            terminal.show();

            // Try to open browser after a short delay
            setTimeout(() => {
                vscode.env.openExternal(vscode.Uri.parse('http://localhost:8000'));
            }, 2000);

            return {
                success: true,
                message: 'SOLUZION Web engine launched successfully. Opening browser...',
                process: this.webEngineProcess
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to launch SOLUZION Web engine: ${error}`
            };
        }
    }

    static stopTextEngine(): boolean {
        if (this.textEngineProcess) {
            this.textEngineProcess.kill();
            this.textEngineProcess = null;
            return true;
        }
        return false;
    }

    static stopWebEngine(): boolean {
        if (this.webEngineProcess) {
            this.webEngineProcess.kill();
            this.webEngineProcess = null;
            return true;
        }
        return false;
    }

    static isTextEngineRunning(): boolean {
        return this.textEngineProcess !== null && !this.textEngineProcess.killed;
    }

    static isWebEngineRunning(): boolean {
        return this.webEngineProcess !== null && !this.webEngineProcess.killed;
    }

    static stopAllEngines(): void {
        this.stopTextEngine();
        this.stopWebEngine();
    }

    // Helper method to validate game file
    static validateGameFile(filePath: string): boolean {
        try {
            // Basic validation - check if file exists and has .py extension
            return filePath.endsWith('.py') && require('fs').existsSync(filePath);
        } catch {
            return false;
        }
    }

    // Configure SOLUZION paths through settings
    static async configurePaths(): Promise<void> {
        const textPath = await vscode.window.showInputBox({
            prompt: 'Enter path to SOLUZION Text engine executable',
            placeHolder: '/path/to/soluzion-text'
        });

        if (textPath) {
            await vscode.workspace.getConfiguration('gamificationDashboard').update(
                'soluzionTextPath',
                textPath,
                vscode.ConfigurationTarget.Global
            );
        }

        const webPath = await vscode.window.showInputBox({
            prompt: 'Enter path to SOLUZION Web engine',
            placeHolder: '/path/to/soluzion-web'
        });

        if (webPath) {
            await vscode.workspace.getConfiguration('gamificationDashboard').update(
                'soluzionWebPath',
                webPath,
                vscode.ConfigurationTarget.Global
            );
        }

        vscode.window.showInformationMessage('SOLUZION paths configured successfully');
    }
}