import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { login } from '../api/audit'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import axios from 'axios'
import logoLogin from '../assets/logo-login.png'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      console.log('Login :', data)
      storeLogin(data.access_token, { email, role: 'viewer' })
      navigate('/chat')
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            if (err.response?.status === 401) {
            setError(t('login.error'))
            } else if (!err.response) {
            setError(t('login.network_error'))
            } else {
            setError(t('login.server_error'))
            }
        } else {
            setError(t('login.server_error'))
        }
    }finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full font-body">

      {/* ── Gauche 65% — dégradé + image dev.jpg ── */}
      <div
        className="hidden lg:flex w-[65%] relative flex-col justify-end p-16"
        style={{
          backgroundImage: 'url(/src/assets/dev.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay dégradé par dessus l'image */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4318FF]/90 via-[#4318FF]/70 to-[#000FF]/80" />

        {/* Contenu texte */}
        <div className="relative z-10">
          <h1 className="font-heading font-bold text-5xl text-white leading-tight mb-4">
            Protégez vos données,<br />
            <span className="text-white/80">sans compromis.</span>
          </h1>

          <p className="text-white/70 text-lg max-w-lg leading-relaxed mb-10">
            Utilisez les LLM les plus puissants du marché sans jamais exposer vos données personnelles au tiers.
          </p>

          <div className="flex flex-col gap-3">
            {[
              'Anonymisation automatique des PII',
              'Filtrage des injections de prompt',
              'Dashboard d\'audit en temps réel',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#05CD99] flex-shrink-0" />
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Droite 35% — formulaire épuré ── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white dark:bg-[#0B1437] px-10">

        <div className="w-full max-w-sm">
            {/* Logo centré */}
            <div className="flex items-center gap-4 mb-10 justify-center">
              <img
                src={logoLogin}
                alt="AI Gateway"
                className="w-20 object-contain flex-shrink-0"
              />
              <div>
                <h1 className="font-heading font-bold text-3xl text-[#2B3674] dark:text-white">
                  <span className="text-[#00AEEF]">AI</span> Gateway
                </h1>
                <p className="text-[#A3AED0] text-sm mt-1 tracking-widest uppercase">
                  Security & Anonymization
                </p>
              </div>
            </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#A3AED0]/30 to-transparent" />

          </div>
          
          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#A3AED0] mb-2">
              {t('login.subtitle')}
            </p>
            <h2 className="font-heading font-bold text-2xl text-[#2B3674] dark:text-white">
              {t('login.title')}
            </h2>
          </div>
          

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3AED0]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('login.email')}
                className="
                  w-full pl-11 pr-4 py-3.5
                  bg-[#F4F7FE] dark:bg-[#111C44]
                  border-2 border-transparent
                  focus:border-[#4318FF] focus:outline-none
                  rounded-xl text-sm
                  text-[#2B3674] dark:text-white
                  placeholder:text-[#A3AED0]
                  transition-all
                "
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3AED0]"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t('login.password')}
                className="
                  w-full pl-11 pr-12 py-3.5
                  bg-[#F4F7FE] dark:bg-[#111C44]
                  border-2 border-transparent
                  focus:border-[#4318FF] focus:outline-none
                  rounded-xl text-sm
                  text-[#2B3674] dark:text-white
                  placeholder:text-[#A3AED0]
                  transition-all
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AED0] hover:text-[#4318FF] transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Erreur */}
            {error && (
              <p className="text-[#EE5D50] text-xs text-center py-2">
                {error}
              </p>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3.5 mt-2
                bg-gradient-to-r from-[#4318FF] to-[#00AEEF]
                hover:opacity-90
                text-white font-semibold text-sm tracking-wide
                rounded-xl transition-all shadow-lg
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {loading ? '...' : t('login.submit')}
            </button>
          </form>

          {/* Footer */}
          <p className="text-[10px] text-[#A3AED0] text-center mt-10 leading-relaxed">
            {t('footer.credit')}
          </p>
        </div>
      </div>
    </div>
  )
}