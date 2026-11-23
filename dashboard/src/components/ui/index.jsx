import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
}

export function Alert({ type = 'info', title, message, onClose, className }) {
  const Icon = icons[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm',
        styles[type],
        className
      )}
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', iconStyles[type])} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {message && <p className="opacity-80">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </motion.div>
  )
}

export function Badge({ children, variant = 'gray', className }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function Tooltip({ children, content, side = 'top' }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className={cn(
        'absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg',
        'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap',
        side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
        side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
        side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
      )}>
        {content}
      </div>
    </div>
  )
}

