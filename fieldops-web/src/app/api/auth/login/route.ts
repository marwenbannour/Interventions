import { NextResponse } from 'next/server';
import { backendFetch, REFRESH_COOKIE } from '@/lib/api/backend';

export async function POST(request: Request) {
  const body = await request.json();
  const res = await backendFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  if (data.mfaRequired) {
    return NextResponse.json({ mfaRequired: true, mfaToken: data.mfaToken, channel: data.channel });
  }

  const response = NextResponse.json({ accessToken: data.accessToken, expiresIn: data.expiresIn, user: data.user });
  response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
