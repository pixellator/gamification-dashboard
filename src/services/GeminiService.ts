import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as posixPath from 'path/posix';
import * as mime from 'mime-types';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

export interface GeminiGenerationResult {
    success: boolean;
    outputPath?: string;
    error?: string;
}

/**
 * Service for interacting with Google Gemini API using the Files API
 * Follows the pattern from gemini-folder.mjs
 */
export class GeminiService {
    private static UPLOADS_FOLDER_NAME = 'uploads-to-GenAI';
    private static TIMEOUT_MS = 120000; // 2 minutes
    private static POLL_INTERVAL_MS = 1500; // 1.5 seconds

    /**
     * Normalize path - just convert backslashes to forward slashes
     * VSCode extension runs on Windows, not in WSL, so keep Windows paths
     */
    private static normalizePath(inputPath: string): string {
        // Just normalize backslashes to forward slashes for consistency
        return inputPath.replace(/\\/g, '/');
    }

    /**
     * Find the project root directory (where .env file should be located)
     * Uses the output directory to find the project root
     */
    private static findProjectRoot(outputDirectory: string): string {
        // Normalize path (just convert backslashes to forward slashes)
        let currentDir = this.normalizePath(outputDirectory);

        console.log(`[GeminiService] Original path: ${outputDirectory}`);
        console.log(`[GeminiService] Normalized path: ${currentDir}`);

        const maxLevelsUp = 5; // Don't search too far up

        for (let i = 0; i < maxLevelsUp; i++) {
            // Use path.join (Windows will use backslashes, but that's OK)
            const envPath = path.join(currentDir, '.env');
            console.log(`[GeminiService] Checking for .env at: ${envPath}`);

            // Debug: Try to read the directory to see what's actually there
            try {
                const dirContents = fs.readdirSync(currentDir);
                console.log(`[GeminiService] Directory contents of ${currentDir}:`, dirContents);
                const hasEnv = dirContents.includes('.env');
                console.log(`[GeminiService] .env in directory listing: ${hasEnv}`);
            } catch (err) {
                console.log(`[GeminiService] Cannot read directory ${currentDir}:`, err);
            }

            const exists = fs.existsSync(envPath);
            console.log(`[GeminiService] fs.existsSync(${envPath}): ${exists}`);

            if (exists) {
                console.log(`[GeminiService] Found .env at: ${envPath}`);
                return currentDir;
            }

            // Use path.dirname
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                console.log(`[GeminiService] Reached filesystem root, stopping search`);
                break; // Reached root
            }
            currentDir = parentDir;
        }

