// src/worker.js

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      if (path === '/api/chat' && request.method === 'POST') {
        const { messages, aiProvider = 'openai' } = await request.json();
        
        console.log('Received request:', { aiProvider, messageCount: messages.length });

        let response;
        switch (aiProvider.toLowerCase()) {
          case 'gemini':
            response = await handleGeminiRequest(messages, env.GEMINI_API_KEY);
            break;
          case 'stability':
            response = await handleStabilityRequest(messages, env.STABILITY_API_KEY);
            break;
          case 'openai':
          default:
            response = await handleOpenAIRequest(messages, env.OPENAI_API_KEY);
        }

        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      // Detailed error logging
      console.error('Full Error:', {
        message: error.message,
        stack: error.stack,
        request: {
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers)
        }
      });

      return new Response(JSON.stringify({ 
        error: 'AI communication failed',
        details: process.env.ENV === 'development' ? error.message : null
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Improved AI handlers with timeout
async function handleOpenAIRequest(messages, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
      timestamp: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeout);
  }
}
