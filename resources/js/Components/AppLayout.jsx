import { Link, usePage } from '@inertiajs/react';
import {
  LayoutDashboard,
  Router,
  ListTodo,
  Settings2,
  FileBox,
  LogOut,
  Menu,
  X,
  Radio,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import Logo from './Logo';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Devices', href: '/devices', icon: Router },
  { name: 'Tasks', href: '/tasks', icon: ListTodo },
  { name: 'Faults', href: '/faults', icon: AlertTriangle },
  { name: 'Presets', href: '/presets', icon: Settings2 },
  { name: 'Files', href: '/files', icon: FileBox },
];

const adminNavigation = [{ name: 'Users', href: '/users', icon: Users }];

export default function AppLayout({ children, title, actions }) {
  const { auth, app } = usePage().props;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const navItems = auth?.canManage ? [...navigation, ...adminNavigation] : navigation;

  return (
    <div className="min-h-screen bg-zinc-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[13.5rem] flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-300 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-zinc-800/80 px-3">
          <Logo className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">MyACS</p>
            <p className="truncate text-[10px] text-zinc-500">TeslaTech · TR-069</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-brand-600/90 text-white shadow-sm shadow-brand-900/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-zinc-800/80 p-2">
          <div className="mb-1.5 rounded-md bg-zinc-900/80 px-2 py-1.5">
            <p className="truncate text-xs font-medium text-zinc-200">{auth?.user?.name}</p>
            <p className="truncate text-[10px] text-zinc-500">
              {auth?.user?.email}
              {auth?.user?.role ? ` · ${auth.user.role}` : ''}
            </p>
          </div>
          <Link
            href="/logout"
            method="post"
            as="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[13.5rem]">
        <header className="sticky top-0 z-30 flex h-10 items-center gap-2 border-b border-zinc-200/80 bg-white/90 px-3 backdrop-blur-md lg:px-4">
          <button
            type="button"
            className="rounded-md p-1 text-zinc-600 hover:bg-zinc-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-900">{title}</h1>
          {actions && <div className="ml-2 flex items-center gap-1.5">{actions}</div>}
          <div className="ml-auto flex items-center gap-2">
            {app?.mode === 'dual' ? (
              <>
                <span className="hidden items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-500/20 sm:inline-flex">
                  Dual ACS
                </span>
                <span className="hidden items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 sm:inline-flex">
                  <Radio className="h-2.5 w-2.5" />
                  MyACS CWMP
                </span>
              </>
            ) : app?.mode === 'genieacs-panel' ? (
              <span className="hidden items-center gap-1 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-500/20 sm:inline-flex">
                GenieACS Panel
              </span>
            ) : app?.cwmpEnabled ? (
              <span className="hidden items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 sm:inline-flex">
                <Radio className="h-2.5 w-2.5" />
                ACS Live
              </span>
            ) : null}
            <span className="hidden font-mono text-[10px] text-zinc-400 md:inline">
              {app?.url?.replace(/^https?:\/\//, '')}
            </span>
          </div>
        </header>

        <main className="p-2 lg:p-3">{children}</main>
      </div>
    </div>
  );
}
