export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const headers = new Headers(request.headers);
    const reqBody = request.body ? request.body : null;
    const method = request.method;

    let targetURL = '';
    let authHeader = '';

    if (path.startsWith('/api/openai')) {
      targetURL = `https://api.openai.com${path.replace('/api/openai', '')}`;
      authHeader = `Bearer ${env.OPENAI_API_KEY}`;
    } else if (path.startsWith('/api/gemini')) {
      targetURL = `https://generativelanguage.googleapis.com${path.replace('/api/gemini', '')}`;
      authHeader = `Bearer ${env.GEMINI_API_KEY}`;
    } else if (path.startsWith('/api/stability')) {
      targetURL = `https://api.stability.ai${path.replace('/api/stability', '')}`;
      authHeader = `Bearer ${env.STABILITY_API_KEY}`;
    } else {
      return new Response('Not found', { status: 404 });
    }

    headers.set('Authorization', authHeader);

    // Remove Cloudflare-specific headers to avoid conflict
    headers.delete('Host');
    headers.delete('CF-Connecting-IP');
    headers.delete('CF-Ray');
    headers.delete('CF-Visitor');

    const response = await fetch(targetURL, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? request.body : null,
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Headers', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    return new Response(response.body, {
      status: response.status,
      headers: resHeaders,
    });
  },
};
