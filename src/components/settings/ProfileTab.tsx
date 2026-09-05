'use client';

import React from 'react';
import useSWR from 'swr';
import { CircularProgress } from '@mui/material';
import { getUserProfileAction } from '@/lib/actions/settings-profile';
import { ProfileForm } from './ProfileForm';

const fetcher = async () => {
  try {
    const res = await getUserProfileAction();
    if (!res.success) return null;
    return res.user;
  } catch {
    return null;
  }
};

export const ProfileTab = () => {
  const { data: user, isLoading, mutate } = useSWR('userProfile', fetcher);

  if (isLoading) return <CircularProgress />;
  if (!user) return null;

  return <ProfileForm user={user} mutate={mutate} key={user.email || 'profile'} />;
};
