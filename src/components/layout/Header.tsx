'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './Header.module.css';

const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

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
      <button className={styles.menuBtn} onClick={onToggleSidebar}>
        ☰
      </button>

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

        {session?.user && (
          <div className={styles.userProfile}>
            {session.user.image ? (
              <img src={session.user.image} alt="User" className={styles.userAvatar} />
            ) : (
              <div className={styles.userAvatar}>
                {session.user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className={styles.userDetails}>
              <span className={styles.userName}>{session.user.name}</span>
              <button 
                className={styles.logoutBtn}
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
