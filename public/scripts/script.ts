// DOM Elements
const chatHistory = document.getElementById('chat-history') as HTMLDivElement;
const userInput = document.getElementById('user-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
const historyBtn = document.getElementById('history-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;

// Chat state
let currentChat: Array<{role: string, content: string}> = [];

// Initialize the app
function init() {
    loadChatHistory();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    newChatBtn.addEventListener('click', startNewChat);
    historyBtn.addEventListener('click', showChatHistory);
    settingsBtn.addEventListener('click', showSettings);
}

// Send message function
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    userInput.value = '';
    
    // Show loading indicator
    const loadingMessage = addMessageToChat('ai', 'Thinking...', true);
    
    try {
        // Send message to worker
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: currentChat,
            }),
        });
        
        const data = await response.json();
        
        // Update loading message with actual response
        if (loadingMessage) {
            loadingMessage.textContent = data.response;
            loadingMessage.classList.remove('loading');
        }
        
        // Add to current chat
        currentChat.push({role: 'assistant', content: data.response});
        
        // Save to history
        saveChatToHistory();
    } catch (error) {
        console.error('Error:', error);
        if (loadingMessage) {
            loadingMessage.textContent = 'Sorry, something went wrong. Please try again.';
            loadingMessage.classList.remove('loading');
        }
    }
}

// Add message to chat UI
function addMessageToChat(role: string, content: string, isLoading = false): HTMLElement | null {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    if (isLoading) messageDiv.classList.add('loading');
    messageDiv.textContent = content;
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    
    // Add to current chat if not loading
    if (!isLoading) {
        currentChat.push({role, content});
    }
    
    return isLoading ? messageDiv : null;
}

// Start a new chat
function startNewChat() {
    if (currentChat.length > 0) {
        if (confirm('Start a new chat? Your current chat will be saved.')) {
            saveChatToHistory();
            currentChat = [];
            chatHistory.innerHTML = '';
        }
    }
}

// Show chat history
function showChatHistory() {
    // Implement history view logic
    alert('Chat history feature will be implemented here');
}

// Show settings
function showSettings() {
    // Implement settings logic
    alert('Settings feature will be implemented here');
}

// Save chat to history
function saveChatToHistory() {
    if (currentChat.length === 0) return;
    
    const chats = getSavedChats();
    chats.push({
        id: Date.now(),
        title: currentChat[0].content.substring(0, 30) + (currentChat[0].content.length > 30 ? '...' : ''),
        messages: currentChat,
        timestamp: new Date().toISOString()
    });
    
    localStorage.setItem('wayne-chats', JSON.stringify(chats));
}

// Get saved chats from localStorage
function getSavedChats(): Array<any> {
    const chats = localStorage.getItem('wayne-chats');
    return chats ? JSON.parse(chats) : [];
}

// Load chat history from localStorage
function loadChatHistory() {
    // Implement loading of chat history if needed
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
