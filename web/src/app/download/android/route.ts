import { NextResponse } from 'next/server';

export async function GET() {
  const customUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL;
  if (customUrl) {
    return NextResponse.redirect(customUrl, 302);
  }

  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  if (owner && repo) {
    return NextResponse.redirect(
      `https://github.com/${owner}/${repo}/releases/latest/download/notes-by-winner.apk`,
      302
    );
  }

  return NextResponse.json(
    { error: 'APK download URL is not configured in environment variables.' },
    { status: 404 }
  );
}
