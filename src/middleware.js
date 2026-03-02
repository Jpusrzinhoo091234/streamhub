import { NextResponse } from 'next/server';

// Simplificação de Rate Limiting em memória para Serverless
// Nota: Em Vercel, cada função é isolada, mas isso ajuda na concorrência local 
// e pode ser facilmente substituído por Redis (Upstash) no futuro.
const rateLimitMap = new Map();

export function middleware(request) {
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 10; // 10 requisições por minuto por IP

    // Filtra apenas as rotas de API críticas
    if (request.nextUrl.pathname.startsWith('/api/validate') ||
        request.nextUrl.pathname.startsWith('/api/download') ||
        request.nextUrl.pathname.startsWith('/api/batch-download')) {

        const userRequests = rateLimitMap.get(ip) || [];
        const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

        if (recentRequests.length >= maxRequests) {
            return NextResponse.json(
                { error: 'Muitas requisições. Tente novamente em um minuto.' },
                { status: 429 }
            );
        }

        recentRequests.push(now);
        rateLimitMap.set(ip, recentRequests);
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
