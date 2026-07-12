import { apiFetch, ApiError } from '@/lib/api';
import type { HomeContent } from '@/lib/types';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  let siteName = 'Thôn Đoàn Kết';
  let logoUrl = '/logo.png';
  try {
    const content = await apiFetch<HomeContent>('/home-content', { auth: false });
    siteName = content.siteName || siteName;
    logoUrl = content.logoUrl || logoUrl;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  return <LoginForm siteName={siteName} logoUrl={logoUrl} />;
}
