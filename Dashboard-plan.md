# Dashboard-plan.md
## Software Specification for Gamification and Inference Workflow Dashboard VSCode Extension

### Overview
This document specifies a VSCode extension that provides an interactive dashboard for managing the Gamification and Inference Workflow (GIW) as described in the "Gamification-and-Inference-Workflow.pdf" document. The extension will serve as a control panel for the NIFGP (New Insights from Gamification Project) workflow phases.

### Core Functionality

#### 1. Panel Architecture
- **Primary Interface**: Interactive VSCode panel supporting both sidebar and full-screen modes
- **Layout**: Left-to-right organization reflecting GIW workflow phases:
  1. Source Materials → Gamification Design → Game Implementation → Play-testing/Technical Analysis → Inference → Documentation
- **Scrolling**: Vertical scroll bars in sidebar mode to access entire panel content

#### 2. File Management System
**File Menu Operations:**
- Create new gamification project files
- Open existing project files
- Edit project files
- Save project files

**Project File Format:**
- Human-readable text format
- Machine-parseable by dashboard and associated tools
- Contains key attributes from GIW workflow:
  - Source document references
  - Selected prompting documents
  - Game specification documents
  - Game trace documents
  - Evaluation tool selections
  - Project metadata and version tracking

#### 3. Document Selection Interface
**Drop-down Menus for:**
- Source documents (scholar's materials)
- Prompting documents (from Repository of Guidelines)
- Game-specification documents
- Game-trace documents
- Evaluation tools

**File Access Features:**
- Small "Open" button next to each dropdown
- Button opens selected file in VSCode editor for viewing/editing
- Integration with VSCode's native file handling

#### 4. Project State Management
**Auto-population Features:**
- When project file is opened, populate dropdowns and labels with stored values
- Handle partial specifications (leave blank or show "?" for unspecified items)
- Maintain state consistency between panel and project file

#### 5. Game Testing Integration
**SOLUZION Client Launch Buttons:**
- "Launch Text SOLUZION" button for single-computer, text-based testing
- "Launch Web SOLUZION" button for browser-based, multi-user testing
- Buttons activate during play-testing and technical analysis phase
- Integration with SOLUZION game engines

#### 6. Extensibility Framework
**Developer Hooks:**
- Clear code structure with designated extension points
- Commented sections indicating where to add:
  - New buttons and UI elements
  - Event handlers for new functionality
  - Additional workflow phases
- Plugin architecture for future enhancements

### Visual Design Specifications

#### Color Scheme and Typography
- **Background**: Stylish light-blue
- **Primary Text**: Black, minimum 16-point font
- **Title Section**:
  - Main title: "New Inferences from Gamification Project" (medium-sized violet lettering)
  - Subtitle: "Gamification and Inference Workflow Dashboard" (larger, dark-gray lettering)

#### Layout Components
- Header with project titles
- Workflow phase indicators
- File selection panels
- Action buttons section
- Status/progress indicators
- Extensible button area with clear documentation

### Technical Architecture

#### Extension Structure
```
gamification-dashboard/
├── package.json (VSCode extension manifest)
├── src/
│   ├── extension.ts (main entry point)
│   ├── panels/
│   │   ├── DashboardPanel.ts (main panel controller)
│   │   └── webview/ (HTML/CSS/JS for panel UI)
│   ├── services/
│   │   ├── ProjectManager.ts (project file operations)
│   │   ├── FileSelector.ts (dropdown management)
│   │   └── SOLUZIONLauncher.ts (game engine integration)
│   └── models/
│       └── ProjectModel.ts (project data structure)
└── media/ (CSS, icons, assets)
```

#### Key Classes and Interfaces

**ProjectModel Interface:**
```typescript
interface GamificationProject {
  name: string;
  version: string;
  sourceDocuments: string[];
  promptingDocument?: string;
  gameSpecification?: string;
  gameTraces: string[];
  evaluationTools: string[];
  currentPhase: WorkflowPhase;
  metadata: ProjectMetadata;
}
```

**WorkflowPhase Enum:**
```typescript
enum WorkflowPhase {
  SourceSelection = "source-selection",
  GameDesign = "game-design",
  GameImplementation = "game-implementation",
  PlayTesting = "play-testing",
  TechnicalAnalysis = "technical-analysis",
  Inference = "inference",
  Documentation = "documentation"
}
```

### Workflow Integration

#### Phase-Based UI States
1. **Source Selection Phase**: Enable source document dropdowns, disable testing buttons
2. **Game Design Phase**: Enable prompting document selection, show design status
3. **Game Implementation Phase**: Enable game specification management
4. **Play-testing Phase**: Activate SOLUZION launch buttons, enable trace collection
5. **Technical Analysis Phase**: Show analysis tools, maintain testing capabilities
6. **Inference Phase**: Display inference tools and results
7. **Documentation Phase**: Enable project documentation and export features

#### File Format Specification
**Project File Structure (.gip - Gamification Inference Project):**
```
# Gamification Inference Project File
# Version: 1.0
PROJECT_NAME: "Example Scholarly Analysis"
VERSION: "1.0"
CREATED: "2025-11-01"
LAST_MODIFIED: "2025-11-01"

[SOURCE_DOCUMENTS]
- path/to/source1.pdf
- path/to/source2.txt

[PROMPTING_DOCUMENT]
guidelines/prompt_template_v2.txt

[GAME_SPECIFICATION]
games/scholarly_analysis_game.py

[GAME_TRACES]
traces/session_001.log
traces/session_002.log

[EVALUATION_TOOLS]
tools/integrity_checker.py
tools/hci_analyzer.py

[CURRENT_PHASE]
play-testing

[METADATA]
scholar: "Dr. Jane Researcher"
collaborator: "Alex GameDev"
domain: "Educational Psychology"
```

### Integration Points

#### VSCode Extension API Usage
- **Webview API**: For dashboard panel rendering
- **Workspace API**: For file system operations
- **Commands API**: For menu items and keyboard shortcuts
- **Configuration API**: For extension settings
- **Terminal API**: For SOLUZION launcher integration

#### External Tool Integration
- **SOLUZION Text Engine**: Command-line interface integration
- **SOLUZION Web Engine**: Web server startup and browser launching
- **File System**: Direct file manipulation for project management
- **Git Integration**: Version control for project files and generated games

### Extensibility Guidelines

#### Adding New Buttons
```typescript
// Location: src/panels/DashboardPanel.ts
// Method: addCustomButton()
// Documentation: Add new buttons in the designated extension area
// Event handling: Register in setupButtonHandlers() method
```

#### Adding New Workflow Phases
```typescript
// Location: src/models/ProjectModel.ts
// Extend WorkflowPhase enum
// Update phase validation in ProjectManager.ts
// Add UI state handling in DashboardPanel.ts
```

#### Adding New File Types
```typescript
// Location: src/services/FileSelector.ts
// Extend SupportedFileTypes interface
// Add dropdown configuration in FileSelectorConfig
// Update project file parser in ProjectManager.ts
```

### Configuration and Settings

#### Extension Settings
- Default project directory
- SOLUZION installation paths
- Repository of Guidelines location
- UI theme customization options
- Auto-save preferences

#### User Preferences
- Panel display mode (sidebar vs. full-screen)
- Font size adjustments (minimum 16pt maintained)
- Color theme variations (maintaining accessibility)
- Workflow phase notifications

### Security and Validation

#### File Access Security
- Validate file paths before opening
- Restrict access to designated project directories
- Sanitize user input for file operations

#### Project File Validation
- Schema validation for .gip files
- Version compatibility checking
- Backup creation before modifications

### Future Enhancement Areas

#### Planned Extension Points
1. **Collaboration Features**: Multi-user project sharing
2. **Analytics Integration**: Detailed workflow metrics
3. **AI Assistant**: Integrated LLM prompting interface
4. **Export Formats**: PDF, HTML, JSON project reports
5. **Template System**: Pre-configured project templates
6. **Integration APIs**: Connect with external research tools

#### Modular Architecture Benefits
- Plugin system for domain-specific tools
- Customizable workflow phases
- Third-party SOLUZION engine support
- Research data pipeline integration

This specification provides a comprehensive foundation for developing a VSCode extension that effectively supports the Gamification and Inference Workflow while maintaining extensibility for future research needs.