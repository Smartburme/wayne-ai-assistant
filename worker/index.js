export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      // Handle API requests
      if (url.pathname === '/api/chat') {
        return handleChatRequest(request, env);
      }
      
      // Serve frontend from GitHub Pages
      const frontendUrl = 'https://smartburme.github.io/wayne-ai-assistant' + url.pathname;
      return fetch(frontendUrl);

    } catch (err) {
      // Enhanced error logging
      console.error('Worker Error:', err);
      return new Response(JSON.stringify({
        error: err.message,
        stack: err.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleChatRequest(request, env) {
  // Verify the request method
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const { message, model = 'gemini' } = await request.json();
    
    // Validate the input
    if (!message || typeof message !== 'string') {
      return new Response('Invalid message format', { status: 400 });
    }

    // Call the appropriate AI API
    let response;
    switch (model.toLowerCase()) {
      case 'openai':
        response = await callOpenAI(message, env.OPENAI_API_KEY);
        break;
      case 'gemini':
        response = await callGemini(message, env.GEMINI_API_KEY);
        break;
      default:
        return new Response('Unsupported model', { status: 400 });
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('API Error:', err);
    return new Response(JSON.stringify({ 
      error: err.message,
      details: err.response?.statusText || 'No additional details'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Improved API call functions with better error handling
async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
      }
