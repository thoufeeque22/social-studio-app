'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/supabase/next-auth-react-shim';
import styles from './Header.module.css';
import { WhatsNewBadge } from '../WhatsNew/WhatsNewBadge';
import { UserActions } from './UserActions';
import { RefreshButton } from './RefreshButton';
import { ThemeToggle } from './ThemeToggle';
import { TimeIndicator } from './TimeIndicator';

export const Header = ({ onToggleSidebar, tierName }: { onToggleSidebar: () => void, tierName?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const targetPage = pathname.startsWith('/media') ? '/media' : '/activity';
      router.push(`${targetPage}?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className={styles.header}>
      <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menu">☰</button>
      <div className={styles.search}>
        <input
          id="header-search"
          type="text"
          placeholder="Search..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>
      <div className={styles.actions}>
        <TimeIndicator />
        <ThemeToggle />
        <RefreshButton />
        <WhatsNewBadge />
        <UserActions session={session} tierName={tierName} />
      </div>
    </header>
  );
};


