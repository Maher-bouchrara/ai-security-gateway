import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, BarChart2, LogOut, Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import logoLight from '../assets/logo-light.png'
import logoDark from '../assets/logo-dark.png'

export default function Sidebar() {
  const { t, i18n } = useTranslation()
  const { logout, user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')
  }

  // Sidebar toujours opposée à la page principale
  const isDarkSidebar = theme === 'light'

  return (
    <aside className={`
      fixed left-0 top-0 h-screen w-64
      ${isDarkSidebar ? 'bg-[#111C44]' : 'bg-white'}
      shadow-[0px_18px_40px_rgba(112,144,176,0.12)]
      flex flex-col z-50
    `}>

      {/* Logo */}
      <div className="px-4 py-6">
        <img
          src={isDarkSidebar ? logoDark : logoLight}
          alt="AI Gateway"
          className="w-full max-w-[210px] object-contain"
        />
      </div>

      {/* Divider */}
      <div className="px-4 mb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#A3AED0]/30 to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        <NavLink
          to="/chat"
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl
            font-body font-medium text-sm transition-all
            ${isActive
              ? 'bg-[#4318FF] text-white shadow-md'
              : isDarkSidebar
                ? 'text-[#A3AED0] hover:bg-[#1E2A3A] hover:text-white'
                : 'text-[#6B7280] hover:bg-[#F4F7FE] hover:text-[#1E2A3A]'
            }
          `}
        >
          <MessageSquare size={18} />
          {t('nav.chat')}
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl
            font-body font-medium text-sm transition-all
            ${isActive
              ? 'bg-[#4318FF] text-white shadow-md'
              : isDarkSidebar
                ? 'text-[#A3AED0] hover:bg-[#1E2A3A] hover:text-white'
                : 'text-[#6B7280] hover:bg-[#F4F7FE] hover:text-[#1E2A3A]'
            }
          `}
        >
          <BarChart2 size={18} />
          {t('nav.dashboard')}
        </NavLink>
      </nav>

      {/* User info */}
      <div className="px-4 mb-2">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${
          isDarkSidebar ? 'bg-[#1E2A3A]' : 'bg-[#F4F7FE]'
        }`}>
          <img
            src={`https://api.dicebear.com/10.x/critters/svg?seed=${user?.email || 'default'}`}
            alt="avatar"
            className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${
              isDarkSidebar ? 'text-white' : 'text-[#2B3674]'
            }`}>
              {user?.email}
            </p>
            <p className="text-[10px] text-[#A3AED0] truncate">
              {user?.role === 'admin' ? t('nav.admin') : t('nav.user')}
            </p>
          </div>
        </div>
      </div>

      {/* Divider bas */}
      <div className={`mx-4 h-px mb-2 ${
        isDarkSidebar ? 'bg-[#1E2A3A]' : 'bg-[#E5E7EB]'
      }`} />

      {/* Boutons bas */}
      <div className="px-4 pb-6 space-y-1">

        {/* Toggle langue */}
        <button
          onClick={toggleLanguage}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl
            font-body font-medium text-sm transition-all
            ${isDarkSidebar
              ? 'text-[#A3AED0] hover:bg-[#1E2A3A] hover:text-white'
              : 'text-[#6B7280] hover:bg-[#F4F7FE] hover:text-[#1E2A3A]'
            }
          `}
        >
          <span className="text-base">🌐</span>
          {i18n.language === 'fr' ? 'English' : 'Français'}
        </button>

        {/* Toggle thème */}
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl
            font-body font-medium text-sm transition-all
            ${isDarkSidebar
              ? 'text-[#A3AED0] hover:bg-[#1E2A3A] hover:text-white'
              : 'text-[#6B7280] hover:bg-[#F4F7FE] hover:text-[#1E2A3A]'
            }
          `}
        >
          {isDarkSidebar ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-xl
            font-body font-medium text-sm transition-all
            text-[#EE5D50]
            ${isDarkSidebar ? 'hover:bg-[#1E2A3A]' : 'hover:bg-[#FFF5F5]'}
          `}
        >
          <LogOut size={18} />
          {t('nav.logout')}
        </button>

        {/* Footer */}
        <p className="text-[10px] text-[#A3AED0] text-center pt-2 leading-relaxed">
          {t('footer.credit')}
        </p>
      </div>
    </aside>
  )
}