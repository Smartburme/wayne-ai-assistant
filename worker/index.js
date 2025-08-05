// worker/index.js
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      // API လမ်းကြောင်းကို စစ်ဆေးခြင်း
      if (url.pathname === '/api/chat') {
        return await handleChatRequest(request, env);
      }
      
      // Frontend ကို GitHub Pages မှ ပြန်လည်တင်ပြခြင်း
      const frontendUrl = new URL('https://smartburme.github.io/wayne-ai-assistant' + url.pathname);
      return fetch(frontendUrl.toString());
      
    } catch (error) {
      // အမှားများကို စနစ်တကျ ကိုင်တွယ်ခြင်း
      return new Response(JSON.stringify({
        error: 'Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Chat Request ကို ကိုင်တွယ်ခြင်း
async function handleChatRequest(request, env) {
  // POST method သာလက်ခံမယ်
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Content-Type စစ်ဆေးခြင်း
  const contentType = request.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return jsonResponse({ error: 'Invalid content type' }, 400);
  }

  try {
    const { message, model = 'gemini' } = await request.json();
    
    // Message ကို စစ်ဆေးခြင်း
    if (!message || typeof message !== 'string') {
      return jsonResponse({ error: 'Invalid message format' }, 400);
    }

    // AI Model အလိုက် ခွဲခြားအလုပ်လုပ်ခြင်း
    let response;
    switch (model.toLowerCase()) {
      case 'openai':
        response = await callOpenAI(message, env.OPENAI_API_KEY);
        break;
      case 'gemini':
        response = await callGemini(message, env.GEMINI_API_KEY);
        break;
      default:
        return jsonResponse({ error: 'Unsupported model' }, 400);
    }

    return jsonResponse({ response });

  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ 
      error: 'AI service error',
      details: error.message 
    }, 500);
  }
}

// OpenAI API ကို ခေါ်ယူခြင်း
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
    throw new Error(`OpenAI: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

// Gemini API ကို ခေါ်ယူခြင်း
async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
}

// JSON Response အတွက် အကူ Function
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // CORS အတွက်
    }
  });
}
