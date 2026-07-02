import { Head, router, usePage } from '@inertiajs/react';
import { UserPlus, Shield } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/Components/AppLayout';
import Badge from '@/Components/Badge';
import Flash from '@/Components/Flash';
import { Panel, PanelHeader } from '@/Components/Panel';

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const roleColors = {
  admin: 'fault',
  operator: 'running',
  viewer: 'pending',
};

export default function UsersIndex({ users, roles, flash }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' });

  const submit = (e) => {
    e.preventDefault();
    router.post('/users', form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ name: '', email: '', password: '', role: 'operator' });
      },
    });
  };

  return (
    <AppLayout
      title="Users"
      actions={
        <button type="button" onClick={() => setShowForm(!showForm)} className="ui-btn-primary">
          <UserPlus className="h-3.5 w-3.5" />
          Tambah User
        </button>
      }
    >
      <Head title="Users" />
      <Flash flash={flash} />

      {showForm && (
        <Panel className="mb-2 p-3">
          <PanelHeader title="User Baru" />
          <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="ui-input"
              placeholder="Nama"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="ui-input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="ui-input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <select
              className="ui-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex gap-1 sm:col-span-2 lg:col-span-4">
              <button type="submit" className="ui-btn-primary">
                Simpan
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="ui-btn-secondary">
                Batal
              </button>
            </div>
          </form>
          <p className="mt-2 text-[11px] text-zinc-400">
            <strong>admin</strong> — full access · <strong>operator</strong> — kelola device/task ·{' '}
            <strong>viewer</strong> — read only
          </p>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Daftar User" />
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Dibuat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium text-zinc-900">{user.name}</td>
                  <td className="text-zinc-600">{user.email}</td>
                  <td>
                    <Badge status={roleColors[user.role] || 'pending'}>{user.role}</Badge>
                  </td>
                  <td>
                    <Badge status={user.isActive ? 'completed' : 'fault'}>
                      {user.isActive ? 'active' : 'disabled'}
                    </Badge>
                  </td>
                  <td className="tabular-nums text-zinc-500">{formatDate(user.createdAt)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => router.post(`/users/${user.id}/toggle`)}
                      className="ui-btn-secondary text-[11px]"
                    >
                      {user.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppLayout>
  );
}
