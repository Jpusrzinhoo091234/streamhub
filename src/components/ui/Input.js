import styles from '@/styles/modules/Input.module.css';

export default function Input({ value, onChange, placeholder, platformColor, ...props }) {
    return (
        <div className={styles.inputGroup}>
            <input
                type="text"
                className={styles.input}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    borderColor: platformColor ? `${platformColor}50` : undefined,
                    boxShadow: platformColor
                        ? `0 0 0 0.5px rgba(255,255,255,0.06) inset, 0 0 0 3px ${platformColor}20`
                        : undefined
                }}
                {...props}
            />
        </div>
    );
}

