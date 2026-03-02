import styles from '@/styles/modules/Card.module.css';

export default function IconWrapper({ color, children }) {
    return (
        <div
            className={styles.iconWrapper}
            style={{
                color: color || 'rgba(235, 235, 245, 0.6)',
                borderColor: color ? `${color}30` : undefined,
                boxShadow: color
                    ? `0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 0 20px 0 ${color}25`
                    : '0 0 0 0.5px rgba(255,255,255,0.04) inset',
            }}
        >
            {children}
        </div>
    );
}

