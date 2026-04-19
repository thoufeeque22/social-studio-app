'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const { data: session } = useSession();
  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/' },
    { name: 'Schedule', icon: '📅', path: '/schedule' },
    { name: 'History', icon: '📜', path: '/history' },
    { name: 'Media Gallery', icon: '🖼️', path: '/media' },
    // { name: 'Analytics', icon: '📈', path: '/analytics' },
    { name: 'Settings', icon: '⚙️', path: '/settings' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>✨</div>
        <span className={styles.logoText}>SocialStudio</span>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <Link href={item.path} key={item.name} className={styles.navItem}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.name}>{item.name}</span>
          </Link>
        ))}
      </nav>

      {session?.user && (
        <div className={styles.userProfile}>
          {session.user.image ? (
            <img src={session.user.image} alt="User" className={styles.avatar} style={{ objectFit: 'cover' }} />
          ) : (
            <div className={styles.avatar}>{session.user.name?.charAt(0) || 'U'}</div>
          )}
          <div className={styles.userInfo}>
            <span className={styles.userName}>{session.user.name}</span>
            <span className={styles.userRole}>Creator Account</span>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
