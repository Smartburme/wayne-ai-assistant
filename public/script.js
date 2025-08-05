const chatWindow = document.getElementById('chat-window');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

// Append message to chat window
function appendMessage(text, sender = 'bot') {
  const msgEl = document.createElement('div');
  msgEl.classList.add('message', sender);
  msgEl.textContent = text;
  chatWindow.appendChild(msgEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Fetch answer from your Cloudflare worker API
async function fetchAnswer(question) {
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.answer || "Sorry, I couldn't find an answer.";
  } catch (error) {
    console.error('Fetch error:', error);
    return 'Sorry, there was an error processing your request.';
  }
}

// Handle user form submit
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = userInput.value.trim();
  if (!question) return;

  appendMessage(question, 'user');
  userInput.value = '';
  userInput.disabled = true;

  const answer = await fetchAnswer(question);
  appendMessage(answer, 'bot');

  userInput.disabled = false;
  userInput.focus();
});

// Initial welcome message
appendMessage("Hello! Ask me anything about Wayne AI Assistant.", 'bot');
userInput.focus();
