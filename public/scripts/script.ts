// DOM Elements
const chatHistoryList = document.getElementById('chat-history-list') as HTMLDivElement;
const messagesContainer = document.getElementById('messages-container') as HTMLDivElement;
const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const newChatBtn = document.getElementById('new-chat-btn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const mobileMenuBtn = document.getElementById('mobile-menu-btn') as HTMLButtonElement;
const sidebarToggle = document.getElementById('sidebar-toggle') as HTMLButtonElement;
const sidebar = document.querySelector('.sidebar') as HTMLElement;
const welcomeScreen = document.getElementById('welcome-screen') as HTMLDivElement;
const chatTitle = document.getElementById('chat-title') as HTMLHeadingElement;
const darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLButtonElement;
const fullscreenToggle = document.getElementById('fullscreen-toggle') as HTMLButtonElement;
const voiceInputBtn = document.getElementById('voice-input-btn') as HTMLButtonElement;
const attachBtn = document.getElementById('attach-btn') as HTMLButtonElement;
const promptButtons = document.querySelectorAll('.prompt-btn') as NodeListOf<HTMLButtonElement>;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const closeSettings = document.getElementById('close-settings') as HTMLButtonElement;
const cancelSettings = document.getElementById('cancel-settings') as HTMLButtonElement;
const saveSettings = document.getElementById('save-settings') as HTMLButtonElement;
const clearDataBtn = document.getElementById('clear-data') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

// App State
interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

let currentChat: Chat | null = null;
let chats: Chat[] = [];
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
  
  // Show welcome screen if no active chat
  if (!currentChat && chats.length === 0) {
    welcomeScreen.style.display = 'flex';
  } else {
    welcomeScreen.style.display = 'none';
  }
}

// Set up event listeners
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
    btn.addEventListener('click', () => {
      document.querySelector('.theme-option.active')?.classList.remove('active');
      btn.classList.add('active');
    });
  });
}

// Chat Functions
async function sendMessage() {
  const content = userInput.value.trim();
  if (!content) return;
  
  // Create new chat if none exists
  if (!currentChat) {
    currentChat = createNewChat();
  }
  
  // Add user message
  const userMessage: Message = {
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
    // Simulate API call (replace with actual API call)
    const response = await simulateAIResponse(content);
    
    // Remove typing indicator
    messagesContainer.removeChild(typingIndicator);
    
    // Add AI response
    const aiMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    
    addMessageToChat(aiMessage);
    saveChat(currentChat!);
    updateChatHistoryList();
  } catch (error) {
    console.error('Error:', error);
    messagesContainer.removeChild(typingIndicator);
    showToast('Error communicating with AI', 'error');
  }
}

function addMessageToChat(message: Message) {
  if (!currentChat) return;
  
  currentChat.messages.push(message);
  renderMessage(message);
  
  // Hide welcome screen if it's the first message
  if (welcomeScreen.style.display !== 'none') {
    welcomeScreen.style.display = 'none';
  }
}

