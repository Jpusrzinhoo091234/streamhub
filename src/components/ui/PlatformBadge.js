import styles from '@/styles/modules/Card.module.css';
import PlatformIcon from './PlatformIcon';

export default function PlatformBadge({ platform, isValid }) {
    if (!platform && isValid === null) return null;

    if (isValid === false) {
        return (
            <div className={`${styles.badge} ${styles.badgeInvalid}`}>
                <span className={styles.badgeDot}></span>
                Link Inválido
            </div>
        );
    }

    if (platform) {
        return (
            <div
                className={styles.badge}
                style={{
                    backgroundColor: `${platform.color}15`,
                    borderColor: `${platform.color}40`,
                    color: platform.color
                }}
            >
                <div className={styles.badgeIconWrapper}>
                    <PlatformIcon platformId={platform.id} />
                </div>
                {platform.name} Detectado
            </div>
        );
    }

    return null;
}
