export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/auth') {
      return handleAuth(url, env);
    }

    if (url.pathname === '/callback') {
      return handleCallback(url, env);
    }

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rewriting git/trees/branch:path -> contents/path?ref=branch
    if (url.pathname.includes('/git/trees/')) {
      const match = url.pathname.match(/\/git\/trees\/(.*?):(.*)/);
      if (match) {
        const [, branch, path] = match;
        url.pathname = url.pathname.replace(/\/git\/trees\/.*?:.*/, `/contents/${path}`);
        url.searchParams.set('ref', branch);
      }
    }

    const githubUrl = new URL(`https://api.github.com${url.pathname}`);
    githubUrl.search = url.search;

    const response = await fetch(githubUrl.toString(), {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'decap-proxy',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': request.headers.get('Content-Type') || '',
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || '',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
