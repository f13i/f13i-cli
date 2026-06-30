// Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing, so the
// first-run experience is a clear checklist instead of a blank crash.
export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-6">
      <div className="w-full max-w-lg rounded-xl border border-edge bg-surface-1 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange" />
          <h1 className="text-base font-semibold text-neutral-100">
            The Deal Room — almost there
          </h1>
        </div>
        <p className="text-sm text-neutral-400">
          Connect a Supabase project to start tracking content:
        </p>
        <ol className="mt-4 space-y-2 text-sm text-neutral-300">
          <li>
            <span className="mr-2 text-orange">1.</span>Create a free project at{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-orange-soft underline"
            >
              supabase.com
            </a>
          </li>
          <li>
            <span className="mr-2 text-orange">2.</span>Run{' '}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
              supabase/schema.sql
            </code>{' '}
            in the SQL editor
          </li>
          <li>
            <span className="mr-2 text-orange">3.</span>Copy{' '}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
              .env.example
            </code>{' '}
            to{' '}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
              .env
            </code>{' '}
            and paste your project URL + anon key
          </li>
          <li>
            <span className="mr-2 text-orange">4.</span>Restart{' '}
            <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
              npm run dev
            </code>
          </li>
        </ol>
      </div>
    </div>
  )
}
