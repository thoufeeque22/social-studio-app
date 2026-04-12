import React from 'react';
import styles from './Header.module.css';

const Header = () => {
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
        <button className={styles.createBtn}>
          <span className={styles.btnPlus}>+</span>
          Create Post
        </button>
      </div>
    </header>
  );
};

export default Header;
