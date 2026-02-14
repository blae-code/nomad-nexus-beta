import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicUpdateBySlug } from '@/components/nexus-os';

/**
 * Public outreach landing page for sanitized coalition updates.
 * This route is intentionally unauthenticated and only serves published PUBLIC entries.
 */
export default function PublicUpdate() {
  const { slug = '' } = useParams();
  const update = getPublicUpdateBySlug(slug);

  if (!update) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
          <h1 className="text-lg font-semibold uppercase tracking-wide">Public Update Unavailable</h1>
          <p className="text-sm text-zinc-400">
            This update does not exist, is unpublished, or is not public-facing.
          </p>
          <Link to="/AccessGate" className="text-sm text-orange-300 hover:text-orange-200">
            Return to Access Gate
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-10">
      <article className="mx-auto w-full max-w-3xl rounded border border-zinc-800 bg-zinc-900/55 p-6 space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold uppercase tracking-wide">{update.title}</h1>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Public Coalition Update | Org {update.orgId} | Published {update.publishedAt || 'unknown'}
          </p>
        </header>
        <section className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{update.body}</section>
        <footer className="pt-2 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
          <div>Classification: {update.classification}</div>
          <div>Audience: {update.audience}</div>
          <div>Source refs: {update.sourceRefs.length}</div>
          <Link to="/AccessGate" className="inline-block text-orange-300 hover:text-orange-200">
            Nomad Nexus Access
          </Link>
        </footer>
      </article>
    </main>
  );
}
