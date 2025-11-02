# Gamification and Inference Workflow Dashboard

A VSCode extension that provides an interactive dashboard for managing the Gamification and Inference Workflow (GIW) as part of the New Insights from Gamification Project (NIFGP).

## Features

- **Project Management**: Create, open, save, and manage gamification projects
- **Workflow Phases**: Support for all GIW phases from source selection to documentation
- **File Management**: Easy selection and management of source documents, prompting documents, game specifications, and evaluation tools
- **SOLUZION Integration**: Launch both Text and Web SOLUZION game engines directly from the dashboard
- **Extensible Architecture**: Clear extension points for adding new functionality
- **Visual Design**: Stylish light-blue interface with accessible fonts and colors

## Installation

1. Clone or download this repository
2. Open the project in VSCode
3. Run `npm install` to install dependencies
4. Press F5 to launch the extension in a new Extension Development Host window

## Configuration

Before using the extension, configure the SOLUZION paths in VSCode settings:

- `gamificationDashboard.soluzionTextPath`: Path to SOLUZION Text engine executable
- `gamificationDashboard.soluzionWebPath`: Path to SOLUZION Web engine
- `gamificationDashboard.guidelinesRepository`: Path to Repository of Guidelines directory
- `gamificationDashboard.defaultProjectDirectory`: Default directory for projects

## Usage

### Opening the Dashboard

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Gamification Dashboard" and select "Show Gamification Dashboard"
3. The dashboard will open in a new panel

### Creating a New Project

1. Click "New Project" in the file menu
2. Enter a project name
3. The project will be created and loaded in the dashboard

### Managing Files

- **Source Documents**: Click "Add Source Documents" to select scholarly documents
- **Prompting Document**: Click "Select Prompting Document" to choose from guidelines repository
- **Game Specification**: Click "Select Game Specification" to choose the Python game file
- **Evaluation Tools**: Click "Add Evaluation Tools" to select analysis tools

### Testing Games

1. Select a game specification file
2. Set the current phase to "Play Testing" or "Technical Analysis"
3. Click "Launch Text SOLUZION" or "Launch Web SOLUZION" to start testing

## Project File Format

Projects are saved as `.gip` (Gamification Inference Project) files with the following structure:

```
# Gamification Inference Project File
PROJECT_NAME: "Example Project"
VERSION: "1.0"
CREATED: "2025-11-01T12:00:00.000Z"
LAST_MODIFIED: "2025-11-01T12:00:00.000Z"

[SOURCE_DOCUMENTS]
- path/to/source1.pdf
- path/to/source2.txt

[PROMPTING_DOCUMENT]
guidelines/prompt_template.txt

[GAME_SPECIFICATION]
games/my_game.py

[EVALUATION_TOOLS]
- tools/analyzer.py

[CURRENT_PHASE]
play-testing

[METADATA]
scholar: "Dr. Researcher"
collaborator: "Game Developer"
```

## Extension Points

The extension is designed to be easily extensible. To add new functionality:

### Adding New Buttons

1. Add the button HTML in `src/panels/DashboardPanel.ts` in the extension section
2. Cache the element in `src/panels/webview/main.js` `cacheElements()` function
3. Add event listener in `setupEventListeners()`
4. Create handler function
5. Add message handling in extension if needed

### Adding New Workflow Phases

1. Extend `WorkflowPhase` enum in `src/models/ProjectModel.ts`
2. Update phase validation in `ProjectManager.ts`
3. Add UI state handling in webview JavaScript

### Adding New File Types

1. Extend file selector methods in `src/services/FileSelector.ts`
2. Update project model interfaces
3. Add UI elements for the new file type

## Architecture

```
src/
├── extension.ts              # Main extension entry point
├── models/
│   └── ProjectModel.ts       # Data models and interfaces
├── services/
│   ├── ProjectManager.ts     # Project file operations
│   ├── FileSelector.ts       # File selection utilities
│   └── SOLUZIONLauncher.ts  # Game engine integration
└── panels/
    ├── DashboardPanel.ts     # Main panel controller
    └── webview/
        ├── main.js           # Webview JavaScript
        └── style.css         # Dashboard styling
```

## Contributing

This extension is part of the NIFGP research project. For questions or contributions, please contact the project team at the University of Washington.

## License

This project is part of academic research at the University of Washington. Please respect intellectual property and research ethics when using or modifying this code.