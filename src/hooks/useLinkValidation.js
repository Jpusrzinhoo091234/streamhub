'use client';

import { useState, useCallback } from 'react';

export function useLinkValidation() {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState({
        isLoading: false,
        isValid: null,
        platform: null,
        metadata: null,
        entries: [],
        isPlaylist: false,
        message: ''
    });

    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback((ids, force) => {
        setSelectedIds(prev => {
            if (force === false || (force === undefined && prev.size === ids.length)) return new Set();
            return new Set(ids);
        });
    }, []);

    const validate = useCallback(async (inputUrl) => {
        if (!inputUrl.trim()) {
            setStatus({ isLoading: false, isValid: null, platform: null, metadata: null, entries: [], isPlaylist: false, message: '' });
            setSelectedIds(new Set());
            return;
        }

        setStatus(prev => ({ ...prev, isLoading: true }));

        try {
            const response = await fetch('/api/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: inputUrl })
            });

            const data = await response.json();

            setStatus({
                isLoading: false,
                isValid: data.isValid,
                platform: data.platform || null,
                metadata: data.metadata || null,
                entries: data.entries || [],
                isPlaylist: data.isPlaylist || false,
                message: data.isValid ? `✓ ${data.isPlaylist ? 'Playlist' : 'Link'} pronto!` : (data.message || 'Link inválido')
            });

            // Auto-select all by default
            if (data.entries) {
                setSelectedIds(new Set(data.entries.map(e => e.id)));
            }
        } catch (error) {
            setStatus({
                isLoading: false,
                isValid: false,
                platform: null,
                metadata: null,
                entries: [],
                isPlaylist: false,
                message: 'Erro ao validar link.'
            });
        }
    }, []);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setUrl(newValue);

        // Simples debounce manual para evitar multiplas chamadas
        if (window.validationTimeout) clearTimeout(window.validationTimeout);
        window.validationTimeout = setTimeout(() => {
            validate(newValue);
        }, 500);
    };

    return { url, status, setStatus, handleChange, selectedIds, toggleSelect, toggleSelectAll };
}
