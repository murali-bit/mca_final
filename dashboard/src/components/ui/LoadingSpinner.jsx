import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ fullscreen = true, size = 24 }) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" fill="white" fillOpacity="0.9"/>
                <path d="M12 7l4 2.5v5L12 17l-4-2.5v-5L12 7z" fill="black" fillOpacity="0.3"/>
              </svg>
            </div>
          </div>
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      </div>
    )
  }

  return <Loader2 className="animate-spin" size={size} />
}

