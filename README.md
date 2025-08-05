# AI Power Assistant (WAYNE) Implementation

I'll create a comprehensive AI assistant named WAYNE that integrates multiple AI APIs (OpenAI, Gemini, Stability AI) through Cloudflare Workers, with GitHub repository setup.

## GitHub Repository Structure

```
wayne-ai-assistant/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD to Cloudflare Workers
├── public/
│   ├── index.html             # Frontend interface
│   ├── styles.css             # CSS styles
│   └── script.js              # Frontend JavaScript
├── worker/
│   └── index.js               # Cloudflare Worker code
├── README.md
└── package.json
```

## 1. Cloudflare Worker Code (`worker/index.js`)

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return handleAPIRequest(request, env);
    }
    
    // Serve static assets
    return fetchAsset(request);
  }
};

async function handleAPIRequest(request, env) {
  try {
    const { message, model = 'gemini', options = {} } = await request.json();
    
    switch (model.toLowerCase()) {
      case 'openai':
        return handleOpenAIRequest(message, env, options);
      case 'gemini':
        return handleGeminiRequest(message, env, options);
      case 'stability':
        return handleStabilityRequest(message, env, options);
      default:
        return new Response('Invalid model specified', { status: 400 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleOpenAIRequest(prompt, env, options) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: options.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      ...options
    })
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGeminiRequest(prompt, env, options) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      safetySettings: options.safetySettings || [],
      generationConfig: options.generationConfig || {}
    })
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleStabilityRequest(prompt, env, options) {
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.STABILITY_API_KEY}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      cfg_scale: options.cfg_scale || 7,
      height: options.height || 1024,
      width: options.width || 1024,
      steps: options.steps || 30,
      ...options
    })
  });
  
  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function fetchAsset(request) {
  // In production, this would fetch from your static assets
  const html = `<!DOCTYPE html><html><body>
    <h1>WAYNE AI Power Assistant</h1>
    <p>Worker is running. Use the frontend to interact.</p>
  </body></html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
```

## 2. Frontend Implementation (`public/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WAYNE - AI Power Assistant</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>WAYNE</h1>
      <p class="subtitle">AI Power Assistant</p>
      <div class="model-selector">
        <select id="ai-model">
          <option value="gemini">Gemini</option>
          <option value="openai">OpenAI</option>
          <option value="stability">Stability AI</option>
        </select>
      </div>
    </header>

    <div class="chat-container">
      <div class="chat-header">
        <span>WAYNE Console</span>
        <div class="status-indicator" id="status-indicator"></div>
      </div>
      
      <div class="chat-messages" id="chat-messages">
        <div class="message ai-message">
          <div>Hello! I'm WAYNE, your AI Power Assistant. How can I help you today?</div>
          <div class="message-time">System</div>
        </div>
      </div>
      
      <div class="typing-indicator" id="typing-indicator">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <div class="chat-input">
        <input type="text" id="message-input" placeholder="Ask WAYNE anything..." autocomplete="off">
        <button id="send-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
```

## 3. Frontend JavaScript (`public/script.js`)

```javascript
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
```

## 4. Deployment Configuration (`.github/workflows/deploy.yml`)

```yaml
name: Deploy WAYNE to Cloudflare Workers

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Wrangler
        run: npm install -g wrangler
      
      - name: Deploy to Cloudflare Workers
        run: |
          cd worker
          wrangler deploy
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          STABILITY_API_KEY: ${{ secrets.STABILITY_API_KEY }}
```

## 5. CSS Styles (`public/styles.css`)

```css
:root {
  --primary-color: #6e48aa;
  --secondary-color: #9d50bb;
  --accent-color: #4776e6;
  --dark-color: #1a1a2e;
  --light-color: #f8f9fa;
  --online-color: #4caf50;
  --offline-color: #f44336;
}

body {
  background-color: #f5f5f5;
  color: var(--dark-color);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
}

h1 {
  color: var(--primary-color);
  margin-bottom: 5px;
  font-size: 2.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.model-selector {
  margin-top: 15px;
}

.model-selector select {
  padding: 8px 15px;
  border-radius: 20px;
  border: 2px solid var(--primary-color);
  background-color: white;
  color: var(--dark-color);
  font-weight: bold;
  outline: none;
}

.chat-container {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 600px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  padding: 15px;
  text-align: center;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.online {
  background-color: var(--online-color);
  box-shadow: 0 0 8px var(--online-color);
}

.status-indicator.offline {
  background-color: var(--offline-color);
  box-shadow: 0 0 8px var(--offline-color);
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background-color: #fafafa;
}

.message {
  max-width: 75%;
  padding: 12px 15px;
  border-radius: 18px;
  line-height: 1.4;
  position: relative;
}

.user-message {
  align-self: flex-end;
  background: linear-gradient(135deg, var(--accent-color), var(--primary-color));
  color: white;
  border-bottom-right-radius: 5px;
}

.ai-message {
  align-self: flex-start;
  background-color: #f1f1f1;
  color: var(--dark-color);
  border-bottom-left-radius: 5px;
}

.image-message {
  padding: 0;
  background: none;
  max-width: 90%;
}

.ai-generated-image {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 5px;
  text-align: right;
}

.typing-indicator {
  display: none;
  align-self: flex-start;
  background-color: #f1f1f1;
  padding: 10px 15px;
  border-radius: 18px;
  margin: 0 20px 15px;
}

.typing-dots {
  display: inline-flex;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  background-color: #666;
  border-radius: 50%;
  margin: 0 2px;
  opacity: 0.4;
  animation: typingAnimation 1.4s infinite ease-in-out;
}

@keyframes typingAnimation {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
}

.chat-input {
  display: flex;
  padding: 15px;
  background-color: #f8f8f8;
  border-top: 1px solid #e0e0e0;
}

#message-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 25px;
  outline: none;
  font-size: 1rem;
  transition: border 0.3s;
}

#message-input:focus {
  border-color: var(--primary-color);
}

#send-button {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
  border: none;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  margin-left: 10px;
  cursor: pointer;
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

#send-button:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  
  .chat-container {
    height: 80vh;
  }
  
  .message {
    max-width: 85%;
  }
  
  h1 {
    font-size: 2rem;
  }
}
```

## Setup Instructions

1. **Create GitHub Repository**:
   ```bash
   git init wayne-ai-assistant
   cd wayne-ai-assistant
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/wayne-ai-assistant.git
   git push -u origin main
   ```

2. **Set up Secrets in GitHub**:
   - Go to Repository Settings → Secrets → Actions
   - Add these secrets:
     - `CLOUDFLARE_ACCOUNT_ID`
     - `CLOUDFLARE_API_TOKEN`
     - `OPENAI_API_KEY`
     - `GEMINI_API_KEY`
     - `STABILITY_API_KEY`

3. **Deploy to Cloudflare Workers**:
   - The GitHub Action will automatically deploy when you push to main
   - Or manually deploy using Wrangler CLI:
     ```bash
     cd worker
     npm install -g wrangler
     wrangler deploy
     ```

4. **Configure Custom Domain** (optional):
   - In Cloudflare Dashboard, go to Workers → wayne-ai-assistant → Triggers
   - Add a custom domain or workers.dev subdomain

This implementation gives you a powerful AI assistant with:
- Multi-model support (OpenAI, Gemini, Stability AI)
- Clean, responsive interface
- Automatic deployments via GitHub Actions
- Secure API key management
- Image generation capabilities
- Real-time chat interface

Would you like me to add any specific features or modify any part of this implementation?
