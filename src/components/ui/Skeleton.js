import styles from '@/styles/modules/Skeleton.module.css';

export default function Skeleton({ width, height, borderRadius = '8px', className = '' }) {
    return (
        <div
            className={`${styles.skeleton} ${className}`}
            style={{
                width: width || '100%',
                height: height || '100%',
                borderRadius: borderRadius
            }}
        />
    );
}
