import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import crypto from 'crypto';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function POST(request) {
    try {
        const { items, format, quality } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Nenhum item selecionado' }, { status: 400 });
        }

        const secret = process.env.APP_SECRET || 'fallback_secret';

        // Cria o stream para o arquivo ZIP com compressão otimizada para velocidade (Vercel CPU Friendly)
        const archive = archiver('zip', { zlib: { level: 1 } }); // Level 1 = Fast, Low CPU
        const passThrough = new PassThrough();
        archive.pipe(passThrough);

        // Prepara o processo de adição de arquivos ao ZIP
        const processItems = async () => {
            for (const item of items) {
                const { url, title, signature } = item;

                const expectedSignature = crypto.createHmac('sha256', secret).update(url).digest('hex');
                if (signature !== expectedSignature) continue;

                try {
                    // Flags de eficiência radical: --no-cache-dir, --buffer-size
                    const commonArgs = ['--no-cache-dir', '--no-check-certificates', '--no-warnings', '--quiet', '-o', '-'];
                    const formatArgs = format === 'mp4'
                        ? ['-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best']
                        : ['-f', 'ba', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', quality === 'best' ? '0' : quality === 'medium' ? '5' : '9'];

                    const child = spawn('yt-dlp', [...commonArgs, ...formatArgs, url]);

                    // Adiciona o stream diretamente ao zip
                    archive.append(child.stdout, { name: `${title.replace(/[/\\?%*:|"<>]/g, '-')}.${format}` });

                    // Resolve quando o processo terminar
                    await new Promise((resolve) => {
                        child.on('close', resolve);
                        child.on('error', resolve);
                    });
                } catch (err) {
                    console.error(`Erro no stream de ${title}:`, err);
                }
            }
            await archive.finalize();
        };

        processItems();

        return new Response(passThrough, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="PlaylistSelection.zip"`,
                'Cache-Control': 'no-cache'
            },
        });

    } catch (error) {
        console.error('Batch download error:', error);
        return NextResponse.json({ error: 'Erro ao gerar ZIP' }, { status: 500 });
    }
}
