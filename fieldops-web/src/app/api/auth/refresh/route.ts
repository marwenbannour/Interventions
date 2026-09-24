import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendFetch, REFRESH_COOKIE } from '@/lib/api/backend';

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'Aucune session' }, { status: 401 });
  }

  const res = await backendFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  const data = await res.json();

  if (!res.ok) {
    const response = NextResponse.json(data, { status: res.status });
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const response = NextResponse.json({ accessToken: data.accessToken, expiresIn: data.expiresIn });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
