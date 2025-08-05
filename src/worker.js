// src/worker.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (path.startsWith('/api')) {
      try {
        // Chat API endpoint
        if (path === '/api/chat' && request.method === 'POST') {
          const { messages, aiProvider = 'openai' } = await request.json();
          
          if (!messages || !Array.isArray(messages)) {
            return errorResponse('Invalid request format', 400, corsHeaders);
          }

          const lastMessage = messages[messages.length - 1].content;
          let response;

          switch (aiProvider.toLowerCase()) {
            case 'gemini':
              response = await handleGeminiRequest(lastMessage, env.GEMINI_API_KEY);
              break;
            case 'stability':
              response = await handleStabilityRequest(lastMessage, env.STABILITY_API_KEY);
              break;
            case 'openai':
            default:
              response = await handleOpenAIRequest(messages, env.OPENAI_API_KEY);
          }

          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        return errorResponse('Endpoint not found', 404, corsHeaders);

      } catch (error) {
        console.error('API Error:', error);
        return errorResponse(error.message, 500, corsHeaders);
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};

// AI Provider Handlers
async function handleOpenAIRequest(messages, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.choices[0].message.content,
    timestamp: new Date().toISOString(),
    provider: 'openai'
  };
}

async function handleGeminiRequest(prompt, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: data.candidates[0].content.parts[0].text,
    timestamp: new Date().toISOString(),
    provider: 'gemini'
  };
}

async function handleStabilityRequest(prompt, apiKey) {
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Stability AI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    response: `Image generated with seed: ${data.artifacts[0].seed}`,
    image: data.artifacts[0].base64,
    timestamp: new Date().toISOString(),
    provider: 'stability'
  };
}

// Helper function
function errorResponse(message, status = 500, headers = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
      }
