import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Menu, X, LogOut, ChevronDown, Sprout, Check,
  CheckCircle2, AlertCircle, Info, ExternalLink, Trash2,
  Building2, Shield, FileText, Radio, User
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import clsx from 'clsx'

function getInitials(name = '') {
  if (!name) return 'ST'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'superadmin': return 'bg-black text-white badge'
    case 'admin':      return 'bg-gray-100 text-black border border-gray-200 badge'
    case 'developer':  return 'bg-gray-100 text-black border border-gray-200 badge font-mono'
    default:           return 'bg-gray-100 text-gray-700 border border-gray-200 badge'
  }
}

function getRoleLabel(role) {
  switch (role) {
    case 'superadmin': return 'Super Admin'
    case 'admin':      return 'Admin'
    case 'developer':  return 'Developer'
    default:           return 'Staff'
  }
}

export default function DashboardLayout({ navItems = [], pageTitle = 'Dashboard', children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState('all') // 'all' | 'unread'

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotificationStore()

  const count = unreadCount()

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleNotificationClick = (n) => {
    markAsRead(n.id)
    if (n.actionUrl) {
      setNotifOpen(false)
      navigate(n.actionUrl)
    }
  }

  const filteredNotifications = notifFilter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm tracking-tight">Germin8</span>
            <p className="text-[10px] text-gray-400 leading-tight">MCA V3 Automation</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx('nav-item', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Active Client / Company Pill */}
      <div className="px-3 pb-2">
        <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-black shrink-0" />
            <p className="text-[11px] font-bold text-black truncate">Sharma & Associates</p>
          </div>
          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">U74999MH2020PTC344123</p>
        </div>
      </div>

      {/* User + Logout in Sidebar */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 mb-2">
          <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Staff User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email || 'staff@germin8.com'}</p>
          </div>
          <span className={clsx(getRoleBadgeClass(user?.role), 'text-[9px] px-1.5 py-0.5 shrink-0')}>
            {getRoleLabel(user?.role)}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item w-full text-black hover:bg-gray-100 border border-gray-200 cursor-pointer justify-center font-medium"
        >
          <LogOut className="w-4 h-4 text-black" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex-col z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 z-50 flex flex-col lg:hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="glass-nav fixed top-0 right-0 left-0 lg:left-64 h-16 z-20 flex items-center px-4 lg:px-6 gap-3 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate leading-tight">{pageTitle}</h1>
        </div>

        {/* Client Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-black">
          <Building2 className="w-3.5 h-3.5 text-black" />
          <span className="truncate max-w-[140px]">Sharma & Associates</span>
        </div>

        {/* ── NOTIFICATION BELL & DROPDOWN ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={clsx(
              'p-2 rounded-full border transition-all relative cursor-pointer',
              notifOpen ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-700 hover:border-black'
            )}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {count > 0 && (
              <span className={clsx(
                'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold font-mono flex items-center justify-center',
                notifOpen ? 'bg-white text-black' : 'bg-black text-white'
              )}>
                {count}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-black">Compliance Notifications</span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[10px] font-mono">
                        {count} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[11px] font-medium text-black hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-gray-400 hover:text-black transition-colors cursor-pointer"
                        title="Clear all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100 flex gap-2">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all',
                      notifFilter === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                    )}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all',
                      notifFilter === 'unread' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                    )}
                  >
                    Unread ({count})
                  </button>
                </div>

                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400">
                      No notifications to show
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={clsx(
                          'p-3.5 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 relative group',
                          !n.read && 'bg-gray-50/40'
                        )}
                      >
                        <div className="shrink-0 mt-0.5">
                          {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-black" />}
                          {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-black" />}
                          {n.type === 'info' && <Info className="w-4 h-4 text-black" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={clsx('text-xs font-semibold leading-tight truncate', !n.read ? 'text-black' : 'text-gray-700')}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                          {n.formCode && (
                            <span className="inline-block mt-1.5 px-1.5 py-0.2 rounded bg-gray-100 text-black text-[9px] font-mono font-medium border border-gray-200">
                              {n.formCode}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(n.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-black transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setNotifOpen(false)
                      navigate('/dashboard/user/forms')
                    }}
                    className="text-xs font-semibold text-black hover:underline cursor-pointer"
                  >
                    Open Statutory Compliance Hub →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── USER MENU & LOGOUT DROPDOWN ── */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 pl-2 rounded-full border border-gray-200 hover:border-black transition-all cursor-pointer group bg-white"
          >
            <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
              {getInitials(user?.name)}
            </div>
            <span className="hidden sm:block text-xs font-semibold text-gray-800 group-hover:text-black">
              {user?.name?.split(' ')[0] || 'Staff'}
            </span>
            <ChevronDown className={clsx('w-3.5 h-3.5 text-gray-400 transition-transform', userMenuOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                {/* User Info Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-black text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {getInitials(user?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-black truncate">{user?.name || 'Staff Specialist'}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user?.email || 'staff@germin8.com'}</p>
                      <div className="mt-1">
                        <span className={clsx(getRoleBadgeClass(user?.role), 'text-[9px] px-1.5 py-0.2')}>
                          {getRoleLabel(user?.role)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="p-2 space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/dashboard/user/forms?tab=directory')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:text-black hover:bg-gray-50 transition-colors cursor-pointer text-left"
                  >
                    <FileText className="w-4 h-4 text-black" />
                    <span>MCA Master Directory (58 Forms)</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/dashboard/user/forms?mode=connector')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:text-black hover:bg-gray-50 transition-colors cursor-pointer text-left"
                  >
                    <Radio className="w-4 h-4 text-black" />
                    <span>Germin8 Extension Bridge</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      navigate('/dashboard/user/vault')
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-700 hover:text-black hover:bg-gray-50 transition-colors cursor-pointer text-left"
                  >
                    <Building2 className="w-4 h-4 text-black" />
                    <span>Document Vault & Challans</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out / Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="lg:ml-64 pt-16 min-h-screen bg-white">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
