import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, CreditCard, Settings,
  Building2, UserPlus, ChevronDown, CheckCircle2,
  Upload, ToggleLeft, ToggleRight, FileText, TrendingUp,
  Star, ArrowUpRight, Mail, X, Check
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import clsx from 'clsx'

const NAV_ITEMS = [
  { label: 'Overview',     icon: LayoutDashboard, path: '/dashboard/admin/overview' },
  { label: 'Team Members', icon: Users,           path: '/dashboard/admin/team' },
  { label: 'Plan & Billing', icon: CreditCard,    path: '/dashboard/admin/billing' },
  { label: 'Settings',     icon: Settings,        path: '/dashboard/admin/settings' },
]

const TEAM = [
  { name: 'Priya Sharma',  email: 'priya@demo.com',  role: 'admin',     joined: 'Jan 2025' },
  { name: 'Arjun Patel',   email: 'arjun@demo.com',  role: 'developer', joined: 'Mar 2025' },
  { name: 'Neha Singh',    email: 'neha@demo.com',   role: 'user',      joined: 'Apr 2025' },
  { name: 'Rahul Verma',   email: 'rahul@demo.com',  role: 'user',      joined: 'Jun 2025' },
  { name: 'Anjali Roy',    email: 'anjali@demo.com', role: 'user',      joined: 'Aug 2025' },
]

const INVOICES = [
  { id: 'INV-001', date: 'Nov 1, 2026', amount: '₹2,999', status: 'Paid' },
  { id: 'INV-002', date: 'Oct 1, 2026', amount: '₹2,999', status: 'Paid' },
  { id: 'INV-003', date: 'Sep 1, 2026', amount: '₹2,999', status: 'Paid' },
]

function RoleBadge({ role }) {
  const cls = {
    admin:     'bg-black text-white badge',
    developer: 'bg-gray-100 text-black border border-gray-300 badge font-mono',
    user:      'badge-gray',
  }[role] || 'badge-gray'
  return <span className={clsx(cls, 'capitalize')}>{role}</span>
}

