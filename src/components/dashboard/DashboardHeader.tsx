import React from 'react';
import { Session } from 'next-auth';

interface DashboardHeaderProps {
  session: Session | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ session }) => {
  return (
    <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          {session ? `Welcome back, ${session.user?.name}.` : "Welcome to Social Studio. Connect your account to get started."}
        </p>
      </div>
    </header>
  );
};
