import { useTranslation } from 'react-i18next'
import type { ChatMessage as ChatMessageType } from '../types'
import { useAuthStore } from '../stores/authStore'

interface Props {
  message: ChatMessageType
  sessionId: string
}

export default function ChatMessage({ message, sessionId }: Props) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const { user } = useAuthStore()

  const isBlocked = message.blocked
  console.log('message :', message)
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
        {isUser ? (
          <img
            src={`https://api.dicebear.com/10.x/critters/svg?seed=${user?.email || 'default'}`}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${sessionId}`}
            alt="avatar assistant"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Bulle */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Nom + heure */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-xs font-semibold text-[#A3AED0]">
            {isUser ? t('chat.you') : t('chat.assistant')}
          </span>
          <span className="text-[10px] text-[#A3AED0]">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Contenu */}
        <div className={`
          px-4 py-3 rounded-2xl text-sm leading-relaxed
          ${isBlocked
            ? 'bg-[#FFF5F5] dark:bg-[#2D1B1B] border border-[#EE5D50] text-[#EE5D50]'
            : isUser
              ? 'bg-gradient-to-br from-[#4318FF] to-[#868CFF] text-white rounded-tr-none'
              : 'bg-white dark:bg-[#111C44] text-[#2B3674] dark:text-white shadow-sm rounded-tl-none'
          }
        `}>
          {isBlocked
            ? t('chat.blocked')
            : message.content || (
                <span className="flex items-center gap-2 text-[#A3AED0]">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-100">●</span>
                  <span className="animate-pulse delay-200">●</span>
                </span>
              )
          }
        </div>

        {/* Badge PII */}
        {message.pii_detected > 0 && !isBlocked && (
          <div className="
            flex items-center gap-1.5 px-2.5 py-1
            bg-[#FFB547]/15 rounded-full
          ">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
            <span className="text-[10px] font-semibold text-[#FFB547]">
              {t('chat.pii_detected', { count: message.pii_detected })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}