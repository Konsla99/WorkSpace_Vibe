const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    initTerminal: () => ipcRenderer.send('init-terminal'),
    sendTerminalInput: (input) => ipcRenderer.send('terminal-input', input),
    onTerminalIncomingData: (callback) => ipcRenderer.on('terminal-incoming-data', callback),
    resizeTerminal: (cols, rows) => ipcRenderer.send('resize-terminal', cols, rows),
    getInitialWorkspace: () => ipcRenderer.invoke('get-initial-workspace'),
    sendCommandToTerminal: (command) => ipcRenderer.send('send-command-to-terminal', command),
    triggerHardwareEnter: () => ipcRenderer.send('trigger-hardware-enter'),
    onTerminalExit: (callback) => ipcRenderer.on('terminal-exit', callback),
    readInstruction: (workspacePath) => ipcRenderer.invoke('read-instruction', workspacePath),
    showSetupGuide: () => ipcRenderer.send('show-setup-guide'),
    removeTerminalIncomingDataListener: (callback) => ipcRenderer.removeListener('terminal-incoming-data', callback),
    removeTerminalExitListener: (callback) => ipcRenderer.removeListener('terminal-exit', callback),
});