import { apiFetch } from '@/lib/api';
import { ProfileClient } from './profile-client';

export interface Me {
  id: string;
  name: string;
  username: string;
  role: string;
  position: string;
  assoc?: string;
  avatarUrl?: string;
  status: string;
  lastActive: string;
}

export default async function ProfilePage() {
  const me = await apiFetch<Me>('/auth/me');
  return <ProfileClient me={me} />;
}
