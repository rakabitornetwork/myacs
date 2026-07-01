import { Head, useForm } from '@inertiajs/react';
import { LogIn, Shield } from 'lucide-react';
import Logo from '@/Components/Logo';

export default function Login({ errors = {}, status }) {
  const { data, setData, post, processing } = useForm({
    email: '',
    password: '',
  });

  const submit = (e) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <>
      <Head title="Login" />
      <div className="flex min-h-screen bg-zinc-950">
        <div className="relative hidden w-[44%] overflow-hidden lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(51,102,255,0.35),transparent)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative flex flex-1 flex-col justify-between p-8">
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8" />
              <div>
                <p className="text-sm font-semibold text-white">MyACS</p>
                <p className="text-[11px] text-zinc-500">TR-069 Auto Configuration Server</p>
              </div>
            </div>

            <div className="max-w-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400">
                TeslaTech Platform
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-white">
                Enterprise ACS untuk manajemen CPE skala besar
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                Provisioning, monitoring, firmware push, dan remote management perangkat TR-069
                dalam satu panel terpusat.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {['CWMP 1.0', 'Task Queue', 'Presets', 'Multi-device'].map((f) => (
                  <div
                    key={f}
                    className="rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 text-[11px] text-zinc-400"
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <p className="font-mono text-[10px] text-zinc-600">myacs.teslatech.my.id</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center bg-zinc-50 px-5 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 flex items-center gap-2 lg:hidden">
              <Logo className="h-7 w-7" />
              <div>
                <p className="text-sm font-semibold text-zinc-900">MyACS</p>
                <p className="text-[10px] text-zinc-500">TeslaTech TR-069</p>
              </div>
            </div>

            <div className="ui-panel p-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/10 text-brand-600">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-zinc-900">Sign in</h1>
                  <p className="text-[11px] text-zinc-500">Akses panel administrasi ACS</p>
                </div>
              </div>

              {status && (
                <div className="mb-3 rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 ring-1 ring-emerald-500/20">
                  {status}
                </div>
              )}

              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label htmlFor="email" className="mb-1 block text-[11px] font-medium text-zinc-600">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                    className="ui-input"
                    placeholder="amon@teslatech.my.id"
                    autoComplete="email"
                  />
                  {errors.email && <p className="mt-1 text-[11px] text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1 block text-[11px] font-medium text-zinc-600">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className="ui-input"
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <p className="mt-1 text-[11px] text-red-600">{errors.password}</p>
                  )}
                </div>

                <button type="submit" disabled={processing} className="ui-btn-primary w-full py-2">
                  <LogIn className="h-3.5 w-3.5" />
                  {processing ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