        // If no .env found, throw error with helpful message
        throw new Error(
            `Could not find .env file. Searched up from: ${outputDirectory}\n` +
            `Please create a .env file with GEMINI_API_KEY=your_key in your project root directory.`
        );
    }

    /**
     * Get the uploads folder path
     */
    private static getUploadsFolderPath(projectRoot: string): string {
        return path.join(projectRoot, this.UPLOADS_FOLDER_NAME);
    }

    /**
     * Load API key from .env file
     */
    private static loadEnvApiKey(projectRoot: string): string {
        const envPath = path.join(projectRoot, '.env');

        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
        } else {
            throw new Error(`No .env file found at ${envPath}. Please create a .env file with GEMINI_API_KEY=your_key`);
        }

        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error(`GEMINI_API_KEY not found in .env file at ${envPath}. Please add: GEMINI_API_KEY=your_key`);
        }
        return apiKey;
    }

    /**
     * Wait for uploaded file to become ACTIVE
     */
    private static async waitActive(
        ai: GoogleGenAI,
        fileName: string,
        timeoutMs: number = this.TIMEOUT_MS,
        intervalMs: number = this.POLL_INTERVAL_MS
    ): Promise<any> {
        const start = Date.now();
        while (true) {
            const f = await ai.files.get({ name: fileName }).catch(() => null);
            const state = (f as any)?.state || (f as any)?.status;

            if (state === 'ACTIVE') {
                return f;
            }
            if (state === 'FAILED') {
                throw new Error(`File failed processing: ${fileName}`);
            }
            if (Date.now() - start > timeoutMs) {
                throw new Error(`Timed out waiting for ACTIVE: ${fileName}`);
            }

            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    /**
     * Copy files to uploads-to-GenAI folder
     */
    private static async copyFilesToUploadsFolder(filePaths: string[], projectRoot: string): Promise<string[]> {
        const uploadsFolder = this.getUploadsFolderPath(projectRoot);

        // Ensure uploads folder exists
        if (!fs.existsSync(uploadsFolder)) {
            fs.mkdirSync(uploadsFolder, { recursive: true });
        }

        const copiedFiles: string[] = [];
        for (const filePath of filePaths) {
            // Normalize the source file path too
            const normalizedFilePath = this.normalizePath(filePath);
            const fileName = path.basename(normalizedFilePath);
            const destPath = path.join(uploadsFolder, fileName);

            // Copy file
            await fs.promises.copyFile(normalizedFilePath, destPath);
            copiedFiles.push(destPath);
        }

        return copiedFiles;
    }

    /**
     * Clean up files from uploads-to-GenAI folder
     */
    private static async cleanupUploadsFolder(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            try {
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            } catch (error) {
                console.error(`Failed to delete file ${filePath}:`, error);
            }
        }
    }

    /**
     * Upload files to Gemini Files API and generate content
     */
    private static async uploadAndGenerate(
        filePaths: string[],
        prompt: string,
        projectRoot: string,
        model: string = 'gemini-2.5-flash',
        systemInstruction?: string
    ): Promise<string> {
        // Get API key from .env
        const apiKey = this.loadEnvApiKey(projectRoot);
        const ai = new GoogleGenAI({ apiKey });

        // Upload files
        const uploaded = [];
        for (const localPath of filePaths) {
            const mimeType = mime.lookup(localPath) || 'application/octet-stream';
            const displayName = path.basename(localPath);

            console.log(`→ Upload: ${displayName} (${mimeType})`);

            const file = await ai.files.upload({
                file: localPath,
                config: { mimeType, displayName }
            });

            // Wait for processing to finish
            const fileName = (file as any).name;
            if (!fileName) {
                throw new Error(`Upload failed for ${displayName}: no file name returned`);
            }
            const active = await this.waitActive(ai, fileName);
            uploaded.push(active);
        }

        console.log('All files ACTIVE. Generating...');

        // Build file parts
        const fileParts = uploaded.map(f => ({
            fileData: {
                fileUri: (f as any).uri,
                mimeType: (f as any).mimeType || 'application/octet-stream'
            }
        }));

        // Build contents - only 'user' and 'model' roles are supported, NOT 'system'
        // System instruction should be passed separately in the config
        const contents = [
            { role: 'user', parts: [{ text: prompt }, ...fileParts] }
        ];

        // Build the request config
        const requestConfig: any = {
            model,
            contents
        };

        // Add systemInstruction if provided (separate from contents)
        if (systemInstruction) {
            requestConfig.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        // Generate content
        const resp = await ai.models.generateContent(requestConfig);

        return resp?.text ?? '';
    }

    /**
     * Generate a game specification from source and prompting documents
     */
    static async generateGameSpecification(
        sourceDocuments: string[],
        promptingDocuments: string[],
        outputDirectory: string,
        projectName: string,
        model: string = 'gemini-2.5-flash'
    ): Promise<GeminiGenerationResult> {
        let copiedFiles: string[] = [];

        try {
            // Find project root (where .env is located)
            const projectRoot = this.findProjectRoot(outputDirectory);

            // Combine all files
            const allFiles = [...sourceDocuments, ...promptingDocuments];

            // Copy files to uploads-to-GenAI folder
            copiedFiles = await this.copyFilesToUploadsFolder(allFiles, projectRoot);

            // Build the prompt
            const prompt = `You are tasked with creating a game specification for the project "${projectName}".

The files uploaded include:
- Source documents (${sourceDocuments.length} files): These provide the context and content for the game
- Prompting/Guideline documents (${promptingDocuments.length} files): These provide guidelines and instructions

# Task

Based on the source documents and following the guidelines in the prompting documents, create a detailed game specification in Markdown format. The specification should include:

1. **Game Overview**: Summary of the game concept and learning objectives
2. **Game Mechanics**: Detailed description of how the game works
3. **Content Integration**: How source document content is integrated into gameplay
4. **Player Experience**: Expected player interactions and progression
5. **Technical Requirements**: Any technical specifications needed for implementation
6. **Success Criteria**: How to measure if the game achieves its objectives

Please provide a complete, well-structured game specification document.`;

            const systemInstruction = 'You are an expert game designer specializing in educational gamification. You create engaging, pedagogically sound game specifications that transform academic content into interactive learning experiences.';

            // Send to Gemini with file uploads
            const result = await this.uploadAndGenerate(copiedFiles, prompt, projectRoot, model, systemInstruction);

            // Generate output filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const outputFileName = `${projectName}-spec-${timestamp}.md`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // Save the result
            await fs.promises.writeFile(outputPath, result, 'utf8');

            // Clean up uploaded files
            await this.cleanupUploadsFolder(copiedFiles);

            return {
                success: true,
                outputPath: outputPath
            };
        } catch (error) {
            // Clean up on error
            if (copiedFiles.length > 0) {
                await this.cleanupUploadsFolder(copiedFiles);
            }

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
        projectName: string,
        model: string = 'gemini-2.5-flash'
    ): Promise<GeminiGenerationResult> {
        let copiedFiles: string[] = [];

        try {
            // Find project root (where .env is located)
            const projectRoot = this.findProjectRoot(outputDirectory);

            // Copy files to uploads-to-GenAI folder
            copiedFiles = await this.copyFilesToUploadsFolder(gameSpecifications, projectRoot);

            // Build the prompt
            const prompt = `You are tasked with implementing a SOLUZION game for the project "${projectName}".

The uploaded files contain game specification(s) that describe the game to be implemented.

# Task

Based on the game specification(s), create a complete SOLUZION game implementation.

Please provide all necessary files for a working SOLUZION game, including:
1. Main game logic files
2. Content/data files
3. Configuration files
4. Any supporting assets or resources
5. README with setup and usage instructions

Format your response as a structured set of files that can be packaged into a zip archive.`;

            const systemInstruction = 'You are an expert SOLUZION game developer. You create complete, functional game implementations based on specifications, with clean code and clear documentation.';

            // Send to Gemini with file uploads
            const result = await this.uploadAndGenerate(copiedFiles, prompt, projectRoot, model, systemInstruction);

            // Generate output filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const outputFileName = `${projectName}-game-${timestamp}.txt`;
            const outputPath = path.join(outputDirectory, outputFileName);

            // Save the result
            // TODO: Parse the response and create proper zip file structure
            await fs.promises.writeFile(outputPath, result, 'utf8');

            // Clean up uploaded files
            await this.cleanupUploadsFolder(copiedFiles);

            return {
                success: true,
                outputPath: outputPath
            };
        } catch (error) {
            // Clean up on error
            if (copiedFiles.length > 0) {
                await this.cleanupUploadsFolder(copiedFiles);
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
