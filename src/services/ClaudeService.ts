import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ClaudeGenerationResult {
    success: boolean;
    outputPath?: string;
    error?: string;
}

export class ClaudeService {
    /**
     * Generate a game specification from source and prompting documents
     */
    static async generateGameSpecification(
        sourceDocuments: string[],
        promptingDocuments: string[],
        outputDirectory: string,
        projectName: string
    ): Promise<ClaudeGenerationResult> {
        try {
            // Read all source documents
            const sourceContents = await Promise.all(
                sourceDocuments.map(async (filePath) => {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const fileName = path.basename(filePath);
                    return `### Source Document: ${fileName}\n\n${content}`;
                })
            );

            // Read all prompting documents
            const promptingContents = await Promise.all(
                promptingDocuments.map(async (filePath) => {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const fileName = path.basename(filePath);
                    return `### Prompting Document: ${fileName}\n\n${content}`;
                })
            );

            // Build the prompt for Claude
            const prompt = this.buildSpecificationPrompt(sourceContents, promptingContents, projectName);

            // Send to Claude using VSCode's Language Model API
            const result = await this.sendToClaudeAPI(prompt);

            // Generate output filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const outputFileName = `${projectName}-spec-${timestamp}.md`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // Save the result
            await fs.promises.writeFile(outputPath, result, 'utf8');

            return {
                success: true,
                outputPath: outputPath
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Generate a SOLUZION game implementation from specification
     */
    static async implementGame(
        gameSpecifications: string[],
        outputDirectory: string,
        projectName: string
    ): Promise<ClaudeGenerationResult> {
        try {
            // Read all game specifications
            const specContents = await Promise.all(
                gameSpecifications.map(async (filePath) => {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const fileName = path.basename(filePath);
                    return `### Game Specification: ${fileName}\n\n${content}`;
                })
            );

            // Build the prompt for Claude
            const prompt = this.buildImplementationPrompt(specContents, projectName);

            // Send to Claude using VSCode's Language Model API
            const result = await this.sendToClaudeAPI(prompt);

            // Generate output filename (zip file)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const outputFileName = `${projectName}-game-${timestamp}.zip`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // For now, save as text (in real implementation, would need to handle zip creation)
            // TODO: Parse Claude's response and create proper zip file structure
            await fs.promises.writeFile(outputPath.replace('.zip', '.txt'), result, 'utf8');

            return {
                success: true,
                outputPath: outputPath.replace('.zip', '.txt')
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private static buildSpecificationPrompt(sourceContents: string[], promptingContents: string[], projectName: string): string {
        return `You are tasked with creating a game specification for the project "${projectName}".

# Source Documents

The following source documents provide the context and content for the game:

${sourceContents.join('\n\n---\n\n')}

# Prompting/Guideline Documents

The following documents provide guidelines and instructions for creating the game specification:

${promptingContents.join('\n\n---\n\n')}

# Task

Based on the source documents and following the guidelines in the prompting documents, create a detailed game specification in Markdown format. The specification should include:

1. **Game Overview**: Summary of the game concept and learning objectives
2. **Game Mechanics**: Detailed description of how the game works
3. **Content Integration**: How source document content is integrated into gameplay
4. **Player Experience**: Expected player interactions and progression
5. **Technical Requirements**: Any technical specifications needed for implementation
6. **Success Criteria**: How to measure if the game achieves its objectives

Please provide a complete, well-structured game specification document.`;
    }

    private static buildImplementationPrompt(specContents: string[], projectName: string): string {
        return `You are tasked with implementing a SOLUZION game for the project "${projectName}".

# Game Specifications

${specContents.join('\n\n---\n\n')}

# Task

Based on the game specification(s) above, create a complete SOLUZION game implementation.

Please provide all necessary files for a working SOLUZION game, including:
1. Main game logic files
2. Content/data files
3. Configuration files
4. Any supporting assets or resources
5. README with setup and usage instructions

Format your response as a structured set of files that can be packaged into a zip archive.`;
    }

    private static async sendToClaudeAPI(prompt: string): Promise<string> {
        try {
            // Try to use VSCode's Language Model API (Claude)
            const models = await vscode.lm.selectChatModels({
                vendor: 'anthropic',
                family: 'claude-3-5-sonnet'
            });

            if (models.length === 0) {
                throw new Error('No Claude model available. Please ensure you have Claude Code extension installed and configured.');
            }

            const model = models[0];
            const messages = [
                vscode.LanguageModelChatMessage.User(prompt)
            ];

            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            let fullResponse = '';
            for await (const chunk of response.text) {
                fullResponse += chunk;
            }

            return fullResponse;
        } catch (error) {
            throw new Error(`Failed to communicate with Claude: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
