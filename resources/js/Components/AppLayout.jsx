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
        className={`fixed inset-y-0 left-0 z-50 flex w-[15rem] flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-300 transition-transform md:w-[13.5rem] lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800/80 px-4 md:h-11 md:gap-2.5 md:px-3.5">
          <Logo className="h-7 w-7 shrink-0 md:h-6 md:w-6" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white md:text-[13px]">MyACS</p>
            <p className="truncate text-sm text-zinc-500 md:text-[11px]">TeslaTech · TR-069</p>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5 md:h-3.5 md:w-3.5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 md:space-y-0.5 md:p-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`ui-mobile-nav ${
                  active
                    ? 'bg-brand-600/90 text-white shadow-sm shadow-brand-900/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" strokeWidth={active ? 2.25 : 2} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-zinc-800/80 p-3 md:p-2.5">
          <div className="mb-2 rounded-md bg-zinc-900/80 px-3 py-2.5 md:px-2.5 md:py-2">
            <p className="truncate text-[15px] font-medium text-zinc-200 md:text-[13px]">{auth?.user?.name}</p>
            <p className="truncate text-[11px] text-zinc-500">
              {auth?.user?.email}
              {auth?.user?.role ? ` · ${auth.user.role}` : ''}
            </p>
          </div>
          <Link
            href="/logout"
            method="post"
            as="button"
            className="ui-mobile-nav w-full text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <LogOut className="h-5 w-5 md:h-4 md:w-4" />
            Logout
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[13.5rem]">
        <header className="ui-app-header">
          <button
            type="button"
            className="rounded-md p-2 text-zinc-700 hover:bg-white/40 max-md:order-1 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 md:h-4 md:w-4" />
          </button>
          <h1 className="ui-app-title min-w-0 flex-1 truncate max-md:order-2 max-md:w-full">{title}</h1>
          {actions ? <div className="ui-actions-bar max-md:order-4">{actions}</div> : null}
          <div className="ml-auto flex items-center gap-2 max-md:order-3 max-md:ml-0 max-md:w-auto">
            {app?.cwmpEnabled ? (
              <span className="hidden items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 sm:inline-flex">
                <Radio className="h-3 w-3" />
                ACS Live
              </span>
            ) : null}
            <span className="hidden font-mono text-[11px] text-zinc-400 md:inline">
              {app?.url?.replace(/^https?:\/\//, '')}
            </span>
          </div>
        </header>

        <main className="ui-app-main">{children}</main>
      </div>
    </div>
  );
}
