class WAYNEAssistant {
  constructor() {
    // Bind all methods to maintain proper 'this' context
    this.getSelectedModel = this.getSelectedModel.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.showTypingIndicator = this.showTypingIndicator.bind(this);
    this.hideTypingIndicator = this.hideTypingIndicator.bind(this);
    this.addMessage = this.addMessage.bind(this);
    this.saveConversation = this.saveConversation.bind(this);
    this.loadConversationHistory = this.loadConversationHistory.bind(this);

    // Initialize properties
    this.apiBase = '/api';
    this.currentConversation = [];
    this.isTyping = false;
    this.uploadedFiles = [];
    
    // Initialize after slight delay to ensure DOM is ready
    setTimeout(() => {
      this.initElements();
      this.setupEventListeners();
      this.loadConversationHistory();
    }, 50);
  }

  initElements() {
    try {
      this.messageInput = document.getElementById('message-input');
      this.sendButton = document.getElementById('send-button');
      this.chatContainer = document.getElementById('chat-container');
      this.historyList = document.getElementById('history-list');
      this.aiModelSelect = document.getElementById('ai-model');
      this.fileUpload = document.getElementById('file-upload');
      this.typingIndicator = document.getElementById('typing-indicator');
      this.clearButton = document.getElementById('clear-button');
      this.newChatButton = document.getElementById('new-chat-button');

      // Validate essential elements exist
      if (!this.messageInput || !this.sendButton || !this.chatContainer || !this.aiModelSelect) {
        throw new Error('Essential HTML elements are missing');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this.showErrorToUser('Failed to initialize the app. Please refresh the page.');
    }
  }

  setupEventListeners() {
    try {
      // Main message sending
      this.sendButton.addEventListener('click', () => this.sendMessage());
      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // File handling
      this.fileUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileUpload(e.target.files);
        }
      });

      // Conversation management
      if (this.clearButton) {
        this.clearButton.addEventListener('click', () => this.clearConversation());
      }
      if (this.newChatButton) {
        this.newChatButton.addEventListener('click', () => this.startNewChat());
      }

      // Model change notification
      this.aiModelSelect.addEventListener('change', () => {
        this.addSystemMessage(`Model changed to ${this.getSelectedModel()}`);
      });
    } catch (error) {
      console.error('Event listener setup error:', error);
    }
  }

  getSelectedModel() {
    try {
      return this.aiModelSelect ? this.aiModelSelect.value : 'gemini';
    } catch (error) {
      console.error('Model selection error:', error);
      return 'gemini'; // Default fallback
    }
  }

  async sendMessage() {
    if (this.isTyping) return;

    const message = this.messageInput.value.trim();
    if (!message) return;

    try {
      // Clear input and add to conversation
      this.messageInput.value = '';
      this.addMessage(message, true);

      // Get AI response
      const model = this.getSelectedModel();
      const response = await this.getAIResponse(message, model);

      // Handle different response formats
      if (response && typeof response === 'object') {
        if (response.error) {
          this.addMessage(`Error: ${response.message}`, false);
        } else if (model === 'stability' && response.artifacts?.[0]?.base64) {
          this.handleImageResponse(response.artifacts[0].base64);
        } else {
          const textResponse = response.choices?.[0]?.message?.content || 
                             response.candidates?.[0]?.content?.parts?.[0]?.text ||
                             "I couldn't generate a response. Please try again.";
          this.addMessage(textResponse, false);
        }
      } else {
        this.addMessage(response, false);
      }

      this.saveConversation();
    } catch (error) {
      console.error('Message sending error:', error);
      this.addMessage(`Error: ${error.message || 'Failed to get response'}`, false);
    }
  }

  async getAIResponse(message, model) {
    this.showTypingIndicator();
    
    try {
      const response = await fetch(`${this.apiBase}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message,
          model,
          conversation: this.currentConversation,
          files: this.uploadedFiles
        })
      });

      // Validate response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      return await response.json();
    } finally {
      this.hideTypingIndicator();
      this.uploadedFiles = []; // Clear after sending
    }
  }

  // ... [Previous helper methods with enhanced error handling] ...

  addMessage(content, isUser) {
    try {
      if (!content || typeof content !== 'string') return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
      
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Safe HTML insertion
      messageDiv.innerHTML = `
        <div>${this.escapeHtml(content)}</div>
        <div class="message-time">${isUser ? 'You' : 'WAYNE'} • ${timeString}</div>
      `;
      
      this.chatContainer.appendChild(messageDiv);
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      
      // Add to conversation history
      this.currentConversation.push({
        role: isUser ? 'user' : 'assistant',
        content: content,
        timestamp: now.toISOString(),
        model: isUser ? null : this.getSelectedModel()
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }

  // Utility function to prevent XSS
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  showErrorToUser(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// Safe initialization
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.wayne = new WAYNEAssistant();
  } catch (error) {
    console.error('Failed to initialize WAYNE:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'global-error';
    errorDiv.textContent = 'Failed to initialize the app. Please refresh the page.';
    document.body.prepend(errorDiv);
  }
});
