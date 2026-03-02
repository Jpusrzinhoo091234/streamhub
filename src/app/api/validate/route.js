import { validateLink } from '@/lib/validation/validate-link';
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import crypto from 'crypto';
import spotifyInfo from 'spotify-url-info';

// Inicializa spotify-url-info sem passar fetch explicitamente para evitar o erro 'realFetch.call'
// O Next.js já fornece o fetch global corretamente.
const spotify = spotifyInfo(fetch);
const { getTracks, getData } = spotify;

// Cache simples em memória com limpeza periódica
let validationCache = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutos

// Limpeza de cache para evitar vazamento de memória
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of validationCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) validationCache.delete(key);
    }
}, 1000 * 60 * 5); // Limpa a cada 5 minutos

export async function POST(request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 });
        }

        // Verifica cache
        if (validationCache.has(url)) {
            const cached = validationCache.get(url);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                return NextResponse.json(cached.data);
            }
        }

        const platform = validateLink(url);

        if (platform) {
            try {
                const secret = process.env.APP_SECRET || 'fallback_secret';
                let entries = [];
                let info = {};

                // Caso especial: Spotify (usando metadata direta para evitar DRM error)
                if (platform.id === 'spotify') {
                    // Normaliza a URL removendo o prefixo de idioma (ex: /intl-pt/)
                    // Algumas bibliotecas de metadados não reconhecem o formato internacional
                    const spotifyUrl = url.replace(/open\.spotify\.com\/intl-[a-z]+\//, 'open.spotify.com/');

                    const tracks = await getTracks(spotifyUrl);
                    const albumData = await getData(spotifyUrl);

                    info = {
                        title: albumData.name || albumData.title || 'Playlist Spotify',
                        uploader: albumData.owner?.display_name || albumData.artist || 'Spotify',
                        thumbnail: albumData.images?.[0]?.url || albumData.coverArt?.sources?.[0]?.url
                    };

                    entries = tracks.map(track => {
                        const trackId = track.id || track.uri?.split(':').pop() || Math.random().toString(36).substr(2, 9);
                        const trackUrl = `https://open.spotify.com/track/${trackId}`;
                        return {
                            id: trackId,
                            title: track.name || track.title || 'Faixa sem título',
                            url: trackUrl,
                            duration: track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${(Math.floor(track.duration_ms / 1000) % 60).toString().padStart(2, '0')}` : 'N/A',
                            uploader: track.artists?.[0]?.name || track.artist || info.uploader,
                            thumbnail: track.album?.images?.[0]?.url || info.thumbnail,
                            signature: crypto.createHmac('sha256', secret).update(trackUrl).digest('hex')
                        };
                    });

                    // Se for uma track única (getTracks retorna array de 1 se for track), tratamos como single
                    // Mas se for playlist ou album, forçamos isPlaylist
                    const isCollection = tracks.length > 1 || spotifyUrl.includes('/playlist/') || spotifyUrl.includes('/album/');

                    const responseData = {
                        isValid: true,
                        isPlaylist: isCollection,
                        platform: { id: platform.id, name: platform.name, color: platform.color },
                        metadata: {
                            title: info.title || 'Link Pronto',
                            uploader: info.uploader || 'Uploader',
                            count: entries.length
                        },
                        entries
                    };

                    validationCache.set(url, { timestamp: Date.now(), data: responseData });
                    return NextResponse.json(responseData);
                } else {
                    // Outras plataformas seguem com yt-dlp
                    // Flags de eficiência para Serverless (Vercel):
                    // --no-cache-dir: evita gravar lixo no disco efêmero
                    // --playlist-items: limita o processamento para não estourar tempo/RAM
                    const strategyArgs = platform.id === 'youtube'
                        ? ['--dump-single-json', '--flat-playlist', '--playlist-items', '1-100', '--no-warnings', '--quiet', '--no-cache-dir']
                        : ['--dump-single-json', '--playlist-items', '1-50', '--no-warnings', '--quiet', '--no-check-certificates', '--no-cache-dir'];

                    const stdout = await new Promise((resolve, reject) => {
                        const child = spawn('yt-dlp', [...strategyArgs, url]);
                        let data = '';
                        const timeout = setTimeout(() => {
                            child.kill();
                            reject(new Error('TIMEOUT'));
                        }, 30000);

                        child.stdout.on('data', (chunk) => { data += chunk; });
                        child.on('close', (code) => {
                            clearTimeout(timeout);
                            if (code === 0) resolve(data);
                            else reject(new Error(`Exit code ${code}`));
                        });
                        child.on('error', (err) => {
                            clearTimeout(timeout);
                            reject(err);
                        });
                    });

                    info = JSON.parse(stdout);
                    const isPlaylist = (info._type === 'playlist' || info._type === 'multi_video' || (info.entries && info.entries.length > 0));

                    if (isPlaylist && info.entries) {
                        entries = info.entries.map(entry => {
                            let entryUrl = entry.url || entry.webpage_url;
                            if (!entryUrl && entry.id) {
                                if (platform.id === 'youtube') entryUrl = `https://www.youtube.com/watch?v=${entry.id}`;
                                else if (platform.id === 'soundcloud') entryUrl = entry.url || url;
                            }

                            const thumbnail = entry.thumbnails?.[entry.thumbnails.length - 1]?.url ||
                                entry.thumbnail ||
                                info.thumbnails?.[info.thumbnails.length - 1]?.url ||
                                info.thumbnail;

                            return {
                                id: entry.id || Math.random().toString(36).substr(2, 9),
                                title: entry.title || entry.name || 'Faixa sem título',
                                url: entryUrl || url,
                                duration: entry.duration_string || (entry.duration ? `${Math.floor(entry.duration / 60)}:${(entry.duration % 60).toString().padStart(2, '0')}` : 'N/A'),
                                uploader: entry.uploader || entry.artist || info.uploader || info.title || 'Desconhecido',
                                thumbnail: thumbnail,
                                signature: crypto.createHmac('sha256', secret).update(entryUrl || url).digest('hex')
                            };
                        });
                    } else {
                        const thumbnail = info.thumbnails?.[info.thumbnails.length - 1]?.url || info.thumbnail;
                        entries = [{
                            id: info.id || 'single',
                            title: info.title,
                            url: url,
                            duration: info.duration_string,
                            uploader: info.uploader || info.webpage_url_domain,
                            thumbnail: thumbnail,
                            signature: crypto.createHmac('sha256', secret).update(url).digest('hex')
                        }];
                    }
                }

                const responseData = {
                    isValid: true,
                    isPlaylist: entries.length > 1,
                    platform: { id: platform.id, name: platform.name, color: platform.color },
                    metadata: {
                        title: info.title || 'Link Pronto',
                        uploader: info.uploader || info.uploader_id || 'Uploader',
                        count: entries.length
                    },
                    entries
                };

                validationCache.set(url, { timestamp: Date.now(), data: responseData });
                return NextResponse.json(responseData);

            } catch (ytError) {
                if (ytError.name === 'AbortError') {
                    return NextResponse.json({ isValid: false, message: 'Tempo esgotado na validação.' });
                }
                console.error('Validation error:', ytError);
                // Mesmo com erro nos metadados, retorna a URL original com assinatura
                // para que o botão de download apareça ao usuário
                const secret = process.env.APP_SECRET || 'fallback_secret';
                const fallbackEntry = [{
                    id: 'fallback',
                    title: 'Download',
                    url: url,
                    duration: 'N/A',
                    uploader: platform.name,
                    thumbnail: '',
                    signature: crypto.createHmac('sha256', secret).update(url).digest('hex')
                }];
                return NextResponse.json({
                    isValid: true,
                    isPlaylist: false,
                    platform: platform,
                    entries: fallbackEntry,
                    message: 'Link pronto! (metadados limitados)'
                });
            }
        }

        return NextResponse.json({
            isValid: false,
            message: 'Link não reconhecido ou plataforma não suportada.'
        });

    } catch (error) {
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}
