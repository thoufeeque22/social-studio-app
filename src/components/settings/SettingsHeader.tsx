import React from 'react';
import styles from '@/app/settings/Settings.module.css';

interface SettingsHeaderProps {
  title: string;
  subtitle: string;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ title, subtitle }) => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  );
};
