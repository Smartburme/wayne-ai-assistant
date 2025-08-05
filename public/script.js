class WAYNEAssistant {
  constructor() {
    this.apiBase = 'https://wayne-ai-assistant.your-domain.workers.dev/api';
    this.initElements();
    this.setupEventListeners();
    this.updateStatus(true);
  }

  initElements() {
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');
    this.chatMessages = document.getElementById('chat-messages');
    this.typingIndicator = document.getElementById('typing-indicator');
    this.statusIndicator = document.getElementById('status-indicator');
    this.aiModelSelect = document.getElementById('ai-model');
  }

  setupEventListeners() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  updateStatus(online) {
    this.statusIndicator.className = `status-indicator ${online ? 'online' : 'offline'}`;
    this.statusIndicator.title = online ? 'Connected to WAYNE' : 'Connection lost';
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    this.addMessage(message, true);
    this.messageInput.value = '';
    
    try {
      const model = this.aiModelSelect.value;
      const response = await this.getAIResponse(message, model);
      
      if (model === 'stability') {
        this.handleImageResponse(response);
      } else {
        this.addMessage(response, false);
      }
    } catch (error) {
      this.addMessage("Sorry, I encountered an error. Please try again.", false);
      console.error("WAYNE Error:", error);
    }
  }

  async getAIResponse(message, model) {
    this.showTypingIndicator();
    
    const response = await fetch(`${this.apiBase}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, model })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.hideTypingIndicator();
    
    if (model === 'stability') {
      return data.artifacts[0]?.base64 || "No image generated";
    } else if (model === 'openai') {
      return data.choices[0]?.message?.content || "No response";
    } else {
      return data.candidates[0]?.content?.parts[0]?.text || "No response";
    }
  }

  handleImageResponse(base64Image) {
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${base64Image}`;
    img.className = 'ai-generated-image';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message image-message';
    messageDiv.appendChild(img);
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = timeString;
    
    messageDiv.appendChild(timeDiv);
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div>${text}</div>
      <div class="message-time">${isUser ? 'You' : 'WAYNE'} • ${timeString}</div>
    `;
    
    this.chatMessages.appendChild(messageDiv);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  showTypingIndicator() {
    this.typingIndicator.style.display = 'block';
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  hideTypingIndicator() {
    this.typingIndicator.style.display = 'none';
  }
}

// Initialize WAYNE when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.wayne = new WAYNEAssistant();
});