function renderMessage(message: Message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${message.role}-message`);
  
  const meta = document.createElement('div');
  meta.classList.add('message-meta');
  
  const avatar = document.createElement('div');
  avatar.classList.add('message-avatar');
  avatar.textContent = message.role === 'user' ? 'U' : 'W';
  
  const name = document.createElement('span');
  name.classList.add('message-name');
  name.textContent = message.role === 'user' ? 'You' : 'WAYNE';
  
  const time = document.createElement('span');
  time.classList.add('message-time');
  time.textContent = formatTime(message.timestamp);
  
  meta.appendChild(avatar);
  meta.appendChild(name);
  meta.appendChild(time);
  
  const content = document.createElement('div');
  content.classList.add('message-content');
  content.innerHTML = formatMessageContent(message.content);
  
  messageElement.appendChild(meta);
  messageElement.appendChild(content);
  
  // Add action buttons for user messages
  if (message.role === 'user') {
    const actions = document.createElement('div');
    actions.classList.add('message-actions');
    
    const editBtn = document.createElement('button');
    editBtn.classList.add('message-action-btn');
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.addEventListener('click', () => editMessage(message));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('message-action-btn');
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.addEventListener('click', () => deleteMessage(message));
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    messageElement.appendChild(actions);
  }
  
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessageContent(content: string): string {
  // Simple markdown formatting
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>'); // Code blocks
  
  // Convert URLs to links
  formatted = formatted.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  // Convert newlines to paragraphs
  formatted = formatted.split('\n').join('</p><p>');
  return `<p>${formatted}</p>`;
}

function createTypingIndicator(): HTMLDivElement {
  const container = document.createElement('div');
  container.classList.add('typing-indicator');
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.classList.add('typing-dot');
    container.appendChild(dot);
  }
  
  return container;
}

async function simulateAIResponse(prompt: string): Promise<string> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simple response logic - replace with actual AI API call
  const responses = [
    `I've analyzed your query about "${prompt.substring(0, 20)}..." and here's what I found.`,
    `That's an interesting question about "${prompt.substring(0, 20)}...". Let me explain.`,
    `Regarding "${prompt.substring(0, 20)}...", here's the information you requested.`,
    `I understand you're asking about "${prompt.substring(0, 20)}...". Here's my response.`
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return `${randomResponse}\n\nThis is a simulated response from WAYNE AI. In a real implementation, this would connect to an actual AI API like OpenAI, Anthropic, or your custom model. The response would be generated based on the user's input and the conversation context.`;
}

// Chat Management
function createNewChat(): Chat {
  const newChat: Chat = {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date()
  };
  
  currentChat = newChat;
  chats.unshift(newChat);
  saveChats();
  updateChatHistoryList();
  
  // Clear messages container and show welcome screen
  messagesContainer.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  chatTitle.textContent = 'WAYNE AI';
  
  return newChat;
}

function loadChat(chatId: string) {
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

function deleteChat(chatId: string) {
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

function updateChatTitle(newTitle: string) {
  if (!currentChat) return;
  
  currentChat.title = newTitle;
  chatTitle.textContent = newTitle;
  saveChat(currentChat);
  updateChatHistoryList();
}

function editMessage(message: Message) {
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

function deleteMessage(message: Message) {
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
function toggleSidebar(force?: boolean) {
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
  // In a real implementation, this would use the Web Speech API
}

function handleFileUpload() {
  showToast('File upload is not implemented yet', 'info');
  // In a real implementation, this would handle file uploads
}

function adjustTextareaHeight() {
  userInput.style.height = 'auto';
  userInput.style.height = `${Math.min(userInput.scrollHeight, 150)}px`;
}

function handleTextareaKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Settings Functions
function openSettings() {
  // Set current settings in modal
  const currentTheme = isDarkMode ? 'dark' : 'light';
  document.querySelector(`.theme-option[data-theme="${currentTheme}"]`)?.classList.add('active');
  
  // Show modal
  settingsModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
  settingsModal.classList.remove('active');
  document.body.style.overflow = '';
}

function saveSettingsAndClose() {
  // Get selected theme
  const selectedTheme = document.querySelector('.theme-option.active')?.getAttribute('data-theme');
  if (selectedTheme) {
    isDarkMode = selectedTheme === 'dark';
    document.body.classList.toggle('light-theme', !isDarkMode);
    localStorage.setItem('wayne-dark-mode', isDarkMode.toString());
  }
  
  // Save other settings here...
  
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
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toast.textContent = message;
  toast.className = 'toast show';
  
  // Add icon based on type
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
    toast.classList.replace('show', 'hide');
    setTimeout(() => toast.classList.remove('hide'), 300);
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
      const parsed = JSON.parse(savedChats);
      chats = parsed.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      
      // Sort by date (newest first)
      chats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error parsing saved chats:', error);
    }
  }
}

function saveChat(chat: Chat) {
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
    
    // Add context menu for delete option
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
  // Apply saved theme
  checkSystemTheme();
  
  // Apply other saved settings here...
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
  isFullscreen = !!document.fullscreenElement;
  fullscreenToggle.innerHTML = isFullscreen ? 
    '<i class="fas fa-compress"></i>' : 
    '<i class="fas fa-expand"></i>';
});

// Export for testing/development
if (window) {
  (window as any).WAYNE = {
    chats,
    currentChat,
    createNewChat,
    sendMessage,
    toggleDarkMode
  };
        }
