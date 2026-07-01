import { Head, Link } from '@inertiajs/react';
import Logo from '@/Components/Logo';

export default function Error({ status = 404, message = 'Halaman tidak ditemukan' }) {
  return (
    <>
      <Head title={`Error ${status}`} />
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4">
        <Logo className="mb-4 h-10 w-10" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Error</p>
        <h1 className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">
          {status}
        </h1>
        <p className="mt-1.5 text-xs text-zinc-500">{message}</p>
        <Link href="/dashboard" className="ui-btn-primary mt-4">
          Kembali ke Dashboard
        </Link>
      </div>
    </>
  );
}
