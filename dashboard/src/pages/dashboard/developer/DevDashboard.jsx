import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Key, Webhook, Terminal, Sliders, Check, Copy,
  Plus, Trash2, Eye, EyeOff, Play, RefreshCw, AlertCircle,
  CheckCircle2, ArrowUpRight, Zap, Shield, Server, FileCode,
  Settings, Users, Layers, Activity
} from 'lucide-react'
import DashboardLayout from '../../../layouts/DashboardLayout'
import clsx from 'clsx'

const NAV_ITEMS = [
  { label: 'Overview',       icon: Activity, path: '/dashboard/developer/overview' },
  { label: 'API Keys',       icon: Key,      path: '/dashboard/developer/keys' },
  { label: 'Plan Settings',  icon: Sliders,  path: '/dashboard/developer/plan-settings' },
  { label: 'Webhooks',       icon: Webhook,  path: '/dashboard/developer/webhooks' },
  { label: 'API Logs',       icon: Terminal, path: '/dashboard/developer/logs' },
  { label: 'Sandbox & SDKs', icon: Code2,    path: '/dashboard/developer/sandbox' },
]

// Mock data
const INITIAL_KEYS = [
  { id: 'key_live_9941a8', name: 'Production Backend', key: 'g8_live_9941a87b209e74bc81', created: '2026-10-12', lastUsed: '2 mins ago', env: 'Production' },
  { id: 'key_test_1143c2', name: 'Staging Environment', key: 'g8_test_1143c29f600d81ef33', created: '2026-10-24', lastUsed: '1 hour ago', env: 'Test' },
  { id: 'key_test_8812a1', name: 'Local Dev Machine',  key: 'g8_test_8812a11c039b56dd72', created: '2026-11-02', lastUsed: 'Just now',  env: 'Test' },
]

