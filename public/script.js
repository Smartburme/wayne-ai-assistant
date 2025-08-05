// DOM Elements
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const newChatBtn = document.getElementById('newChatBtn');
const chatHistory = document.getElementById('chatHistory');
const headerLoader = document.getElementById('headerLoader');

// Global Variables
let qaPairs = [];
let currentChat = {
    id: generateId(),
    title: 'New Chat',
    messages: []
};
let chatSessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
let isLoading = false;

// Initialize Chat
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    loadChatHistory();
    setupEventListeners();
    displayWelcomeMessage();
});

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Load questions from JSON
async function loadQuestions() {
    try {
        const response = await fetch('docs/questions.json');
        qaPairs = await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        addSystemMessage('Error loading knowledge base. Please try again later.');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Send message on button click or Enter
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isLoading) {
            sendMessage();
        }
    });
    
    // New chat button
    newChatBtn.addEventListener('click', startNewChat);
    
    // Load chat when history item clicked
    chatHistory.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        if (historyItem) {
            const chatId = historyItem.dataset.id;
            loadChatSession(chatId);
        }
    });
}

// Send message function
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isLoading) return;
    
    addMessage('user', message);
    userInput.value = '';
    
    // Show loading indicator
    isLoading = true;
    headerLoader.classList.remove('hidden');
    
    // Process message after short delay
    setTimeout(async () => {
        const response = await getBotResponse(message);
        addMessage('bot', response);
        
        // Update chat history
        updateChatHistory();
        
        // Hide loading indicator
        isLoading = false;
        headerLoader.classList.add('hidden');
    }, 500);
}

// Get bot response (simulated API call)
async function getBotResponse(userMessage) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check for clear commands
    if (userMessage.toLowerCase().includes('clear chat')) {
        chatBox.innerHTML = '';
        return 'Chat history has been cleared.';
    }
    
    // Check for help command
    if (userMessage.toLowerCase().includes('help')) {
        return 'You can ask me questions or select a category to narrow down your query. Try asking about weather, health, or technology.';
    }
    
    // Find matching question
    const exactMatch = qaPairs.find(q => 
        q.question.toLowerCase() === userMessage.toLowerCase()
    );
    
    if (exactMatch) return exactMatch.answer;
    
    // Find partial matches
    const partialMatch = qaPairs.find(q => 
        userMessage.toLowerCase().includes(q.question.toLowerCase()) ||
        q.keywords.some(kw => userMessage.toLowerCase().includes(kw.toLowerCase()))
    );
    
    if (partialMatch) return partialMatch.answer;
    
    // Default response
    return "I couldn't find an answer to that. You can help me learn by adding this question to my knowledge base.";
}

// Add message to chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    
    const messageContent = document.createElement('div');
    messageContent.innerHTML = formatLinks(text);
    messageDiv.appendChild(messageContent);
    
    const timeSpan = document.createElement('div');
    timeSpan.classList.add('message-time');
    timeSpan.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timeSpan);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Add to current chat
    currentChat.messages.push({
        sender,
        text,
        timestamp: new Date().toISOString()
    });
}

// Format links in messages
function formatLinks(text) {
    return text.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" class="chat-link">$1</a>'
    );
}

// Display welcome message
function displayWelcomeMessage() {
    setTimeout(() => {
        addMessage('bot', 'Hello! I\'m WAYNE, your chat assistant. How can I help you today?');
        
        // Show category buttons if available
        if (qaPairs.length > 0) {
            const categories = [...new Set(qaPairs.map(q => q.category))];
            if (categories.length > 0) {
                const buttonsHTML = categories.map(cat => 
                    `<button class="category-btn" data-category="${cat}">${cat}</button>`
                ).join('');
                
                const categoriesMessage = document.createElement('div');
                categoriesMessage.classList.add('message', 'bot-message');
                categoriesMessage.innerHTML = `
                    <div>You can ask me about these topics:</div>
                    <div class="category-btns">${buttonsHTML}</div>
                `;
                chatBox.appendChild(categoriesMessage);
                
                // Add event listeners to category buttons
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        userInput.value = `Tell me about ${btn.dataset.category}`;
                        userInput.focus();
                    });
                });
            }
        }
    }, 500);
}

// Start new chat session
function startNewChat() {
    // Save current chat if not empty
    if (currentChat.messages.length > 0) {
        chatSessions.push(currentChat);
        saveChatSessions();
    }
    
    // Create new chat
    currentChat = {
        id: generateId(),
        title: 'New Chat',
        messages: []
    };
    
    // Clear chat box
    chatBox.innerHTML = '';
    displayWelcomeMessage();
}

// Load chat history from localStorage
function loadChatHistory() {
    chatSessions = JSON.parse(localStorage.getItem('chatSessions')) || [];
    chatHistory.innerHTML = '';
    
    chatSessions.forEach(session => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.dataset.id = session.id;
        historyItem.textContent = session.title || `Chat ${new Date(session.messages[0]?.timestamp).toLocaleDateString()}`;
        chatHistory.appendChild(historyItem);
    });
}

// Load specific chat session
function loadChatSession(chatId) {
    const session = chatSessions.find(s => s.id === chatId);
    if (!session) return;
    
    currentChat = session;
    chatBox.innerHTML = '';
    
    // Replay messages
    session.messages.forEach(msg => {
        addMessage(msg.sender, msg.text);
    });
}

// Update chat history
function updateChatHistory() {
    // Update current chat title based on first message if not set
    if (currentChat.messages.length === 1 && currentChat.title === 'New Chat') {
        const firstMessage = currentChat.messages[0].text;
        currentChat.title = firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
    }
    
    // Check if this chat is already in history
    const existingIndex = chatSessions.findIndex(s => s.id === currentChat.id);
    if (existingIndex >= 0) {
        chatSessions[existingIndex] = currentChat;
    } else if (currentChat.messages.length > 0) {
        chatSessions.push(currentChat);
    }
    
    saveChatSessions();
    loadChatHistory();
}

// Save chat sessions to localStorage
function saveChatSessions() {
    // Keep only the last 20 chats
    if (chatSessions.length > 20) {
        chatSessions = chatSessions.slice(-20);
    }
    
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
}

// Add system message
function addSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'system-message';
    msg.textContent = text;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    }