function ProgressBar({ value, max, color = 'bg-black' }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>{value} / {max}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={clsx('h-full rounded-full', color)}
        />
      </div>
    </div>
  )
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function Overview() {
  const stats = [
    { label: 'Total Users',       value: '5',    icon: Users,        color: 'text-black', bg: 'bg-gray-100' },
    { label: 'Active Plan',       value: 'Pro',  icon: Star,         color: 'text-black', bg: 'bg-gray-100' },
    { label: 'Seats Used',        value: '5/25', icon: CheckCircle2,  color: 'text-black', bg: 'bg-gray-100' },
    { label: 'Forms This Month',  value: '18',   icon: FileText,      color: 'text-black', bg: 'bg-gray-100' },
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                  <Icon className={clsx('w-5 h-5', s.color)} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Company Snapshot</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">Seats Used (5 / 25)</p>
            <ProgressBar value={5} max={25} color="bg-black" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">Forms This Month (18 / 200)</p>
            <ProgressBar value={18} max={200} color="bg-gray-800" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">Storage Used (3.4 / 25 GB)</p>
            <ProgressBar value={3.4} max={25} color="bg-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">API Calls (1,240 / 10,000)</p>
            <ProgressBar value={1240} max={10000} color="bg-gray-700" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── TEAM MEMBERS ────────────────────────────────────────────────────────────
function TeamMembers() {
  const [team, setTeam] = useState(TEAM)
  const [inviteModal, setInviteModal] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [toast, setToast] = useState('')

  const handleInvite = () => {
    if (!name || !email) return
    const newMember = {
      name,
      email,
      role,
      joined: 'Just now'
    }
    setTeam([...team, newMember])
    setName('')
    setEmail('')
    setRole('user')
    setInviteModal(false)
    setToast(`Invitation sent to ${name} as ${role}!`)
    setTimeout(() => setToast(''), 3000)
  }

  const handleRoleChange = (memberEmail, newRole) => {
    setTeam(t => t.map(x => x.email === memberEmail ? { ...x, role: newRole } : x))
    setToast(`Role updated to ${newRole}!`)
    setTimeout(() => setToast(''), 3000)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {toast && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Company Team Members <span className="text-gray-400 font-normal">({team.length} / 25 seats used)</span></h2>
          <p className="text-xs text-gray-400">Admin can invite company staff and assign roles (Developer, User, Admin)</p>
        </div>
        <button onClick={() => setInviteModal(true)} className="btn-primary text-xs">
          <UserPlus className="w-3.5 h-3.5" /> Invite Member
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Current Role</th>
              <th>Joined</th>
              <th>Assign Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.email}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                      {m.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={m.role} /></td>
                <td className="text-gray-400 text-xs">{m.joined}</td>
                <td>
                  <select
                    value={m.role}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-black font-medium cursor-pointer bg-white"
                    onChange={e => handleRoleChange(m.email, e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={() => setTeam(team.filter(x => x.email !== m.email))}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="glass-card bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-glass-xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Invite Company Team Member</h3>
              <button onClick={() => setInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input-field py-2 text-sm"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  className="input-field py-2 text-sm"
                  placeholder="ramesh@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Assign Role in Company</label>
                <select
                  className="input-field py-2 text-sm cursor-pointer"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option value="user">User — Fill forms, AI scanner, view vault</option>
                  <option value="developer">Developer — API keys, sandbox, webhooks</option>
                  <option value="admin">Admin — Manage team, roles & billing</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
              <button onClick={() => setInviteModal(false)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={handleInvite} className="btn-primary text-xs">
                <UserPlus className="w-3.5 h-3.5" /> Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── PLAN & BILLING ──────────────────────────────────────────────────────────
function PlanBilling() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-3xl">
      {/* Current Plan */}
      <div className="glass-card rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-black" />
              <h3 className="font-bold text-gray-900">Professional Plan</h3>
              <span className="badge bg-black text-white">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹2,999 <span className="text-sm font-normal text-gray-400">/month</span></p>
            <p className="text-xs text-gray-400 mt-1">Next billing: December 1, 2026</p>
          </div>
          <button className="btn-primary">
            <TrendingUp className="w-4 h-4" /> Upgrade Plan
          </button>
        </div>
      </div>

      {/* Usage Meters */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-gray-900">Usage This Month</h3>
        {[
          { label: 'Team Seats',   value: 5,    max: 25,    color: 'bg-black',     unit: 'seats' },
          { label: 'API Calls',    value: 1240, max: 10000, color: 'bg-gray-800', unit: 'calls' },
          { label: 'Storage',      value: 3.4,  max: 25,    color: 'bg-gray-600', unit: 'GB' },
          { label: 'MCA Forms',    value: 18,   max: 200,   color: 'bg-gray-700', unit: 'forms' },
        ].map(m => (
          <div key={m.label}>
            <p className="text-xs font-semibold text-gray-600 mb-2">{m.label}</p>
            <ProgressBar value={m.value} max={m.max} color={m.color} />
          </div>
        ))}
      </div>

      {/* Invoice History */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Invoice History</h3>
          <button className="text-xs text-black font-semibold hover:underline flex items-center gap-1">
            Download all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <table className="w-full data-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {INVOICES.map(inv => (
              <tr key={inv.id}>
                <td className="font-mono text-xs text-gray-600">{inv.id}</td>
                <td>{inv.date}</td>
                <td className="font-semibold">{inv.amount}</td>
                <td><span className="badge-green text-xs">{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [notifs, setNotifs] = useState({
    email: true, filing: true, billing: false, security: true
  })
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 max-w-2xl">
      {/* Company Info */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-black" /> Company Information
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Company Name</label>
            <input className="input-field" defaultValue="Sharma & Associates Pvt. Ltd." />
          </div>
          <div>
            <label className="label">GST Number</label>
            <input className="input-field font-mono" defaultValue="29ABCDE1234F1Z5" />
          </div>
        </div>
        {/* Logo Upload */}
        <div>
          <label className="label">Company Logo</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex items-center gap-4 cursor-pointer hover:border-black transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Upload company logo</p>
              <p className="text-xs text-gray-400">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>
        <button className="btn-primary">Save Changes</button>
      </div>

      {/* Notifications */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-4 h-4 text-black" /> Notification Preferences
        </h3>
        {[
          { key: 'email',    label: 'Email Notifications', desc: 'Receive updates via email' },
          { key: 'filing',   label: 'Filing Reminders',    desc: 'Alerts for upcoming due dates' },
          { key: 'billing',  label: 'Billing Alerts',      desc: 'Invoice and payment notifications' },
          { key: 'security', label: 'Security Alerts',     desc: 'Login and access notifications' },
        ].map(n => (
          <div key={n.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">{n.label}</p>
              <p className="text-xs text-gray-400">{n.desc}</p>
            </div>
            <button onClick={() => setNotifs(x => ({ ...x, [n.key]: !x[n.key] }))} className="relative cursor-pointer">
              {notifs[n.key]
                ? <ToggleRight className="w-8 h-8 text-black" />
                : <ToggleLeft  className="w-8 h-8 text-gray-300" />
              }
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function AdminDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Admin Dashboard">
      <div className="p-6">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"  element={<Overview />} />
          <Route path="team"      element={<TeamMembers />} />
          <Route path="billing"   element={<PlanBilling />} />
          <Route path="settings"  element={<SettingsTab />} />
        </Routes>
      </div>
    </DashboardLayout>
  )
}