const INITIAL_LOGS = [
  { id: 'req_001', method: 'POST', endpoint: '/v1/mca/mgt7/autofill', status: 200, time: '142ms', timestamp: '10:42:15', ip: '14.139.12.88' },
  { id: 'req_002', method: 'GET',  endpoint: '/v1/company/search?cin=U749', status: 200, time: '88ms',  timestamp: '10:41:50', ip: '14.139.12.88' },
  { id: 'req_003', method: 'POST', endpoint: '/v1/filesure/submit', status: 201, time: '340ms', timestamp: '10:40:12', ip: '103.21.244.1' },
  { id: 'req_004', method: 'POST', endpoint: '/v1/ocr/scan-document', status: 422, time: '512ms', timestamp: '10:38:09', ip: '49.36.110.12' },
  { id: 'req_005', method: 'GET',  endpoint: '/v1/forms/status/g8_8841', status: 200, time: '45ms',  timestamp: '10:35:44', ip: '14.139.12.88' },
  { id: 'req_006', method: 'POST', endpoint: '/v1/webhooks/verify', status: 200, time: '67ms',  timestamp: '10:30:02', ip: '52.77.220.1' },
]

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function Overview() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'API Requests (24h)', value: '48,219', delta: '+14% vs yesterday', icon: Activity,     color: 'text-black', bg: 'bg-gray-100' },
          { label: 'Avg Latency',        value: '118 ms', delta: 'P95: 240 ms',        icon: Zap,          color: 'text-black', bg: 'bg-gray-100' },
          { label: 'Success Rate',       value: '99.82%', delta: '8 errors logged',   icon: CheckCircle2, color: 'text-black', bg: 'bg-gray-100' },
          { label: 'Active Webhooks',    value: '4 Live', delta: '100% delivered',    icon: Webhook,      color: 'text-black', bg: 'bg-gray-100' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="stat-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.delta}</p>
                </div>
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', s.bg)}>
                  <Icon className={clsx('w-5 h-5', s.color)} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Traffic Mock Visual Bar */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">API Traffic & Throughput</h3>
            <p className="text-xs text-gray-400">Request distribution across MCA endpoints</p>
          </div>
          <span className="badge bg-black text-white text-xs">Live Metrics</span>
        </div>
        <div className="grid grid-cols-12 gap-2 h-32 items-end pt-4 pb-2 border-b border-gray-100">
          {[40, 65, 30, 85, 95, 60, 45, 78, 92, 100, 82, 68].map((val, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-full bg-black rounded-t-md transition-all duration-300 hover:bg-gray-700"
                style={{ height: `${val}%` }}
              />
              <span className="text-[10px] text-gray-400 font-mono">{idx * 2}h</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── PLAN SETTINGS TAB (DEV & SUPER ADMIN PLAN CONFIG) ────────────────────────
function PlanSettingsConfig() {
  const [plans, setPlans] = useState([
    { id: 'starter', name: 'Starter Plan', maxUsers: 5, monthlyForms: 50, apiCalls: 5000, rateLimit: 60, active: true },
    { id: 'pro',     name: 'Professional Plan', maxUsers: 25, monthlyForms: 250, apiCalls: 50000, rateLimit: 300, active: true },
    { id: 'enterprise', name: 'Enterprise Plan', maxUsers: 100, monthlyForms: 2000, apiCalls: 500000, rateLimit: 1200, active: true },
  ])
  const [savedAlert, setSavedAlert] = useState(false)

  const handleUpdate = (id, field, value) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: Number(value) || value } : p))
  }

  const handleSave = () => {
    setSavedAlert(true)
    setTimeout(() => setSavedAlert(false), 3000)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Plan Settings & Limits Config</h2>
          <p className="text-xs text-gray-500 mt-0.5">Developer & Super Admin access: Control how many users and quota can be added per plan tier</p>
        </div>
        <button onClick={handleSave} className="btn-primary">
          <Check className="w-4 h-4" /> Save Configuration
        </button>
      </div>

      {savedAlert && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 text-black rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-black" />
          Plan settings and user seat limits successfully synchronized with live database!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-5 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="font-bold text-sm text-gray-900">{p.name}</span>
              <span className="badge bg-black text-white text-[10px] uppercase font-mono">{p.id}</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Max People (Seats Allowed)
              </label>
              <input
                type="number"
                value={p.maxUsers}
                onChange={(e) => handleUpdate(p.id, 'maxUsers', e.target.value)}
                className="input-field py-2 text-sm font-semibold"
              />
              <span className="text-[11px] text-gray-400 mt-0.5 block">Company admin can invite up to {p.maxUsers} members</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Monthly Form Limit
              </label>
              <input
                type="number"
                value={p.monthlyForms}
                onChange={(e) => handleUpdate(p.id, 'monthlyForms', e.target.value)}
                className="input-field py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                API Calls Quota (per month)
              </label>
              <input
                type="number"
                value={p.apiCalls}
                onChange={(e) => handleUpdate(p.id, 'apiCalls', e.target.value)}
                className="input-field py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Rate Limit (req / min)
              </label>
              <input
                type="number"
                value={p.rateLimit}
                onChange={(e) => handleUpdate(p.id, 'rateLimit', e.target.value)}
                className="input-field py-2 text-sm font-semibold"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── API KEYS TAB ────────────────────────────────────────────────────────────
function ApiKeys() {
  const [keys, setKeys] = useState(INITIAL_KEYS)
  const [showKey, setShowKey] = useState({})
  const [copied, setCopied] = useState(null)
  const [newKeyModal, setNewKeyModal] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyEnv, setKeyEnv] = useState('Production')

  const copyKey = (val, id) => {
    navigator.clipboard.writeText(val)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const createKey = () => {
    if (!keyName) return
    const randomSuffix = Math.random().toString(36).substring(2, 12)
    const newEntry = {
      id: `key_${keyEnv.toLowerCase()}_${randomSuffix.slice(0, 6)}`,
      name: keyName,
      key: `g8_${keyEnv === 'Production' ? 'live' : 'test'}_${randomSuffix}`,
      created: 'Just now',
      lastUsed: 'Never',
      env: keyEnv
    }
    setKeys([newEntry, ...keys])
    setKeyName('')
    setNewKeyModal(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">API Credentials</h2>
          <p className="text-xs text-gray-400">Authenticate API and FileSure integration requests</p>
        </div>
        <button onClick={() => setNewKeyModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Generate New Key
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Name & ID</th>
              <th>Secret Key</th>
              <th>Environment</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>
                  <p className="font-semibold text-gray-900 text-sm">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{k.id}</p>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                      {showKey[k.id] ? k.key : `${k.key.slice(0, 8)}••••••••••••••`}
                    </span>
                    <button
                      onClick={() => setShowKey(prev => ({ ...prev, [k.id]: !prev[k.id] }))}
                      className="text-gray-400 hover:text-black p-1"
                    >
                      {showKey[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyKey(k.key, k.id)}
                      className="text-gray-400 hover:text-black p-1"
                    >
                      {copied === k.id ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
                <td>
                  <span className={clsx('badge text-[11px]', k.env === 'Production' ? 'badge-green' : 'badge-gray')}>
                    {k.env}
                  </span>
                </td>
                <td className="text-xs text-gray-400">{k.created}</td>
                <td>
                  <button
                    onClick={() => setKeys(keys.filter(item => item.id !== k.id))}
                    className="p-1 text-gray-300 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="glass-card bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-glass-xl">
            <h3 className="font-bold text-gray-900 text-base">Generate API Key</h3>
            <div>
              <label className="label">Key Description / Name</label>
              <input
                className="input-field"
                placeholder="e.g. ERP Integration"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Environment</label>
              <select
                className="input-field cursor-pointer"
                value={keyEnv}
                onChange={e => setKeyEnv(e.target.value)}
              >
                <option value="Production">Production</option>
                <option value="Test">Test / Sandbox</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setNewKeyModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={createKey} className="btn-primary">Generate Key</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── WEBHOOKS TAB ────────────────────────────────────────────────────────────
function Webhooks() {
  const [webhooks, setWebhooks] = useState([
    { id: 'wh_1', url: 'https://api.yourcompany.com/v1/mca-status-hook', events: ['form.filed', 'ocr.processed'], active: true },
    { id: 'wh_2', url: 'https://staging.yourcompany.com/hooks/germin8', events: ['filesure.completed'], active: true },
  ])
  const [newUrl, setNewUrl] = useState('')

  const addHook = () => {
    if (!newUrl) return
    setWebhooks([...webhooks, { id: `wh_${Date.now()}`, url: newUrl, events: ['form.filed'], active: true }])
    setNewUrl('')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Webhook Subscriptions</h2>
          <p className="text-xs text-gray-400">Receive real-time HTTP callbacks on MCA filing events</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <label className="label">Add Webhook Endpoint URL</label>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="https://your-domain.com/webhooks/mca"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
          />
          <button onClick={addHook} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Add Endpoint
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {webhooks.map(wh => (
          <div key={wh.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs font-semibold text-gray-800">{wh.url}</span>
              </div>
              <div className="flex gap-1.5">
                {wh.events.map(ev => (
                  <span key={ev} className="badge-gray text-[10px]">{ev}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => setWebhooks(webhooks.filter(item => item.id !== wh.id))}
              className="text-gray-300 hover:text-red-500 p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─── API LOGS TAB ────────────────────────────────────────────────────────────
function ApiLogs() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Live Request Inspector</h2>
        <span className="badge-green text-xs">Live Stream Active</span>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Client IP</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {INITIAL_LOGS.map((log) => (
              <tr key={log.id}>
                <td>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-[11px] font-mono font-bold',
                    log.method === 'POST' ? 'bg-black text-white' : 'bg-gray-100 text-black border border-gray-200'
                  )}>
                    {log.method}
                  </span>
                </td>
                <td className="font-mono text-xs text-gray-800">{log.endpoint}</td>
                <td>
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-[11px] font-bold',
                    log.status < 300 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}>
                    {log.status}
                  </span>
                </td>
                <td className="text-xs text-gray-500">{log.time}</td>
                <td className="font-mono text-[11px] text-gray-400">{log.ip}</td>
                <td className="text-xs text-gray-400">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// ─── SANDBOX & SDKS TAB ──────────────────────────────────────────────────────
function Sandbox() {
  const [tab, setTab] = useState('curl')
  const snippets = {
    curl: `curl -X POST https://api.germin8.com/v1/mca/forms/autofill \\
  -H "Authorization: Bearer g8_live_9941a87b209e74bc81" \\
  -H "Content-Type: application/json" \\
  -d '{
    "formCode": "MGT-7",
    "cin": "U74999MH2020PTC344123",
    "useFileSure": true
  }'`,
    node: `import { Germin8Client } from '@germin8/sdk';

const client = new Germin8Client({
  apiKey: process.env.GERMIN8_API_KEY
});

const submission = await client.mca.autofillAndSubmit({
  formCode: 'MGT-7',
  cin: 'U74999MH2020PTC344123',
  useFileSure: true
});

console.log(submission.acknowledgementNumber);`,
    python: `from germin8 import Germin8

client = Germin8(api_key="g8_live_9941a87b209e74bc81")

res = client.mca.autofill_and_submit(
    form_code="MGT-7",
    cin="U74999MH2020PTC344123",
    use_filesure=True
)

print(res.status, res.srn)`
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Developer Sandbox & Code Samples</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['curl', 'node', 'python'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors',
                tab === t ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {t === 'node' ? 'Node.js' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-950 text-gray-100 rounded-2xl p-5 font-mono text-xs leading-relaxed overflow-x-auto shadow-glass-xl border border-gray-800">
        <pre>{snippets[tab]}</pre>
      </div>
    </motion.div>
  )
}

// ─── MAIN ROUTER ─────────────────────────────────────────────────────────────
export default function DevDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Developer Hub">
      <div className="p-6">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview"      element={<Overview />} />
          <Route path="keys"          element={<ApiKeys />} />
          <Route path="plan-settings" element={<PlanSettingsConfig />} />
          <Route path="webhooks"      element={<Webhooks />} />
          <Route path="logs"          element={<ApiLogs />} />
          <Route path="sandbox"       element={<Sandbox />} />
        </Routes>
      </div>
    </DashboardLayout>
  )
}

