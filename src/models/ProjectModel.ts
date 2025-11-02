export enum WorkflowPhase {
    SourceSelection = "source-selection",
    GameDesign = "game-design",
    GameImplementation = "game-implementation",
    PlayTesting = "play-testing",
    TechnicalAnalysis = "technical-analysis",
    Inference = "inference",
    Documentation = "documentation"
}

export interface ProjectMetadata {
    scholar?: string;
    collaborator?: string;
    domain?: string;
    created: string;
    lastModified: string;
    [key: string]: any;
}

export interface GamificationProject {
    name: string;
    version: string;
    sourceDocuments: string[];
    promptingDocument?: string;
    gameSpecification?: string;
    gameImplementations: string[];
    gameTraces: string[];
    evaluationTools: string[];
    currentPhase: WorkflowPhase;
    metadata: ProjectMetadata;
}

export interface ProjectFile {
    project: GamificationProject;
    filePath?: string;
}

export class ProjectModelValidator {
    static validateProject(project: GamificationProject): string[] {
        const errors: string[] = [];

        if (!project.name || project.name.trim() === '') {
            errors.push('Project name is required');
        }

        if (!project.version || project.version.trim() === '') {
            errors.push('Project version is required');
        }

        if (!Object.values(WorkflowPhase).includes(project.currentPhase)) {
            errors.push('Invalid workflow phase');
        }

        if (!project.metadata || !project.metadata.created) {
            errors.push('Project creation date is required');
        }

        return errors;
    }

    static isValidWorkflowPhase(phase: string): phase is WorkflowPhase {
        return Object.values(WorkflowPhase).includes(phase as WorkflowPhase);
    }
}

export class ProjectModelFactory {
    static createNewProject(name: string): GamificationProject {
        const now = new Date().toISOString();

        return {
            name: name,
            version: "1.0",
            sourceDocuments: [],
            gameImplementations: [],
            gameTraces: [],
            evaluationTools: [],
            currentPhase: WorkflowPhase.SourceSelection,
            metadata: {
                created: now,
                lastModified: now
            }
        };
    }

    static updateProjectMetadata(project: GamificationProject): GamificationProject {
        return {
            ...project,
            metadata: {
                ...project.metadata,
                lastModified: new Date().toISOString()
            }
        };
    }
}