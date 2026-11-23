import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// re-export for DashboardLayout convenience
export { cn as default }

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  developer: 'Developer',
  user: 'User',
}

export const ROLE_COLORS = {
  superadmin: 'bg-purple-50 text-purple-700 border-purple-100',
  admin: 'bg-blue-50 text-blue-700 border-blue-100',
  developer: 'bg-amber-50 text-amber-700 border-amber-100',
  user: 'bg-gray-100 text-gray-600 border-gray-200',
}
