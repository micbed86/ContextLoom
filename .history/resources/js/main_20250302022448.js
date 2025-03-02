// txt4GPT File Merger - Main JavaScript

// Global variables
let fileList = [];
let outputPath = '';
let defaultOutputPath = '';

// Initialize the application
async function init() {
    // Initialize Neutralino
    await Neutralino.init();

    // Set up event listeners
    setupEventListeners();
    
    // Set up drag and drop functionality
    setupDragAndDrop();
    
    // Set up sortable file list
    setupSortableList();
    
    // Get default output path (app directory)
    try {
        const appInfo = await Neutralino.app.getConfig();
        // Try to get the current directory path
        try {
            defaultOutputPath = await Neutralino.os.getPath('current');
        } catch (pathError) {
            // Fallback to documents directory if current path fails
            defaultOutputPath = await Neutralino.os.getPath('documents');
            updateStatus('Using documents folder as default output path', 'warning');
        }
        outputPath = defaultOutputPath;
        document.getElementById('outputPath').value = outputPath;
    } catch (error) {
        updateStatus('Error getting default output path: ' + error.message, 'error');
    }
    
    // Register window close event
    Neutralino.events.on('windowClose', () => {
        Neutralino.app.exit();
    });
}

// Set up event listeners
function setupEventListeners() {
    // File input change event
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
    // Drop zone click event
    document.getElementById('dropZone').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    // Clear all button click event
    document.getElementById('clearAll').addEventListener('click', clearAllFiles);
    
    // Select folder button click event
    document.getElementById('selectFolder').addEventListener('click', selectOutputFolder);
    
    // Merge files button click event
    document.getElementById('mergeFiles').addEventListener('click', mergeFiles);
}

// Set up drag and drop functionality
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    // Remove highlight when dragging leaves drop zone
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.classList.add('active');
    }
    
    function unhighlight() {
        dropZone.classList.remove('active');
    }
}

// Set up sortable file list
function setupSortableList() {
    const fileListElement = document.getElementById('fileList');
    new Sortable(fileListElement, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            // Update the fileList array based on the new order
            const items = fileListElement.querySelectorAll('li');
            const newFileList = [];
            
            items.forEach(item => {
                const index = parseInt(item.dataset.index);
                newFileList.push(fileList[index]);
            });
            
            fileList = newFileList;
            renderFileList(); // Re-render to update indices
        }
    });
}

// Handle file selection from input
async function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        await processFiles(files);
    }
}

// Handle dropped files
async function handleDrop(e) {
    const dt = e.dataTransfer;
    
    if (dt.files.length > 0) {
        try {
            const files = Array.from(dt.files).map(file => ({
                name: file.name,
                path: file.path,
                size: file.size || 0,
                type: getFileType(file.name)
            }));
            
            await processFiles(files);
        } catch (error) {
            console.error('Error processing dropped files:', error);
            updateStatus('Error processing dropped files: ' + error.message, 'error');
        }
    }
}

// Process files from input or drop
async function processFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            fileList.push({
                name: file.name,
                path: file.path,
                size: formatFileSize(file.size || 0),
                type: getFileType(file.name)
            });
        } catch (error) {
            updateStatus(`Error adding file ${file.name}: ${error.message}`, 'error');
        }
    }
    
    renderFileList();
    updateStatus(`Added ${files.length} file(s) to the list`);
}

