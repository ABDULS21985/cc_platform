'use client';

import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api';

export interface CurrentUserData {
  id?: number;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  full_name?: string | null;
  profile_photo?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

let cachedUser: CurrentUserData | null | undefined;
let inFlight: Promise<CurrentUserData | null> | null = null;

async function loadCurrentUser(): Promise<CurrentUserData | null> {
  if (cachedUser !== undefined) return cachedUser;
  if (inFlight) return inFlight;

  inFlight = ApiService.profile
    .get()
    .then((res) => {
      cachedUser = (res.data?.data ?? null) as unknown as CurrentUserData | null;
      return cachedUser;
    })
    .catch(() => {
      return null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export default function useUserData() {
  const [user, setUser] = useState<CurrentUserData | null>(
    cachedUser === undefined ? null : cachedUser,
  );

  useEffect(() => {
    let cancelled = false;
    loadCurrentUser().then((nextUser) => {
      if (!cancelled) setUser(nextUser);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
