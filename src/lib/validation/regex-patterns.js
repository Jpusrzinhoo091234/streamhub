export const PLATFORMS = {
    YOUTUBE: {
        id: 'youtube',
        name: 'YouTube',
        color: '#ef4444',
        regex: /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|playlist\?list=)|youtu\.be\/)[a-zA-Z0-9?&_=-]+/
    },
    SPOTIFY: {
        id: 'spotify',
        name: 'Spotify',
        color: '#1db954',
        regex: /^(https?:\/\/)?open\.spotify\.com\/(?:[\w-]+\/)?(track|album|artist|playlist|episode|show)\/[a-zA-Z0-9?&_=-]+/
    },
    SOUNDCLOUD: {
        id: 'soundcloud',
        name: 'SoundCloud',
        color: '#ff5500',
        regex: /^(https?:\/\/)?(www\.)?soundcloud\.com\/[a-zA-Z0-9?&_=-]+\/(sets\/)?[a-zA-Z0-9?&_=-]+/
    }
};
