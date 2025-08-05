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
