import React from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', icon: '📊', path: '/' },
    { name: 'Media Gallery', icon: '🖼️', path: '/media' },
    { name: 'Schedule', icon: '📅', path: '/schedule' },
    { name: 'Analytics', icon: '📈', path: '/analytics' },
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

      <div className={styles.userProfile}>
        <div className={styles.avatar}>T</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Thoufeeque</span>
          <span className={styles.userRole}>Admin</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
