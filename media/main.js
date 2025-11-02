// Gamification Dashboard Webview JavaScript
(function() {
    console.log('[DASHBOARD] Script loaded - starting initialization');

    const vscode = acquireVsCodeApi();
    console.log('[DASHBOARD] VSCode API acquired:', vscode ? 'SUCCESS' : 'FAILED');

    // State management
    let currentProject = null;
    let currentFilePath = null;

    // DOM elements
    const elements = {};

    // Initialize the dashboard
    function initialize() {
        console.log('[DASHBOARD] Initialize function called');
        console.log('[DASHBOARD] Document ready state:', document.readyState);

        cacheElements();
        setupEventListeners();
        setupMessageHandling();
        setStatus('Dashboard loaded');

        // Notify extension that webview is ready
        vscode.postMessage({ command: 'ready' });
        console.log('[DASHBOARD] Initialization complete');
    }

    function cacheElements() {
        // File menu buttons
        elements.newProjectBtn = document.getElementById('new-project-btn');
        elements.openProjectBtn = document.getElementById('open-project-btn');
        elements.saveProjectBtn = document.getElementById('save-project-btn');
        elements.saveAsBtn = document.getElementById('save-as-btn');

        // Project info
        elements.projectName = document.getElementById('project-name');
        elements.currentPhase = document.getElementById('current-phase');

        // File selection buttons
        elements.selectSourceBtn = document.getElementById('select-source-btn');
        elements.selectPromptingBtn = document.getElementById('select-prompting-btn');
        elements.selectGameSpecBtn = document.getElementById('select-game-spec-btn');
        elements.selectEvalToolsBtn = document.getElementById('select-eval-tools-btn');

        // File lists and displays
        elements.sourceDocumentsList = document.getElementById('source-documents-list');
        elements.promptingDocument = document.getElementById('prompting-document');
        elements.gameSpecification = document.getElementById('game-specification');
        elements.evaluationToolsList = document.getElementById('evaluation-tools-list');

        // Launch buttons
        elements.launchTextBtn = document.getElementById('launch-text-btn');
        elements.launchWebBtn = document.getElementById('launch-web-btn');

        // Extension buttons
        elements.configurePathsBtn = document.getElementById('configure-paths-btn');
        elements.customAnalysisBtn = document.getElementById('custom-analysis-btn');
        elements.exportReportBtn = document.getElementById('export-report-btn');

        // Status bar
        elements.statusText = document.getElementById('status-text');

        // Debug: Check for missing elements
        console.log('[DASHBOARD] Cached elements:', Object.keys(elements).length);
        const missingElements = Object.entries(elements).filter(([key, val]) => !val);
        if (missingElements.length > 0) {
            console.error('[DASHBOARD] Missing elements:', missingElements.map(([key]) => key));
        } else {
            console.log('[DASHBOARD] All elements found successfully');
        }
    }

    function setupEventListeners() {
        console.log('[DASHBOARD] Setting up event listeners...');

        // File menu events
        if (elements.newProjectBtn) {
            elements.newProjectBtn.addEventListener('click', handleNewProject);
            console.log('[DASHBOARD] New Project button listener attached');
        }
        elements.openProjectBtn.addEventListener('click', handleOpenProject);
        elements.saveProjectBtn.addEventListener('click', handleSaveProject);
        elements.saveAsBtn.addEventListener('click', handleSaveAs);

        // Project info events
        elements.projectName.addEventListener('change', handleProjectNameChange);
        elements.currentPhase.addEventListener('change', handlePhaseChange);

        // File selection events
        elements.selectSourceBtn.addEventListener('click', handleSelectSourceDocuments);
        elements.selectPromptingBtn.addEventListener('click', handleSelectPromptingDocument);
        elements.selectGameSpecBtn.addEventListener('click', handleSelectGameSpecification);
        elements.selectEvalToolsBtn.addEventListener('click', handleSelectEvaluationTools);

        // Launch events
        elements.launchTextBtn.addEventListener('click', handleLaunchTextSOLUZION);
        elements.launchWebBtn.addEventListener('click', handleLaunchWebSOLUZION);

        // Extension events
        elements.configurePathsBtn.addEventListener('click', handleConfigurePaths);
        elements.customAnalysisBtn.addEventListener('click', handleCustomAnalysis);
        elements.exportReportBtn.addEventListener('click', handleExportReport);

        console.log('[DASHBOARD] All event listeners attached successfully');
    }

    function setupMessageHandling() {
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'projectLoaded':
                    handleProjectLoaded(message.project, message.filePath);
                    break;
                case 'projectUpdated':
                    handleProjectUpdated(message.project);
                    break;
                case 'projectSaved':
                    handleProjectSaved(message.filePath);
                    break;
                case 'sourceDocumentsSelected':
                    handleSourceDocumentsSelected(message.files);
                    break;
                case 'promptingDocumentSelected':
                    handlePromptingDocumentSelected(message.file);
                    break;
                case 'gameSpecificationSelected':
                    handleGameSpecificationSelected(message.file);
                    break;
                case 'evaluationToolsSelected':
                    handleEvaluationToolsSelected(message.files);
                    break;
                case 'launchResult':
                    handleLaunchResult(message.engine, message.result);
                    break;
                case 'statusUpdate':
                    setStatus(message.message, 'success');
                    break;
                default:
                    console.log('Unknown message:', message);
            }
        });
    }

    // Event handlers
    function handleNewProject() {
        const name = prompt('Enter project name:');
        if (name) {
            setStatus('Creating new project...');
            vscode.postMessage({
                command: 'newProject',
                data: { name: name }
            });
        }
    }

    function handleOpenProject() {
        setStatus('Opening project...');
        vscode.postMessage({ command: 'openProject' });
    }

    function handleSaveProject() {
        if (!currentProject) {
            setStatus('No project to save', 'warning');
            return;
        }
        setStatus('Saving project...');
        vscode.postMessage({ command: 'saveProject' });
    }

    function handleSaveAs() {
        if (!currentProject) {
            setStatus('No project to save', 'warning');
            return;
        }
        setStatus('Saving project as...');
        vscode.postMessage({ command: 'saveProjectAs' });
    }

    function handleProjectNameChange() {
        if (currentProject) {
            currentProject.name = elements.projectName.value;
            updateProject({ name: elements.projectName.value });
        }
    }

    function handlePhaseChange() {
        if (currentProject) {
            currentProject.currentPhase = elements.currentPhase.value;
            updateProject({ currentPhase: elements.currentPhase.value });
            updateUIForPhase(elements.currentPhase.value);
        }
    }

    function handleSelectSourceDocuments() {
        setStatus('Selecting source documents...');
        vscode.postMessage({ command: 'selectSourceDocuments' });
    }

    function handleSelectPromptingDocument() {
        setStatus('Selecting prompting document...');
        vscode.postMessage({ command: 'selectPromptingDocument' });
    }

    function handleSelectGameSpecification() {
        setStatus('Selecting game specification...');
        vscode.postMessage({ command: 'selectGameSpecification' });
    }

    function handleSelectEvaluationTools() {
        setStatus('Selecting evaluation tools...');
        vscode.postMessage({ command: 'selectEvaluationTools' });
    }

    function handleLaunchTextSOLUZION() {
        if (!currentProject || !currentProject.gameSpecification) {
            setStatus('No game specification selected', 'warning');
            return;
        }
        setStatus('Launching Text SOLUZION...');
        vscode.postMessage({ command: 'launchTextSOLUZION' });
    }

    function handleLaunchWebSOLUZION() {
        if (!currentProject || !currentProject.gameSpecification) {
            setStatus('No game specification selected', 'warning');
            return;
        }
        setStatus('Launching Web SOLUZION...');
        vscode.postMessage({ command: 'launchWebSOLUZION' });
    }

    function handleConfigurePaths() {
        setStatus('Configuring SOLUZION paths...');
        vscode.postMessage({ command: 'configurePaths' });
    }

    function handleCustomAnalysis() {
        if (!currentProject) {
            setStatus('No project loaded for analysis', 'warning');
            return;
        }
        setStatus('Running custom analysis...');
        vscode.postMessage({ command: 'customAnalysis' });
    }

    function handleExportReport() {
        if (!currentProject) {
            setStatus('No project to export', 'warning');
            return;
        }
        setStatus('Exporting project report...');
        vscode.postMessage({ command: 'exportReport' });
    }

    // Message handlers from extension
    function handleProjectLoaded(project, filePath) {
        currentProject = project;
        currentFilePath = filePath;
        updateUI();
        setStatus(`Project loaded: ${project.name}`, 'success');
    }

    function handleProjectUpdated(project) {
        currentProject = project;
        updateUI();
        setStatus('Project updated');
    }

    function handleProjectSaved(filePath) {
        currentFilePath = filePath;
        setStatus('Project saved successfully', 'success');
    }

    function handleSourceDocumentsSelected(files) {
        if (currentProject) {
            currentProject.sourceDocuments = files;
            updateSourceDocumentsList();
            setStatus(`${files.length} source document(s) selected`, 'success');
        }
    }

    function handlePromptingDocumentSelected(file) {
        if (currentProject) {
            currentProject.promptingDocument = file;
            updatePromptingDocumentDisplay();
            setStatus('Prompting document selected', 'success');
        }
    }

    function handleGameSpecificationSelected(file) {
        if (currentProject) {
            currentProject.gameSpecification = file;
            updateGameSpecificationDisplay();
            updateLaunchButtons();
            setStatus('Game specification selected', 'success');
        }
    }

    function handleEvaluationToolsSelected(files) {
        if (currentProject) {
            currentProject.evaluationTools = files;
            updateEvaluationToolsList();
            setStatus(`${files.length} evaluation tool(s) selected`, 'success');
        }
    }

    function handleLaunchResult(engine, result) {
        if (result.success) {
            setStatus(`${engine} SOLUZION launched successfully`, 'success');
        } else {
            setStatus(`Failed to launch ${engine} SOLUZION: ${result.message}`, 'error');
        }
    }

    // UI update functions
    function updateUI() {
        if (!currentProject) {
            clearUI();
            return;
        }

        elements.projectName.value = currentProject.name || '';
        elements.currentPhase.value = currentProject.currentPhase || 'source-selection';

        updateSourceDocumentsList();
        updatePromptingDocumentDisplay();
        updateGameSpecificationDisplay();
        updateEvaluationToolsList();
        updateLaunchButtons();
        updateUIForPhase(currentProject.currentPhase);
    }

    function clearUI() {
        elements.projectName.value = '';
        elements.currentPhase.value = 'source-selection';
        elements.sourceDocumentsList.innerHTML = '';
        updatePromptingDocumentDisplay();
        updateGameSpecificationDisplay();
        elements.evaluationToolsList.innerHTML = '';
        updateLaunchButtons();
    }

    function updateSourceDocumentsList() {
        const list = elements.sourceDocumentsList;
        list.innerHTML = '';

        if (currentProject && currentProject.sourceDocuments) {
            currentProject.sourceDocuments.forEach(file => {
                const item = createFileItem(file);
                list.appendChild(item);
            });
        }

        if (!list.children.length) {
            list.innerHTML = '<div class="file-item"><span class="file-name">No source documents selected</span></div>';
        }
    }

    function updatePromptingDocumentDisplay() {
        const container = elements.promptingDocument;
        const fileName = container.querySelector('.file-name');
        const openBtn = container.querySelector('.open-file-btn');

        if (currentProject && currentProject.promptingDocument) {
            fileName.textContent = getFileName(currentProject.promptingDocument);
            openBtn.style.display = 'block';
            openBtn.onclick = () => openFile(currentProject.promptingDocument);
            container.classList.add('has-file');
        } else {
            fileName.textContent = 'No document selected';
            openBtn.style.display = 'none';
            container.classList.remove('has-file');
        }
    }

    function updateGameSpecificationDisplay() {
        const container = elements.gameSpecification;
        const fileName = container.querySelector('.file-name');
        const openBtn = container.querySelector('.open-file-btn');

        if (currentProject && currentProject.gameSpecification) {
            fileName.textContent = getFileName(currentProject.gameSpecification);
            openBtn.style.display = 'block';
            openBtn.onclick = () => openFile(currentProject.gameSpecification);
            container.classList.add('has-file');
        } else {
            fileName.textContent = 'No specification selected';
            openBtn.style.display = 'none';
            container.classList.remove('has-file');
        }
    }

    function updateEvaluationToolsList() {
        const list = elements.evaluationToolsList;
        list.innerHTML = '';

        if (currentProject && currentProject.evaluationTools) {
            currentProject.evaluationTools.forEach(file => {
                const item = createFileItem(file);
                list.appendChild(item);
            });
        }

        if (!list.children.length) {
            list.innerHTML = '<div class="file-item"><span class="file-name">No evaluation tools selected</span></div>';
        }
    }

    function updateLaunchButtons() {
        const hasGameSpec = currentProject && currentProject.gameSpecification;
        const isTestingPhase = currentProject &&
            (currentProject.currentPhase === 'play-testing' ||
             currentProject.currentPhase === 'technical-analysis');

        elements.launchTextBtn.disabled = !hasGameSpec || !isTestingPhase;
        elements.launchWebBtn.disabled = !hasGameSpec || !isTestingPhase;
    }

    function updateUIForPhase(phase) {
        // Update UI based on current workflow phase
        updateLaunchButtons();

        // Add visual indicators for current phase
        document.querySelectorAll('.phase-section').forEach(section => {
            section.classList.remove('active-phase');
        });

        // Highlight relevant sections based on phase
        switch (phase) {
            case 'source-selection':
                // Highlight source documents section
                break;
            case 'game-design':
                // Highlight prompting document section
                break;
            case 'game-implementation':
                // Highlight game specification section
                break;
            case 'play-testing':
            case 'technical-analysis':
                // Highlight testing section
                break;
        }
    }

    // Utility functions
    function createFileItem(filePath) {
        const item = document.createElement('div');
        item.className = 'file-item';

        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = getFileName(filePath);

        const openBtn = document.createElement('button');
        openBtn.className = 'open-file-btn';
        openBtn.textContent = 'Open';
        openBtn.onclick = () => openFile(filePath);

        item.appendChild(fileName);
        item.appendChild(openBtn);

        return item;
    }

    function getFileName(filePath) {
        return filePath.split(/[\\\\\\/]/).pop();
    }

    function openFile(filePath) {
        vscode.postMessage({
            command: 'openFile',
            data: { filePath: filePath }
        });
    }

    function updateProject(updates) {
        vscode.postMessage({
            command: 'updateProject',
            data: updates
        });
    }

    function setStatus(message, type = 'info') {
        elements.statusText.textContent = message;
        elements.statusText.className = `status-${type}`;

        // Clear status after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                if (elements.statusText.textContent === message) {
                    elements.statusText.textContent = 'Ready';
                    elements.statusText.className = '';
                }
            }, 5000);
        }
    }

    // DEVELOPER EXTENSION POINT:
    // Add new event handlers and UI updates below this comment
    // Example functions are now included above for customAnalysis and exportReport
    //
    // To add new buttons:
    // 1. Add the button to the HTML in DashboardPanel.ts
    // 2. Cache the element in cacheElements()
    // 3. Add event listener in setupEventListeners()
    // 4. Create handler function here
    // 5. Add message handling in setupMessageHandling() if needed

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();