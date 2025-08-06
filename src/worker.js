// src/worker.js

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Set CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      };

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // API Routes
      if (path.startsWith('/api')) {
        // Chat endpoint
        if (path === '/api/chat' && request.method === 'POST') {
          const { messages, userId = 'anonymous', provider = env.DEFAULT_MODEL } = await request.json();
          
          // Validate input
          if (!messages || !Array.isArray(messages)) {
            return errorResponse('Invalid messages format', 400, corsHeaders);
          }

          // Process with AI
          const aiResponse = await handleAIRequest(provider, messages, env, ctx);
          
          // Store conversation
          await storeConversation(env, userId, messages, aiResponse);

          return successResponse(aiResponse, corsHeaders);
        }

        // History endpoint
        if (path === '/api/history' && request.method === 'GET') {
          const userId = url.searchParams.get('userId') || 'anonymous';
          const history = await env.CHAT_HISTORY.get(`user:${userId}:conversation`);
          return new Response(history || JSON.stringify({ error: 'No history found' }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        return errorResponse('Endpoint not found', 404, corsHeaders);
      }

      // Serve static assets
      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error('Worker Error:', {
        message: error.message,
        stack: error.stack,
        request: {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers)
        }
      });

      return errorResponse(
        env.ENV === 'development' ? error.message : 'Service unavailable',
        500,
        corsHeaders
      );
    }
  }
};

// ======================
// Core AI Functions
// ======================

async function handleAIRequest(provider, messages, env, ctx) {
  const startTime = Date.now();
  let aiResponse;

  try {
    switch (provider.toLowerCase()) {
      case 'gemini':
        aiResponse = await handleGeminiRequest(messages, env.GEMINI_API_KEY);
        break;
      case 'stability':
        aiResponse = await handleStabilityRequest(messages, env.STABILITY_API_KEY);
        break;
      case 'openai':
      default:
        aiResponse = await handleOpenAIRequest(messages, env.OPENAI_API_KEY);
    }

    // Log successful request
    ctx.waitUntil(logUsage(env, {
      userId: messages.userId || 'anonymous',
      provider,
      duration: Date.now() - startTime,
      tokens: aiResponse.usage?.total_tokens || 0,
      status: 'success'
    }));

    return aiResponse;
  } catch (error) {
    // Log failed request
    ctx.waitUntil(logUsage(env, {
      userId: messages.userId || 'anonymous',
      provider,
      duration: Date.now() - startTime,
      tokens: 0,
      status: 'failed',
      error: error.message
    }));
    throw error;
  }
}

async function storeConversation(env, userId, messages, aiResponse) {
  const conversation = {
    history: [
      ...messages,
      {
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date().toISOString()
      }
    ],
    lastUpdated: new Date().toISOString(),
    usage: aiResponse.usage,
    model: aiResponse.model || env.DEFAULT_MODEL
  };

  await env.CHAT_HISTORY.put(
    `user:${userId}:conversation`,
    JSON.stringify(conversation),
    { expirationTtl: 60 * 60 * 24 * 7 } // 1 week retention
  );
}

// ======================
// AI Provider Handlers
// ======================

async function handleOpenAIRequest(messages, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      usage: data.usage,
      model: data.model
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleGeminiRequest(messages, apiKey) {
  const lastMessage = messages[messages.length - 1].content;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: lastMessage }] }]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status}`);
  }

  const data = await response.json();
  return {
    response: data.candidates[0].content.parts[0].text,
    usage: {
      prompt_tokens: Math.ceil(lastMessage.length / 4),
      completion_tokens: Math.ceil(data.candidates[0].content.parts[0].text.length / 4),
      total_tokens: Math.ceil((lastMessage.length + data.candidates[0].content.parts[0].text.length) / 4)
    },
    model: 'gemini-pro'
  };
}

async function handleStabilityRequest(messages, apiKey) {
  const prompt = messages[messages.length - 1].content;
  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        steps: 30
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Stability AI Error: ${response.status}`);
  }

  const data = await response.json();
  return {
    response: `Image generated with seed: ${data.artifacts[0].seed}`,
    image: data.artifacts[0].base64,
    usage: {
      prompt_tokens: Math.ceil(prompt.length / 4),
      completion_tokens: 0,
      total_tokens: Math.ceil(prompt.length / 4)
    },
    model: 'stable-diffusion-xl'
  };
}

// ======================
// Helper Functions
// ======================

async function logUsage(env, data) {
  try {
    await env.USAGE_ANALYTICS.writeDataPoint({
      blobs: [
        data.userId,
        data.provider,
        data.status,
        data.error || ''
      ],
      doubles: [
        data.duration,
        data.tokens
      ]
    });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

function successResponse(data, headers = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function errorResponse(message, status = 500, headers = {}) {
  return new Response(JSON.stringify({ 
    error: message,
    documentation: "https://github.com/Smartburme/wayne-ai-assistant"
  }), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
            }
