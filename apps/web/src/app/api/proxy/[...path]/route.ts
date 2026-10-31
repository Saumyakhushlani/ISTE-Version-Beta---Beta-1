import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/auth/session';
import { verifyToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

const FASTAPI_INTERNAL_URL =
  process.env.FASTAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  let targetPath = '/' + (params.path || []).join('/');
  if (targetPath.startsWith('/api/proxy')) {
    targetPath = targetPath.replace(/^\/api\/proxy/, '');
  }
  if (!targetPath.startsWith('/api/') && targetPath !== '/api' && !targetPath.startsWith('/health')) {
    targetPath = '/api' + (targetPath.startsWith('/') ? targetPath : '/' + targetPath);
  }

  const query = req.nextUrl.search;
  const targetUrl = `${FASTAPI_INTERNAL_URL}${targetPath}${query}`;

  // Extract session token
  const token = await getSessionToken();
  const sessionUser = token ? await verifyToken(token) : null;

  // Prepare outgoing headers
  const outgoingHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Do not forward hop-by-hop headers or cookies
    if (
      lowerKey !== 'host' &&
      lowerKey !== 'cookie' &&
      lowerKey !== 'connection' &&
      lowerKey !== 'content-length'
    ) {
      outgoingHeaders[key] = value;
    }
  });

  // Attach verified Bearer token if user is authenticated
  if (token && sessionUser) {
    outgoingHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    let body: BodyInit | undefined = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        // Forward as ArrayBuffer for binary/multi-part uploads
        body = await req.arrayBuffer();
      } else {
        body = await req.text();
      }
    }

    const fetchOptions: any = {
      method: req.method,
      headers: outgoingHeaders,
      body,
      cache: 'no-store',
    };

    // Node 18+ undici requirement for request body streaming/buffers
    if (body) {
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Extract response headers
    const resHeaders = new Headers();
    response.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'content-encoding' &&
        lowerKey !== 'content-length' &&
        lowerKey !== 'transfer-encoding'
      ) {
        resHeaders.set(key, val);
      }
    });

    const responseData = await response.arrayBuffer();

    return new NextResponse(responseData, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error(`BFF Proxy error forwarding to ${targetUrl}:`, err);
    return NextResponse.json(
      { detail: `Proxy Error connecting to FastAPI backend: ${err.message}` },
      { status: 502 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
