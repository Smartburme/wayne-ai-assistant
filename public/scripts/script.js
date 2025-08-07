// DOM Elements
const chatHistoryList = document.getElementById('chat-history-list');
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const settingsBtn = document.getElementById('settings-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const welcomeScreen = document.getElementById('welcome-screen');
const chatTitle = document.getElementById('chat-title');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const fullscreenToggle = document.getElementById('fullscreen-toggle');
const voiceInputBtn = document.getElementById('voice-input-btn');
const attachBtn = document.getElementById('attach-btn');
const promptButtons = document.querySelectorAll('.prompt-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const cancelSettings = document.getElementById('cancel-settings');
const saveSettings = document.getElementById('save-settings');
const clearDataBtn = document.getElementById('clear-data');
const toast = document.getElementById('toast');

// App State
let currentChat = null;
let chats = [];
let isSidebarOpen = true;
let isDarkMode = true;
let isFullscreen = false;

// Initialize the app
function init() {
    loadChats();
    setupEventListeners();
    applySavedSettings();
    checkSystemTheme();
    adjustTextareaHeight();
    
    if (!currentChat && chats.length === 0) {
        welcomeScreen.style.display = 'flex';
    } else {
        welcomeScreen.style.display = 'none';
    }
}

// Event Listeners
function setupEventListeners() {
    // Chat functionality
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', handleTextareaKeydown);
    userInput.addEventListener('input', adjustTextareaHeight);
    
    // Navigation
    newChatBtn.addEventListener('click', createNewChat);
    settingsBtn.addEventListener('click', openSettings);
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // UI Controls
    darkModeToggle.addEventListener('click', toggleDarkMode);
    fullscreenToggle.addEventListener('click', toggleFullscreen);
    voiceInputBtn.addEventListener('click', startVoiceInput);
    attachBtn.addEventListener('click', handleFileUpload);
    
    // Quick prompts
    promptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt') || '';
            userInput.value = prompt;
            userInput.focus();
        });
    });
    
    // Settings modal
    closeSettings.addEventListener('click', closeSettingsModal);
    cancelSettings.addEventListener('click', closeSettingsModal);
    saveSettings.addEventListener('click', saveSettingsAndClose);
    clearDataBtn.addEventListener('click', clearAllChatData);
    
    // Theme buttons
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelector('.theme-option.active')?.classList.remove('active');
            this.classList.add('active');
        });
    });
}

// Chat Functions
async function sendMessage() {
    const content = userInput.value.trim();
    if (!content) return;
    
    if (!currentChat) {
        currentChat = createNewChat();
    }
    
    // Add user message
    const userMessage = {
        role: 'user',
        content,
        timestamp: new Date()
    };
    
    addMessageToChat(userMessage);
    userInput.value = '';
    adjustTextareaHeight();
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator();
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // Clonudflare worker API endpoint
        const response = await fetch('https://burme-ai.mysvm.workers.dev/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [...currentChat.messages, userMessage]
            }),
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        messagesContainer.removeChild(typingIndicator);
        
        // Add AI response
        const aiMessage = {
            role: 'assistant',
            content: data.response || data.message || "I couldn't generate a response.",
            timestamp: new Date()
        };
        
        addMessageToChat(aiMessage);
        saveChat(currentChat);
        updateChatHistoryList();
    } catch (error) {
        console.error('Error:', error);
        messagesContainer.removeChild(typingIndicator);
        showToast('Error communicating with AI', 'error');
    }
}

function addMessageToChat(message) {
    if (!currentChat) return;
    
    currentChat.messages.push(message);
    renderMessage(message);
    
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }
}

function renderMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role}-message`;
    
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = message.role === 'user' ? 'U' : 'W';
    
    const name = document.createElement('span');
    name.className = 'message-name';
    name.textContent = message.role === 'user' ? 'You' : 'WAYNE';
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(message.timestamp);
    
    meta.appendChild(avatar);
    meta.appendChild(name);
    meta.appendChild(time);
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = formatMessageContent(message.content);
    
    messageElement.appendChild(meta);
    messageElement.appendChild(content);
    
    // Add action buttons for user messages
    if (message.role === 'user') {
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        editBtn.addEventListener('click', () => editMessage(message));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'message-action-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
        deleteBtn.addEventListener('click', () => deleteMessage(message));
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        messageElement.appendChild(actions);
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessageContent(content) {
    // Simple markdown formatting
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    // Convert URLs to links
    formatted = formatted.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert newlines to paragraphs
    formatted = formatted.split('\n').join('</p><p>');
    return `<p>${formatted}</p>`;
}

function createTypingIndicator() {
    const container = document.createElement('div');
    container.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        container.appendChild(dot);
    }
    
    return container;
}

// Chat Management
function createNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date()
    };
    
    currentChat = newChat;
    chats.unshift(newChat);
    saveChats();
    updateChatHistoryList();
    
    messagesContainer.innerHTML = '';
    welcomeScreen.style.display = 'flex';
    chatTitle.textContent = 'WAYNE AI';
    
    return newChat;
}

function loadChat(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    currentChat = chat;
    messagesContainer.innerHTML = '';
    
    if (chat.messages.length === 0) {
        welcomeScreen.style.display = 'flex';
    } else {
        welcomeScreen.style.display = 'none';
        chat.messages.forEach(renderMessage);
    }
    
    chatTitle.textContent = chat.title;
    updateChatHistoryList();
    toggleSidebar(false);
}

function deleteChat(chatId) {
    chats = chats.filter(c => c.id !== chatId);
    saveChats();
    
    if (currentChat?.id === chatId) {
        currentChat = null;
        messagesContainer.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        chatTitle.textContent = 'WAYNE AI';
    }
    
    updateChatHistoryList();
}

function updateChatTitle(newTitle) {
    if (!currentChat) return;
    
    currentChat.title = newTitle;
    chatTitle.textContent = newTitle;
    saveChat(currentChat);
    updateChatHistoryList();
}

function editMessage(message) {
    if (!currentChat) return;
    
    const index = currentChat.messages.findIndex(m => m.timestamp === message.timestamp);
    if (index === -1) return;
    
    const newContent = prompt('Edit your message:', message.content);
    if (newContent && newContent !== message.content) {
        currentChat.messages[index].content = newContent;
        saveChat(currentChat);
        messagesContainer.innerHTML = '';
        currentChat.messages.forEach(renderMessage);
    }
}

function deleteMessage(message) {
    if (!currentChat) return;
    
    if (confirm('Are you sure you want to delete this message?')) {
        currentChat.messages = currentChat.messages.filter(m => m.timestamp !== message.timestamp);
        saveChat(currentChat);
        messagesContainer.innerHTML = '';
        currentChat.messages.forEach(renderMessage);
        
        if (currentChat.messages.length === 0) {
            welcomeScreen.style.display = 'flex';
        }
    }
}

// UI Functions
function toggleSidebar(force) {
    isSidebarOpen = force !== undefined ? force : !isSidebarOpen;
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('active', isSidebarOpen);
        document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    } else {
        sidebar.style.width = isSidebarOpen ? '280px' : '0';
        sidebarToggle.innerHTML = isSidebarOpen ? 
            '<i class="fas fa-chevron-left"></i>' : 
            '<i class="fas fa-chevron-right"></i>';
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light-theme', !isDarkMode);
    darkModeToggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
    
    localStorage.setItem('wayne-dark-mode', isDarkMode.toString());
}

function toggleFullscreen() {
    if (!isFullscreen) {
        document.documentElement.requestFullscreen().catch(console.error);
        fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen().catch(console.error);
        fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
    }
    
    isFullscreen = !isFullscreen;
}

function startVoiceInput() {
    showToast('Voice input is not implemented yet', 'info');
}

function handleFileUpload() {
    showToast('File upload is not implemented yet', 'info');
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 150)}px`;
}

function handleTextareaKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Settings Functions
function openSettings() {
    const currentTheme = isDarkMode ? 'dark' : 'light';
    document.querySelector(`.theme-option[data-theme="${currentTheme}"]`).classList.add('active');
    
    settingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
    settingsModal.classList.remove('active');
    document.body.style.overflow = '';
}

function saveSettingsAndClose() {
    const selectedTheme = document.querySelector('.theme-option.active').getAttribute('data-theme');
    if (selectedTheme) {
        isDarkMode = selectedTheme === 'dark';
        document.body.classList.toggle('light-theme', !isDarkMode);
        localStorage.setItem('wayne-dark-mode', isDarkMode.toString());
    }
    
    showToast('Settings saved', 'success');
    closeSettingsModal();
}

function clearAllChatData() {
    if (confirm('Are you sure you want to delete ALL chat data? This cannot be undone.')) {
        localStorage.removeItem('wayne-chats');
        chats = [];
        currentChat = null;
        messagesContainer.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        chatTitle.textContent = 'WAYNE AI';
        updateChatHistoryList();
        showToast('All chat data cleared', 'success');
        closeSettingsModal();
    }
}

// Utility Functions
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = 'toast show';
    
    let icon = '';
    switch (type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    toast.innerHTML = `${icon} ${message}`;
    
    setTimeout(() => {
        toast.className = 'toast hide';
        setTimeout(() => toast.className = 'toast', 300);
    }, 3000);
}

function checkSystemTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('wayne-dark-mode');
    
    if (savedMode !== null) {
        isDarkMode = savedMode === 'true';
    } else {
        isDarkMode = prefersDark;
    }
    
    document.body.classList.toggle('light-theme', !isDarkMode);
    darkModeToggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
}

// Storage Functions
function loadChats() {
    const savedChats = localStorage.getItem('wayne-chats');
    if (savedChats) {
        try {
            chats = JSON.parse(savedChats).map(chat => ({
                ...chat,
                createdAt: new Date(chat.createdAt),
                messages: chat.messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp)
                }))
            }));
            
            chats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            console.error('Error parsing saved chats:', error);
        }
    }
}

function saveChat(chat) {
    const index = chats.findIndex(c => c.id === chat.id);
    if (index !== -1) {
        chats[index] = chat;
    } else {
        chats.unshift(chat);
    }
    
    saveChats();
}

function saveChats() {
    localStorage.setItem('wayne-chats', JSON.stringify(chats));
}

function updateChatHistoryList() {
    chatHistoryList.innerHTML = '';
    
    if (chats.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'history-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-comments"></i>
            <p>Your chat history will appear here</p>
        `;
        chatHistoryList.appendChild(placeholder);
        return;
    }
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `history-item ${currentChat?.id === chat.id ? 'active' : ''}`;
        item.textContent = chat.title;
        
        item.addEventListener('click', () => loadChat(chat.id));
        
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`Delete chat "${chat.title}"?`)) {
                deleteChat(chat.id);
            }
        });
        
        chatHistoryList.appendChild(item);
    });
}

function applySavedSettings() {
    checkSystemTheme();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    fullscreenToggle.innerHTML = isFullscreen ? 
        '<i class="fas fa-compress"></i>' : 
        '<i class="fas fa-expand"></i>';
});
