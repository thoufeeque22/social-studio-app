import React from 'react';
import styles from './Footer.module.css';
import { BRAND } from '@/lib/core/brand';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '/#features' },
        { label: 'Roadmap', href: '#' },
        { label: 'Changelog', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Documentation', href: '#' },
        { label: 'Status', href: '/status' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '#' },
        { label: 'Terms', href: '#' },
        { label: 'Cookie Policy', href: '#' },
      ],
    },
  ];

  return (
    <footer className={styles.globalFooter}>
      <div className={styles.footerGrid}>
        {columns.map((column, idx) => (
          <div key={idx} className={styles.footerColumn}>
            <h4 className={styles.footerLabel}>{column.title}</h4>
            <ul className={styles.footerLinks}>
              {column.links.map((link, linkIdx) => (
                <li key={linkIdx}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.footerBottom}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <p>© {new Date().getFullYear()} {BRAND.legal.copyrightOwner}. All rights reserved.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, fontSize: '0.875rem' }}>
            <span>🛡️ Privacy-First / Zero Tracking Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
