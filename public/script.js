class WAYNEAssistant {
  constructor() {
    this.apiBase = '/api'; // Using relative path for same-origin requests
    this.currentConversation = [];
    this.isTyping = false;
    this.initElements();
    this.setupEventListeners();
    this.setupServiceWorker();
    this.updateStatus(true);
    this.loadConversation();
  }

  initElements() {
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');
    this.chatMessages = document.getElementById('chat-messages');
    this.typingIndicator = document.getElementById('typing-indicator');
    this.statusIndicator = document.getElementById('status-indicator');
    this.aiModelSelect = document.getElementById('ai-model');
    this.clearButton = document.getElementById('clear-button');
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    this.clearButton.addEventListener('click', () => this.clearConversation());
    
    // Model change handler
    this.aiModelSelect.addEventListener('change', () => {
      this.addSystemMessage(`Model changed to ${this.getSelectedModel()}`);
    });
  }

  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    }
  }

  getSelectedModel() {
    return this.aiModelSelect.value;
  }

  updateStatus(online) {
    this.statusIndicator.className = `status-indicator ${online ? 'online' : 'offline'}`;
    this.statusIndicator.title = online ? 'Connected to WAYNE' : 'Connection lost';
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isTyping) return;

    this.addMessage(message, true);
    this.messageInput.value = '';
    
    try {
      const model = this.getSelectedModel();
      const response = await this.getAIResponse(message, model);
      
      if (model === 'stability') {
        this.handleImageResponse(response);
      } else {
        this.addMessage(response, false);
      }
      
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
      headers: { 'Content-Type': 'application/json' },
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

  handleImageResponse(base64Image) {
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${base64Image}`;
    img.className = 'ai-generated-image';
    img.alt = 'AI generated image';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message image-message';
    messageDiv.appendChild(img);
    
    this.addMessageElement(messageDiv);
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
    
    this.addMessageElement(messageDiv);
    
    // Add to conversation history
    this.currentConversation.push({
      role: isUser ? 'user' : 'assistant',
      content: text,
      timestamp: now.toISOString(),
      model: isUser ? null : this.getSelectedModel()
    });
  }

  addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message';
    messageDiv.textContent = text;
    this.addMessageElement(messageDiv);
  }

  addMessageElement(element) {
    this.chatMessages.appendChild(element);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showTypingIndicator() {
    this.isTyping = true;
    this.typingIndicator.style.display = 'block';
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    this.isTyping = false;
    this.typingIndicator.style.display = 'none';
  }

  clearConversation() {
    this.chatMessages.innerHTML = '';
    this.currentConversation = [];
    localStorage.removeItem('wayneConversation');
    this.addSystemMessage('Conversation cleared');
  }

  saveConversation() {
    try {
      localStorage.setItem('wayneConversation', JSON.stringify({
        conversation: this.currentConversation,
        model: this.getSelectedModel(),
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Failed to save conversation:', e);
    }
  }

  loadConversation() {
    try {
      const saved = localStorage.getItem('wayneConversation');
      if (saved) {
        const { conversation, model } = JSON.parse(saved);
        this.currentConversation = conversation || [];
        
        if (model) {
          this.aiModelSelect.value = model;
        }
        
        // Replay conversation
        this.currentConversation.forEach(msg => {
          if (msg.role === 'user') {
            this.addMessage(msg.content, true);
          } else if (msg.role === 'assistant') {
            this.addMessage(msg.content, false);
          }
        });
      }
    } catch (e) {
      console.error('Failed to load conversation:', e);
    }
  }
}

// Initialize WAYNE when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.wayne = new WAYNEAssistant();
  
  // Add initial greeting after slight delay
  setTimeout(() => {
    if (window.wayne.currentConversation.length === 0) {
      window.wayne.addMessage("Hello! I'm WAYNE, your AI Power Assistant. How can I help you today?", false);
    }
  }, 500);
});
