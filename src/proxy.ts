import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { applyRateLimit } from '@/lib/core/rate-limit-middleware';
import { getCookieDomain } from '@/lib/supabase/utils';

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key',
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => {
            const domain = getCookieDomain();
            if (domain) options.domain = domain;
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  if (process.env.E2E_TEST_MODE === 'true' && req.cookies.get('e2e-bypass')?.value) {
    user = { id: 'e2e-test-user-id' };
  } else if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://mock.supabase.co') {
    if (['/settings', '/activity', '/media', '/admin', '/app', '/schedule'].some(p => req.nextUrl.pathname.startsWith(p))) {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }
  }

  const url = req.nextUrl;
  const p = url.pathname;
  const h = req.headers.get("host") || "";
  const isApp = h.startsWith("app.") || h.startsWith("staging.app.") || h.startsWith("app.localhost");
  const isMarketing = !isApp;
  const isVercelPreview = h.endsWith('.vercel.app');
  const appH = h.includes('localhost') ? `app.localhost:${url.port || 3000}` : h.startsWith('staging.') ? `app.staging.directly.social` : `app.directly.social`;
  const appOrigin = `http${h.includes('localhost') ? '' : 's'}://${appH}`;

  const rlRes = await applyRateLimit(req, p, user?.id);
  if (rlRes) return rlRes;
  if (p.startsWith("/api") || p.startsWith("/_next") || p.startsWith("/static") || p.startsWith("/monitoring")) return res;

  if (isMarketing && (p.startsWith("/login") || p.startsWith("/auth"))) return NextResponse.redirect(new URL(p + url.search, appOrigin));
  if (req.method === 'POST' && (isMarketing || p === '/marketing' || p.startsWith('/marketing/'))) {
    if (!p.startsWith('/api') && !p.startsWith('/auth')) return new NextResponse('Method Not Allowed', { status: 405 });
  }
  if (isMarketing && p === "/" && url.searchParams.has('code')) return NextResponse.redirect(new URL(`/auth/v1/callback${url.search}`, appOrigin));
  if (isApp && (p.startsWith("/login") || p.startsWith("/auth"))) return res;
  if ((isMarketing || (isVercelPreview && url.searchParams.get('site') === 'marketing')) && p === "/signup") return NextResponse.redirect(new URL("/login", appOrigin));
  if (p.startsWith('/app/') || p === '/app' || p.startsWith('/marketing/') || p === '/marketing') return res;
  if (isApp || (isVercelPreview && url.searchParams.get('site') !== 'marketing')) return res;
  if (isMarketing || (isVercelPreview && url.searchParams.get('site') === 'marketing')) {
    const rUrl = req.nextUrl.clone();
    rUrl.pathname = p === '/' ? '/marketing' : `/marketing${p}`;
    return NextResponse.rewrite(rUrl);
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'] };

