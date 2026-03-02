import { spawn } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import crypto from 'crypto';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const title = searchParams.get('title') || 'audio';
    const format = searchParams.get('format') || 'mp3';
    const quality = searchParams.get('quality') || 'best';
    const signature = searchParams.get('signature');

    if (!url || !signature) {
        return new Response('URL e Assinatura são obrigatórias', { status: 400 });
    }

    // Verifica a assinatura
    const secret = process.env.APP_SECRET || 'fallback_secret';
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(url)
        .digest('hex');

    if (signature !== expectedSignature) {
        return new Response('Assinatura inválida. Acesso negado.', { status: 403 });
    }

    const isAudio = format === 'mp3';
    const headers = new Headers();

    // Sanitiza o título para uso como nome de arquivo
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'audio';

    if (isAudio) {
        headers.set('Content-Type', 'audio/mpeg');
        headers.set('Content-Disposition', `attachment; filename="${safeTitle}.mp3"`);
    } else {
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`);
    }

    // Argumentos dinâmicos baseados na escolha do usuário
    const ytDlpArgs = [
        '--no-cache-dir',
        '--no-check-certificates',
        '--no-warnings',
        '--quiet',
        '--ffmpeg-location', ffmpeg,
        '-o', '-',
        url
    ];

    if (isAudio) {
        ytDlpArgs.push('-x', '--audio-format', 'mp3');
        if (quality === 'best') ytDlpArgs.push('--audio-quality', '0');
        else if (quality === 'medium') ytDlpArgs.push('--audio-quality', '5');
        else ytDlpArgs.push('--audio-quality', '9');
    } else {
        // Para vídeo, o format selector do yt-dlp é muito poderoso
        if (quality === 'best') ytDlpArgs.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        else if (quality === 'medium') ytDlpArgs.push('-f', 'bv[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b');
        else ytDlpArgs.push('-f', 'bv[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]/b');
    }

    const ytDlp = spawn('yt-dlp', ytDlpArgs);

    const stream = new ReadableStream({
        start(controller) {
            ytDlp.stdout.on('data', (chunk) => controller.enqueue(chunk));
            ytDlp.stdout.on('end', () => controller.close());
            ytDlp.stderr.on('data', (data) => console.error(`yt-dlp stderr: ${data}`));
            ytDlp.on('error', (err) => controller.error(err));
        },
        cancel() {
            ytDlp.kill();
        }
    });

    return new Response(stream, { headers });
}
