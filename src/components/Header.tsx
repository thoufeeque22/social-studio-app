'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();

  const handleCreateClick = () => {
    if (pathname === '/') {
      const element = document.getElementById('create-post-section');
      element?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#create-post-section');
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.search}>
        <span className={styles.searchIcon}>🔍</span>
        <input 
          type="text" 
          placeholder="Search posts, media, or analytics..." 
          className={styles.searchInput}
        />
      </div>

      <div className={styles.actions}>
        <button className={styles.notificationBtn}>
          🔔
          <span className={styles.badge}></span>
        </button>
        <button className={styles.createBtn} onClick={handleCreateClick}>
          <span className={styles.btnPlus}>+</span>
          Create Post
        </button>
      </div>
    </header>
  );
};

export default Header;
