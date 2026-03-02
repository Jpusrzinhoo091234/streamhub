'use client';

import { useState, useEffect } from 'react';
import { useLinkValidation } from '@/hooks/useLinkValidation';
import IconWrapper from '@/components/ui/IconWrapper';
import Input from '@/components/ui/Input';
import PlatformBadge from '@/components/ui/PlatformBadge';
import PlatformIcon from '@/components/ui/PlatformIcon';
import styles from '@/styles/modules/Card.module.css';
import Image from 'next/image';
import Skeleton from '@/components/ui/Skeleton';

export default function LinkValidatorCard() {
    const { url, status, setStatus, handleChange, selectedIds, toggleSelect, toggleSelectAll } = useLinkValidation();
    const [format, setFormat] = useState('mp3');
    const [quality, setQuality] = useState('best');
    const [imgLoading, setImgLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [folderTip, setFolderTip] = useState(false);
    const [downloadMode, setDownloadMode] = useState('zip'); // 'zip' | 'individual'

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset loading state when entry changes
    useEffect(() => {
        setImgLoading(true);
    }, [status.entries]);

    // Mostrar dica de pasta quando detectar conteúdo válido
    useEffect(() => {
        if (status.isValid && status.entries.length > 0) {
            setFolderTip(true);
        } else {
            setFolderTip(false);
        }
    }, [status.isValid, status.entries.length]);

    const handleDownload = (singleEntry) => {
        const entry = singleEntry || (status.entries.length === 1 ? status.entries[0] : null);
        if (entry && entry.signature) {
            const downloadUrl = `/api/download?url=${encodeURIComponent(entry.url)}&title=${encodeURIComponent(entry.title || 'audio')}&format=${format}&quality=${quality}&signature=${entry.signature}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${entry.title}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleBatchDownload = async () => {
        const selectedEntries = status.entries.filter(e => selectedIds.has(e.id));
        if (selectedEntries.length === 0) return;

        try {
            setStatus(prev => ({ ...prev, isLoading: true, message: 'Preparando seu ZIP... Aguarde.' }));

            const response = await fetch('/api/batch-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: selectedEntries.map(e => ({
                        url: e.url,
                        title: e.title,
                        signature: e.signature
                    })),
                    format: format,
                    quality: quality
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = folderName.trim() || 'Playlist-StreamHub';
                a.download = `${safeName}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                setStatus(prev => ({ ...prev, isLoading: false, message: '✓ Download concluído!' }));
            } else {
                throw new Error('Falha ao gerar ZIP');
            }
        } catch (error) {
            console.error('Batch download error:', error);
            setStatus(prev => ({ ...prev, isLoading: false, message: 'Erro ao gerar ZIP.' }));
        }
    };

    const handleIndividualDownload = async () => {
        const selectedEntries = status.entries.filter(e => selectedIds.has(e.id));
        if (selectedEntries.length === 0) return;

        setStatus(prev => ({ ...prev, isLoading: true, message: `Baixando 0 de ${selectedEntries.length}...` }));

        for (let i = 0; i < selectedEntries.length; i++) {
            const entry = selectedEntries[i];
            setStatus(prev => ({ ...prev, message: `Baixando ${i + 1} de ${selectedEntries.length}: ${entry.title}` }));

            const downloadUrl = `/api/download?url=${encodeURIComponent(entry.url)}&title=${encodeURIComponent(entry.title || 'audio')}&format=${format}&quality=${quality}&signature=${entry.signature}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${entry.title}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Pequeno delay para o browser processar o download antes do próximo
            if (i < selectedEntries.length - 1) {
                await new Promise(r => setTimeout(r, 1200));
            }
        }

        setStatus(prev => ({ ...prev, isLoading: false, message: `✓ ${selectedEntries.length} arquivo(s) baixado(s)!` }));
    };

    if (!mounted) return null;

    const hasPlaylist = status.entries.length > 1;

    return (
        <div className={`${styles.card} ${status.isLoading ? styles.cardLoading : ''}`}>
            <IconWrapper color={status.platform?.color}>
                <div className={styles.iconContainer}>
                    <PlatformIcon platformId={status.platform?.id} />
                </div>
            </IconWrapper>

            <div className={styles.header}>
                <h1 className={styles.title}>Streaming Hub</h1>
                <p className={styles.subtitle}>
                    {hasPlaylist ? `${status.entries.length} faixas detectadas.` : 'Baixe em diversos formatos e qualidades instantaneamente.'}
                </p>
            </div>

            <PlatformBadge platform={status.platform} isValid={status.isValid} />

            <div className={styles.inputSection}>
                <Input
                    value={url}
                    onChange={handleChange}
                    placeholder="Cole o link ou playlist aqui..."
                    platformColor={status.platform?.color}
                    disabled={status.isLoading}
                />
            </div>

            {/* Dica de organizar em pastas */}
            {folderTip && (
                <div className={styles.folderTip}>
                    <div className={styles.folderTipIcon}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div className={styles.folderTipText}>
                        <span className={styles.folderTipTitle}>Dica de organização</span>
                        <span className={styles.folderTipDesc}>Crie uma pasta no seu computador (ex: <strong>Músicas</strong>) e salve seus downloads lá para manter tudo organizado.</span>
                    </div>
                    <button className={styles.folderTipClose} onClick={() => setFolderTip(false)} aria-label="Fechar dica">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            )}

            {status.isValid && status.entries.length > 0 && (
                <>
                    {hasPlaylist && (
                        <button
                            className={styles.manageBtn}
                            onClick={() => setIsModalOpen(true)}
                            disabled={status.isLoading}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                            Gerenciar Playlist ({selectedIds.size} selecionadas)
                        </button>
                    )}

                    {!hasPlaylist && status.entries[0] && (
                        <div className={styles.metadataPreview}>
                            <div className={styles.thumbnailWrapper}>
                                {imgLoading && <Skeleton width="80px" height="80px" borderRadius="12px" />}
                                <Image
                                    src={status.entries[0].thumbnail}
                                    alt="Preview"
                                    width={80}
                                    height={80}
                                    className={`${styles.thumbnail} ${imgLoading ? styles.hidden : ''}`}
                                    onLoadingComplete={() => setImgLoading(false)}
                                    onError={() => setImgLoading(false)}
                                    priority
                                />
                            </div>
                            <div className={styles.info}>
                                <h3 className={styles.videoTitle}>{status.entries[0].title}</h3>
                                <p className={styles.uploader}>{status.entries[0].uploader} • {status.entries[0].duration}</p>
                            </div>
                        </div>
                    )}

                    <div className={styles.optionsSection}>
                        <div className={styles.optionGroup}>
                            <label>Formato</label>
                            <div className={styles.selector}>
                                <button
                                    className={format === 'mp3' ? styles.active : ''}
                                    onClick={() => setFormat('mp3')}
                                    disabled={status.isLoading}
                                >
                                    MP3
                                </button>
                                <button
                                    className={format === 'mp4' ? styles.active : ''}
                                    onClick={() => setFormat('mp4')}
                                    disabled={status.isLoading}
                                >
                                    MP4
                                </button>
                            </div>
                        </div>
                        <div className={styles.optionGroup}>
                            <label>Qualidade</label>
                            <div className={styles.selector}>
                                <button
                                    className={quality === 'best' ? styles.active : ''}
                                    onClick={() => setQuality('best')}
                                    disabled={status.isLoading}
                                >
                                    Alta
                                </button>
                                <button
                                    className={quality === 'medium' ? styles.active : ''}
                                    onClick={() => setQuality('medium')}
                                    disabled={status.isLoading}
                                >
                                    Média
                                </button>
                                <button
                                    className={quality === 'worst' ? styles.active : ''}
                                    onClick={() => setQuality('worst')}
                                    disabled={status.isLoading}
                                >
                                    Baixa
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className={styles.messageContainer}>
                {status.isLoading && <div className={styles.loader}></div>}
                {!status.isLoading && status.message && (
                    <p
                        className={`${styles.message} ${status.isValid ? styles.valid : styles.invalid}`}
                        style={{ color: status.platform?.color }}
                    >
                        {status.message}
                    </p>
                )}
            </div>

            {/* Botão de Download — separado, bem visível */}
            {status.isValid && selectedIds.size > 0 && !status.isLoading && (
                <button
                    onClick={hasPlaylist
                        ? (downloadMode === 'zip' ? handleBatchDownload : handleIndividualDownload)
                        : () => handleDownload()
                    }
                    className={styles.downloadBtnFull}
                    style={{ backgroundColor: status.platform?.color }}
                    disabled={status.isLoading}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    {hasPlaylist ? `Baixar Seleção (${selectedIds.size})` : 'Iniciar Download'}
                </button>
            )}

            {status.isLoading && (
                <div className={styles.downloadingRow}>
                    <div className={styles.loader} style={{ width: '14px', height: '14px' }}></div>
                    <span>Processando...</span>
                </div>
            )}


            {/* Track Selection Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Selecionar Faixas</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.playlistHeader}>
                                <span>{selectedIds.size} selecionado(s)</span>
                                <button
                                    onClick={() => toggleSelectAll(status.entries.map(e => e.id))}
                                    className={styles.selectAllBtn}
                                >
                                    {selectedIds.size === status.entries.length ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
                                </button>
                            </div>
                            <div className={styles.trackList}>
                                {status.entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`${styles.trackItem} ${selectedIds.has(entry.id) ? styles.selected : ''}`}
                                        onClick={() => toggleSelect(entry.id)}
                                    >
                                        <div className={styles.checkbox}>
                                            {selectedIds.has(entry.id) && <div className={styles.checkInner} />}
                                        </div>
                                        <div className={styles.trackThumbWrapper}>
                                            <Image
                                                src={entry.thumbnail}
                                                alt=""
                                                width={48}
                                                height={48}
                                                className={styles.trackThumb}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className={styles.trackInfo}>
                                            <p className={styles.trackTitle}>{entry.title}</p>
                                            <p className={styles.trackMeta}>{entry.uploader} • {entry.duration}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            {/* Toggle: ZIP vs Individual */}
                            <div className={styles.downloadModeGroup}>
                                <label className={styles.folderNameLabel}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="8 17 12 21 16 17"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="21"></line>
                                    </svg>
                                    Modo de download
                                </label>
                                <div className={styles.selector}>
                                    <button
                                        className={downloadMode === 'zip' ? styles.active : ''}
                                        onClick={() => setDownloadMode('zip')}
                                    >
                                        🗂️ ZIP
                                    </button>
                                    <button
                                        className={downloadMode === 'individual' ? styles.active : ''}
                                        onClick={() => setDownloadMode('individual')}
                                    >
                                        💾 Individual
                                    </button>
                                </div>
                            </div>

                            {/* Campo de nome do ZIP — só no modo ZIP */}
                            {downloadMode === 'zip' && (
                                <div className={styles.folderNameField}>
                                    <label className={styles.folderNameLabel}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Nome do arquivo ZIP
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.folderNameInput}
                                        placeholder="Ex: Playlist Favoritas"
                                        value={folderName}
                                        onChange={e => setFolderName(e.target.value)}
                                        maxLength={60}
                                    />
                                </div>
                            )}

                            {downloadMode === 'individual' && (
                                <p className={styles.modeHint}>
                                    Cada música será baixada separadamente no seu computador.
                                </p>
                            )}

                            <button
                                className={styles.downloadBtn}
                                style={{ width: '100%', backgroundColor: status.platform?.color || '#0a84ff' }}
                                onClick={() => setIsModalOpen(false)}
                            >
                                {downloadMode === 'zip'
                                    ? `Confirmar — ZIP (${selectedIds.size})`
                                    : `Confirmar — Individual (${selectedIds.size})`
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
