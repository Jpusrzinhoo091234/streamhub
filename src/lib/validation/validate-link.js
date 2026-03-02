import { PLATFORMS } from './regex-patterns';

/**
 * Valida um link contra as plataformas suportadas.
 * @param {string} url - A URL para validar.
 * @returns {object|null} O objeto da plataforma se válido, ou null.
 */
export function validateLink(url) {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;

    for (const key in PLATFORMS) {
        if (PLATFORMS[key].regex.test(trimmedUrl)) {
            return PLATFORMS[key];
        }
    }

    return null;
}
