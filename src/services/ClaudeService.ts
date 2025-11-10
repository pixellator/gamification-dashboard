import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { GeminiService } from './GeminiService';

export interface ClaudeGenerationResult {
    success: boolean;
    outputPath?: string;
    error?: string;
}

type AIProvider = 'anthropic' | 'google' | 'openai';

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
            const config = vscode.workspace.getConfiguration('gamificationDashboard');
            const provider = config.get<AIProvider>('aiProvider') || 'anthropic';
            const model = config.get<string>('aiModel') || 'gemini-2.5-flash';

            // Use GeminiService for Google provider with file upload support
            if (provider === 'google') {
                // Use gemini-2.5-flash as default for Google, or the configured model
                const geminiModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
                return await GeminiService.generateGameSpecification(
                    sourceDocuments,
                    promptingDocuments,
                    outputDirectory,
                    projectName,
                    geminiModel
                );
            }

            // For other providers, use the original text-based approach
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

            // Build the prompt
            const prompt = this.buildSpecificationPrompt(sourceContents, promptingContents, projectName);

            // Send to AI provider
            const result = await this.sendToAI(prompt);

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
            const config = vscode.workspace.getConfiguration('gamificationDashboard');
            const provider = config.get<AIProvider>('aiProvider') || 'anthropic';
            const model = config.get<string>('aiModel') || 'gemini-2.5-flash';

            // Use GeminiService for Google provider with file upload support
            if (provider === 'google') {
                // Use gemini-2.5-flash as default for Google, or the configured model
                const geminiModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
                return await GeminiService.implementGame(
                    gameSpecifications,
                    outputDirectory,
                    projectName,
                    geminiModel
                );
            }

            // For other providers, use the original text-based approach
            // Read all game specifications
            const specContents = await Promise.all(
                gameSpecifications.map(async (filePath) => {
                    const content = await fs.promises.readFile(filePath, 'utf8');
                    const fileName = path.basename(filePath);
                    return `### Game Specification: ${fileName}\n\n${content}`;
                })
            );

            // Build the prompt
            const prompt = this.buildImplementationPrompt(specContents, projectName);

            // Send to AI provider
            const result = await this.sendToAI(prompt);

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

    private static async sendToAI(prompt: string): Promise<string> {
        try {
            const config = vscode.workspace.getConfiguration('gamificationDashboard');
            const provider = config.get<AIProvider>('aiProvider') || 'anthropic';
            const model = config.get<string>('aiModel') || 'claude-3-5-sonnet-20241022';

            switch (provider) {
                case 'anthropic':
                    return await this.sendToAnthropic(prompt, model);
                case 'google':
                    return await this.sendToGoogle(prompt, model);
                case 'openai':
                    return await this.sendToOpenAI(prompt, model);
                default:
                    throw new Error(`Unknown AI provider: ${provider}`);
            }
        } catch (error) {
            throw new Error(`Failed to communicate with AI: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private static async sendToAnthropic(prompt: string, model: string): Promise<string> {
        const apiKey = vscode.workspace.getConfiguration('gamificationDashboard')
            .get<string>('anthropicApiKey');

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('Anthropic API key not configured. Please set it in Settings: Gamification Dashboard > Anthropic Api Key. Get your API key from https://console.anthropic.com/');
        }

        const anthropic = new Anthropic({ apiKey });

        const response = await anthropic.messages.create({
            model: model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        });

        let fullResponse = '';
        for (const block of response.content) {
            if (block.type === 'text') {
                fullResponse += block.text;
            }
        }

        return fullResponse;
    }

    private static async sendToGoogle(prompt: string, model: string): Promise<string> {
        const apiKey = vscode.workspace.getConfiguration('gamificationDashboard')
            .get<string>('googleApiKey');

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('Google API key not configured. Please set it in Settings: Gamification Dashboard > Google Api Key. Get your API key from https://aistudio.google.com/apikey');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: model });

        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    private static async sendToOpenAI(prompt: string, model: string): Promise<string> {
        const apiKey = vscode.workspace.getConfiguration('gamificationDashboard')
            .get<string>('openaiApiKey');

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('OpenAI API key not configured. Please set it in Settings: Gamification Dashboard > Openai Api Key. Get your API key from https://platform.openai.com/api-keys');
        }

        const openai = new OpenAI({ apiKey });

        const completion = await openai.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 8192
        });

        return completion.choices[0]?.message?.content || '';
    }
}
