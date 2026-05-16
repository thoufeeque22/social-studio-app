'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './Sidebar.module.css';

import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MapIcon from '@mui/icons-material/Map';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import InsightsIcon from '@mui/icons-material/Insights';

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { data: session } = useSession();
  const menuItems = [
    { name: 'Dashboard', icon: <DashboardIcon sx={{ fontSize: 20 }} />, path: '/' },
    { name: 'Schedule', icon: <CalendarMonthIcon sx={{ fontSize: 20 }} />, path: '/schedule' },
    { name: 'Media Gallery', icon: <PermMediaIcon sx={{ fontSize: 20 }} />, path: '/media' },
    { name: 'Activity Hub', icon: <FlashOnIcon sx={{ fontSize: 20 }} />, path: '/history' },
    ...(process.env.NODE_ENV !== 'production' ? [
      { name: 'Roadmap', icon: <MapIcon sx={{ fontSize: 20 }} />, path: '/roadmap' },
      { name: 'Launch', icon: <RocketLaunchIcon sx={{ fontSize: 20 }} />, path: '/launch' },
    ] : []),
    ...(session?.user?.role === 'ADMIN' ? [
      { name: 'Analytics', icon: <InsightsIcon sx={{ fontSize: 20 }} />, path: '/admin/analytics' },
    ] : []),
    { name: 'Settings', icon: <SettingsIcon sx={{ fontSize: 20 }} />, path: '/settings' },
  ];

  return (
    <>
      <div 
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} 
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <Link href="/" className={styles.logo} onClick={onClose}>
          <div className={styles.logoIcon}>
            <AutoAwesomeIcon sx={{ fontSize: 24, color: 'hsl(var(--primary))' }} />
          </div>
          <span className={styles.logoText}>SocialStudio</span>
          <button className={styles.closeButton} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </Link>

      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <Link 
            href={item.path} 
            key={item.name} 
            className={styles.navItem}
            onClick={onClose}
          >
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
    </>
  );
};

export default Sidebar;
