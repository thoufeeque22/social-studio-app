import React from 'react';
import { Session } from 'next-auth';
import { Heading } from '@/components/ui/Heading';

interface DashboardHeaderProps {
  session: Session | null;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ session }) => {
  return (
    <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Heading level={1}>Dashboard Overview</Heading>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>
          {session ? `Welcome back, ${session.user?.name}.` : "Welcome to Social Studio. Connect your account to get started."}
        </p>
      </div>
    </header>
  );
};
