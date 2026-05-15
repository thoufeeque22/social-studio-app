'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './Header.module.css';

const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const targetPage = pathname.startsWith('/media') ? '/media' : '/history';
      router.push(`${targetPage}?search=${encodeURIComponent(searchQuery)}`);
    }
  };

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
        <span className={styles.searchIcon}></span>
        <label htmlFor="header-search" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          Search posts, media, or analytics
        </label>
        <input
          id="header-search"
          type="text"
          placeholder="Search posts, media, or analytics..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />      </div>

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
