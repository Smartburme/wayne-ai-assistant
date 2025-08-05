class WAYNEAssistant {
    constructor() {
        this.apiBase = '/api';
        this.currentConversation = [];
        this.isTyping = false;
        this.initElements();
        this.setupEventListeners();
        this.loadConversationHistory();
        this.setupFileUpload();
    }

    initElements() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.chatContainer = document.getElementById('chat-container');
        this.historyList = document.getElementById('history-list');
        this.aiModelSelect = document.getElementById('ai-model');
        this.clearBtn = document.querySelector('.clear-btn');
        this.newChatBtn = document.querySelector('.new-chat-btn');
        this.fileUpload = document.getElementById('file-upload');
        this.welcomeMessage = document.querySelector('.welcome-message');
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.clearBtn.addEventListener('click', () => this.clearConversation());
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        
        this.aiModelSelect.addEventListener('change', () => {
            this.addSystemMessage(`Model changed to ${this.getSelectedModel()}`);
        });
    }

    setupFileUpload() {
        this.fileUpload.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                this.handleFileUpload(files);
            }
        });
    }

    handleFileUpload(files) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview';
        
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    previewContainer.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
        
        this.chatContainer.appendChild(previewContainer);
        this.addSystemMessage(`${files.length} image(s) uploaded`);
    }

    getSelectedModel() {
        return this.aiModelSelect.value;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        this.addMessage(message, true);
        this.messageInput.value = '';
        
        if (this.welcomeMessage) {
            this.welcomeMessage.style.display = 'none';
        }
        
        try {
            const model = this.getSelectedModel();
            const response = await this.getAIResponse(message, model);
            this.addMessage(response, false);
            this.saveConversation();
        } catch (error) {
            this.addMessage(`Error: ${error.message}`, false);
            console.error("WAYNE Error:", error);
        }
    }

    async getAIResponse(message, model) {
        this.showTypingIndicator();
        
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                model,
                conversation: this.currentConversation 
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        const data = await response.json();
        this.hideTypingIndicator();
        
        // Process response based on model
        switch(model) {
            case 'openai':
                return data.choices[0]?.message?.content || "No response content";
            case 'gemini':
                return data.candidates[0]?.content?.parts[0]?.text || "No response content";
            case 'stability':
                return data.artifacts[0]?.base64 || "No image generated";
            default:
                return "Unknown model response";
        }
    }

    addMessage(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Sanitize text output (basic XSS protection)
        const sanitizedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        messageDiv.innerHTML = `
            <div>${sanitizedText}</div>
            <div class="message-time">${isUser ? 'You' : 'WAYNE'} • ${timeString}</div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        
        // Add to conversation history
        this.currentConversation.push({
            role: isUser ? 'user' : 'assistant',
            content: text,
            timestamp: now.toISOString(),
            model: isUser ? null : this.getSelectedModel()
        });
        
        // Update history list
        this.updateHistoryList();
    }

    addSystemMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        messageDiv.textContent = text;
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    showTypingIndicator() {
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.chatContainer.appendChild(typingDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    startNewChat() {
        if (this.currentConversation.length > 0) {
            if (confirm('Start a new chat? Your current conversation will be saved.')) {
                this.saveConversation();
                this.currentConversation = [];
                this.chatContainer.innerHTML = '';
                this.welcomeMessage.style.display = 'block';
            }
        }
    }

    clearConversation() {
        if (confirm('Clear all conversations? This cannot be undone.')) {
            this.currentConversation = [];
            localStorage.removeItem('wayneConversations');
            this.chatContainer.innerHTML = '';
            this.historyList.innerHTML = '';
            this.welcomeMessage.style.display = 'block';
            this.addSystemMessage('All conversations cleared');
        }
    }

    saveConversation() {
        try {
            let conversations = JSON.parse(localStorage.getItem('wayneConversations')) || [];
            
            // Add current conversation
            if (this.currentConversation.length > 0) {
                conversations.push({
                    id: Date.now(),
                    title: this.generateConversationTitle(),
                    messages: this.currentConversation,
                    timestamp: new Date().toISOString(),
                    model: this.getSelectedModel()
                });
                
                // Keep only last 20 conversations
                if (conversations.length > 20) {
                    conversations = conversations.slice(-20);
                }
                
                localStorage.setItem('wayneConversations', JSON.stringify(conversations));
            }
        } catch (e) {
            console.error('Failed to save conversation:', e);
        }
    }

    loadConversationHistory() {
        try {
            const conversations = JSON.parse(localStorage.getItem('wayneConversations')) || [];
            this.updateHistoryList(conversations);
        } catch (e) {
            console.error('Failed to load conversation history:', e);
        }
    }

    updateHistoryList(conversations = null) {
        if (!conversations) {
            conversations = JSON.parse(localStorage.getItem('wayneConversations')) || [];
        }
        
        this.historyList.innerHTML = '';
        
        conversations.forEach(conv => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i class="fas fa-comment"></i>
                <span>${conv.title}</span>
            `;
            li.addEventListener('click', () => this.loadConversation(conv));
            this.historyList.appendChild(li);
        });
    }

    loadConversation(conversation) {
        this.currentConversation = conversation.messages;
        this.aiModelSelect.value = conversation.model;
        this.chatContainer.innerHTML = '';
        this.welcomeMessage.style.display = 'none';
        
        conversation.messages.forEach(msg => {
            this.addMessage(msg.content, msg.role === 'user');
        });
    }

    generateConversationTitle() {
        if (this.currentConversation.length === 0) return "New Chat";
        
        const firstMessage = this.currentConversation[0].content;
        return firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...' 
            : firstMessage;
    }
}

// Initialize WAYNE when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.wayne = new WAYNEAssistant();
});