// Render the file list
function renderFileList() {
    const fileListElement = document.getElementById('fileList');
    fileListElement.innerHTML = '';
    
    if (fileList.length === 0) {
        updateStatus('No files added yet');
        return;
    }
    
    fileList.forEach((file, index) => {
        const li = document.createElement('li');
        li.dataset.index = index;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        // Choose icon based on file type
        let iconClass = 'fa-file';
        if (file.type === 'pdf') iconClass = 'fa-file-pdf';
        else if (file.type === 'txt') iconClass = 'fa-file-alt';
        else if (file.type === 'html') iconClass = 'fa-file-code';
        
        fileInfo.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${file.name}</span>
            <small>(${file.size})</small>
        `;
        
        const fileActions = document.createElement('div');
        fileActions.className = 'file-actions';
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-times"></i>';
        deleteButton.className = 'danger-btn';
        deleteButton.addEventListener('click', () => removeFile(index));
        
        fileActions.appendChild(deleteButton);
        li.appendChild(fileInfo);
        li.appendChild(fileActions);
        fileListElement.appendChild(li);
    });
    
    updateStatus(`${fileList.length} file(s) ready to merge`);
}

// Remove a file from the list
function removeFile(index) {
    fileList.splice(index, 1);
    renderFileList();
}

// Clear all files from the list
function clearAllFiles() {
    fileList = [];
    renderFileList();
    updateStatus('All files cleared');
}

// Select output folder
async function selectOutputFolder() {
    try {
        const selection = await Neutralino.os.showFolderDialog('Select output folder');
        if (selection) {
            outputPath = selection;
            document.getElementById('outputPath').value = outputPath;
            updateStatus('Output folder selected: ' + outputPath);
        }
    } catch (error) {
        updateStatus('Error selecting folder: ' + error.message, 'error');
    }
}

// Merge files
async function mergeFiles() {
    if (fileList.length === 0) {
        updateStatus('No files to merge', 'error');
        return;
    }
    
    // Check which output formats are selected
    const formatCheckboxes = document.querySelectorAll('.format-options input[type="checkbox"]:checked');
    const selectedFormats = Array.from(formatCheckboxes).map(cb => cb.value);
    
    if (selectedFormats.length === 0) {
        updateStatus('Please select at least one output format', 'error');
        return;
    }
    
    updateStatus('Merging files...');
    
    try {
        // Create output folder if it doesn't exist
        const combinedFolderPath = `${outputPath}/połączone`;
        await createFolderIfNotExists(combinedFolderPath);
        
        // Generate output file names with sequential numbering
        const fileNumber = await getNextFileNumber(combinedFolderPath, selectedFormats);
        
        // Create output files
        if (selectedFormats.includes('txt')) {
            await createTxtOutputFile(combinedFolderPath, fileNumber);
        }
        
        if (selectedFormats.includes('html')) {
            await createHtmlOutputFile(combinedFolderPath, fileNumber);
        }
        
        updateStatus('Files merged successfully!', 'success');
        
        // Show success message
        await Neutralino.os.showMessageBox('Success', 'Files merged successfully!');
        
    } catch (error) {
        updateStatus('Error merging files: ' + error.message, 'error');
        await Neutralino.os.showMessageBox('Error', 'Error merging files: ' + error.message);
    }
}

// Create folder if it doesn't exist
async function createFolderIfNotExists(folderPath) {
    try {
        await Neutralino.filesystem.readDirectory(folderPath);
    } catch (error) {
        // Folder doesn't exist, create it
        await Neutralino.filesystem.createDirectory(folderPath);
    }
}

// Get the next available file number
async function getNextFileNumber(folderPath, formats) {
    let fileNumber = 1;
    let fileExists = true;
    
    while (fileExists) {
        fileExists = false;
        const paddedNumber = String(fileNumber).padStart(3, '0');
        
        for (const format of formats) {
            const filePath = `${folderPath}/your_files_${paddedNumber}.${format}`;
            try {
                await Neutralino.filesystem.readFile(filePath);
                fileExists = true;
                break;
            } catch (error) {
                // File doesn't exist, continue checking other formats
            }
        }
        
        if (fileExists) {
            fileNumber++;
        }
    }
    
    return fileNumber;
}

// Create TXT output file
async function createTxtOutputFile(folderPath, fileNumber) {
    const paddedNumber = String(fileNumber).padStart(3, '0');
    const outputFilePath = `${folderPath}/your_files_${paddedNumber}.txt`;
    let content = '';
    
    for (const file of fileList) {
        try {
            // Ensure we have a valid file path
            if (!file.path) {
                throw new Error('Invalid file path');
            }

            // The path should already be normalized from the processFiles function
            const normalizedPath = file.path;
            
            // Use readBinaryFile instead of readFile for better compatibility
            let fileData = await Neutralino.filesystem.readBinaryFile(normalizedPath);
            // Convert binary data to text
            let fileContent = new TextDecoder().decode(fileData);
            
            // Add file content to the output
            content += `# Plik: "${file.name}"
### Treść pliku:

${fileContent}

`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`Error reading file ${file.name}: ${error.message}`, 'warning');
            content += `# Plik: "${file.name}"
### Treść pliku:

Error reading file: ${error.message}

`;
        }
    }
    
    await Neutralino.filesystem.writeFile(outputFilePath, content);
}

// Create HTML output file
async function createHtmlOutputFile(folderPath, fileNumber) {
    const paddedNumber = String(fileNumber).padStart(3, '0');
    const outputFilePath = `${folderPath}/your_files_${paddedNumber}.html`;
    
    let content = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Your Files</title>\n</head>\n<body>\n';
    
    for (const file of fileList) {
        try {
            // Ensure we have a valid file path
            if (!file.path) {
                throw new Error('Invalid file path');
            }

            // The path should already be normalized from the processFiles function
            const normalizedPath = file.path;
            
            // Use readBinaryFile instead of readFile for better compatibility
            let fileData = await Neutralino.filesystem.readBinaryFile(normalizedPath);
            // Convert binary data to text
            let fileContent = new TextDecoder().decode(fileData);
            // Escape HTML special characters to prevent rendering issues
            fileContent = escapeHtml(fileContent);
            content += `<h1>Plik: "${file.name}"</h1>\n<h3>Treść pliku:</h3>\n<pre>${fileContent}</pre>\n`;
            
            // Log success for debugging
            console.log(`Successfully read file: ${file.name}`);
        } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
            updateStatus(`Error reading file ${file.name}: ${error.message}`, 'warning');
            content += `<h1>Plik: "${file.name}"</h1>\n<h3>Treść pliku:</h3>\n<pre>Error reading file: ${error.message}</pre>\n`;
        }
    }
    
    content += '</body>\n</html>';
    await Neutralino.filesystem.writeFile(outputFilePath, content);
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper function to get file type from file name
function getFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    return extension;
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update status message
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.className = 'status-bar';
    
    // Add class based on message type
    if (type === 'error') {
        statusElement.style.color = 'var(--danger)';
    } else if (type === 'success') {
        statusElement.style.color = 'var(--success)';
    } else if (type === 'warning') {
        statusElement.style.color = 'orange';
    } else {
        statusElement.style.color = 'var(--text-secondary)';
    }
}

// Call init function when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
