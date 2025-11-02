import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GamificationProject, ProjectFile, ProjectModelFactory, ProjectModelValidator, WorkflowPhase } from '../models/ProjectModel';

export class ProjectManager {
    private static instance: ProjectManager;
    private currentProject: ProjectFile | null = null;

    private constructor() {}

    static getInstance(): ProjectManager {
        if (!ProjectManager.instance) {
            ProjectManager.instance = new ProjectManager();
        }
        return ProjectManager.instance;
    }

    async createNewProject(name: string, saveLocation?: string): Promise<ProjectFile> {
        const project = ProjectModelFactory.createNewProject(name);

        let filePath: string | undefined;
        if (saveLocation) {
            filePath = path.join(saveLocation, `${this.sanitizeFileName(name)}.gip`);
        }

        const projectFile: ProjectFile = {
            project,
            filePath
        };

        if (filePath) {
            await this.saveProject(projectFile);
        }

        this.currentProject = projectFile;
        return projectFile;
    }

    async openProject(filePath: string): Promise<ProjectFile> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const project = this.parseProjectFile(content);

            const errors = ProjectModelValidator.validateProject(project);
            if (errors.length > 0) {
                throw new Error(`Invalid project file: ${errors.join(', ')}`);
            }

            const projectFile: ProjectFile = {
                project,
                filePath
            };

            this.currentProject = projectFile;
            return projectFile;
        } catch (error) {
            throw new Error(`Failed to open project: ${error}`);
        }
    }

    async saveProject(projectFile: ProjectFile): Promise<void> {
        if (!projectFile.filePath) {
            throw new Error('No file path specified for saving');
        }

        try {
            // Update last modified timestamp
            projectFile.project = ProjectModelFactory.updateProjectMetadata(projectFile.project);

            const content = this.serializeProject(projectFile.project);

            // Ensure directory exists
            const dir = path.dirname(projectFile.filePath);
            await fs.promises.mkdir(dir, { recursive: true });

            await fs.promises.writeFile(projectFile.filePath, content, 'utf8');

            vscode.window.showInformationMessage(`Project saved: ${projectFile.project.name}`);
        } catch (error) {
            throw new Error(`Failed to save project: ${error}`);
        }
    }

    async saveProjectAs(projectFile: ProjectFile): Promise<string | undefined> {
        const uri = await vscode.window.showSaveDialog({
            filters: {
                'Gamification Projects': ['gip'],
                'All Files': ['*']
            },
            defaultUri: projectFile.filePath ? vscode.Uri.file(projectFile.filePath) : undefined
        });

        if (uri) {
            projectFile.filePath = uri.fsPath;
            await this.saveProject(projectFile);
            return uri.fsPath;
        }
        return undefined;
    }

    getCurrentProject(): ProjectFile | null {
        return this.currentProject;
    }

    updateProject(updates: Partial<GamificationProject>): void {
        if (this.currentProject) {
            this.currentProject.project = { ...this.currentProject.project, ...updates };
        }
    }

    private parseProjectFile(content: string): GamificationProject {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));

        const project: any = {
            sourceDocuments: [],
            gameImplementations: [],
            gameTraces: [],
            evaluationTools: [],
            metadata: {}
        };

        let currentSection = '';

        for (const line of lines) {
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.slice(1, -1).toLowerCase();
                continue;
            }

            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();

            switch (currentSection) {
                case 'source_documents':
                    if (line.startsWith('- ')) {
                        project.sourceDocuments.push(line.slice(2));
                    }
                    break;
                case 'game_implementations':
                    if (line.startsWith('- ')) {
                        project.gameImplementations.push(line.slice(2));
                    }
                    break;
                case 'game_traces':
                    if (line.startsWith('- ')) {
                        project.gameTraces.push(line.slice(2));
                    }
                    break;
                case 'evaluation_tools':
                    if (line.startsWith('- ')) {
                        project.evaluationTools.push(line.slice(2));
                    }
                    break;
                case 'metadata':
                    if (key && value) {
                        project.metadata[key.toLowerCase()] = value.replace(/"/g, '');
                    }
                    break;
                default:
                    if (key && value) {
                        const cleanKey = key.toLowerCase().replace(/_/g, '');
                        const cleanValue = value.replace(/"/g, '');

                        switch (cleanKey) {
                            case 'projectname':
                                project.name = cleanValue;
                                break;
                            case 'version':
                                project.version = cleanValue;
                                break;
                            case 'promptingdocument':
                                project.promptingDocument = cleanValue;
                                break;
                            case 'gamespecification':
                                project.gameSpecification = cleanValue;
                                break;
                            case 'currentphase':
                                if (ProjectModelValidator.isValidWorkflowPhase(cleanValue)) {
                                    project.currentPhase = cleanValue as WorkflowPhase;
                                }
                                break;
                        }
                    }
            }
        }

        // Set defaults if not found
        if (!project.name) project.name = 'Untitled Project';
        if (!project.version) project.version = '1.0';
        if (!project.currentPhase) project.currentPhase = WorkflowPhase.SourceSelection;
        if (!project.metadata.created) project.metadata.created = new Date().toISOString();
        if (!project.metadata.lastModified) project.metadata.lastModified = new Date().toISOString();

        return project as GamificationProject;
    }

    private serializeProject(project: GamificationProject): string {
        let content = '# Gamification Inference Project File\n';
        content += `# Version: ${project.version}\n`;
        content += `PROJECT_NAME: "${project.name}"\n`;
        content += `VERSION: "${project.version}"\n`;
        content += `CREATED: "${project.metadata.created}"\n`;
        content += `LAST_MODIFIED: "${project.metadata.lastModified}"\n\n`;

        content += '[SOURCE_DOCUMENTS]\n';
        for (const doc of project.sourceDocuments) {
            content += `- ${doc}\n`;
        }
        content += '\n';

        if (project.promptingDocument) {
            content += '[PROMPTING_DOCUMENT]\n';
            content += `${project.promptingDocument}\n\n`;
        }

        if (project.gameSpecification) {
            content += '[GAME_SPECIFICATION]\n';
            content += `${project.gameSpecification}\n\n`;
        }

        if (project.gameImplementations.length > 0) {
            content += '[GAME_IMPLEMENTATIONS]\n';
            for (const impl of project.gameImplementations) {
                content += `- ${impl}\n`;
            }
            content += '\n';
        }

        if (project.gameTraces.length > 0) {
            content += '[GAME_TRACES]\n';
            for (const trace of project.gameTraces) {
                content += `- ${trace}\n`;
            }
            content += '\n';
        }

        if (project.evaluationTools.length > 0) {
            content += '[EVALUATION_TOOLS]\n';
            for (const tool of project.evaluationTools) {
                content += `- ${tool}\n`;
            }
            content += '\n';
        }

        content += '[CURRENT_PHASE]\n';
        content += `${project.currentPhase}\n\n`;

        content += '[METADATA]\n';
        for (const [key, value] of Object.entries(project.metadata)) {
            if (key !== 'created' && key !== 'lastModified') {
                content += `${key}: "${value}"\n`;
            }
        }

        return content;
    }

    private sanitizeFileName(name: string): string {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
}