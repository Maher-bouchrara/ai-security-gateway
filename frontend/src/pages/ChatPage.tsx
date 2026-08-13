import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import ChatMessage from '../components/ChatMessage'
import { sendMessageStream } from '../api/chat'
import { useAuthStore } from '../stores/authStore'
import type { ChatMessage as ChatMessageType } from '../types'

export default function ChatWindow() {
  const { t } = useTranslation()
  const { user } = useAuthStore()

  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionId] = useState(() => uuidv4())   // généré une fois par conversation
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return

    const userMessage: ChatMessageType = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      pii_detected: 0,
      blocked: false,
      timestamp: new Date(),
    }

    // Ajouter le message utilisateur
    setMessages(prev => [...prev, userMessage])
    console.log('les messages :', messages)
    const currentInput = input.trim()
    setInput('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
    setIsStreaming(true)

    // Créer un message assistant vide (sera rempli chunk par chunk)
    const assistantId = uuidv4()
    const assistantMessage: ChatMessageType = {
      id: assistantId,
      role: 'assistant',
      content: '',
      pii_detected: 0,
      blocked: false,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      await sendMessageStream(
        {
          message: currentInput,
          user_id: user?.email || 'anonymous',
          session_id: sessionId,
        },

        // onChunk — ajoute chaque morceau au message assistant
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ))
        },

        // onDone — fin du streaming
        () => {
          setIsStreaming(false)
        },

        // onError — message bloqué ou erreur serveur
        (error) => {
          setIsStreaming(false)
          setMessages(prev => prev.map(msg =>
            msg.id === assistantId
              ? { ...msg, content: error, blocked: true }
              : msg
          ))
        },
        // onPII — met à jour le compteur de PII détecté
        (count) => {
          setMessages(prev => prev.map(msg =>
            msg.id === userMessage.id
              ? { ...msg, pii_detected: count }
              : msg
          ))
        }
      )
    } catch {
      setIsStreaming(false)
    }
  }

  // Envoyer avec la touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div className="
        px-6 py-4 border-b border-[#F4F7FE] dark:border-[#1E2A3A]
        bg-white dark:bg-[#111C44]
        shadow-sm
      ">
        <h1 className="font-heading font-bold text-lg text-[#2B3674] dark:text-white">
          {t('chat.title')}
        </h1>
        <p className="text-xs text-[#A3AED0] mt-0.5">
          Session : <span className="font-mono">{sessionId.slice(0, 8)}...</span>
        </p>
      </div>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">

        {/* Message de bienvenue si vide */}
        {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-28 h-28 flex items-center justify-center mb-6">
              <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${sessionId}`}
            alt="avatar assistant"
            className="w-full h-full object-cover"
          />
            </div>
            <h2 className="font-heading font-bold text-xl text-[#2B3674] dark:text-white mb-2">
              {t('chat.greeting')}
            </h2>
            <p className="text-sm text-[#A3AED0] max-w-sm">
              {t('chat.welcome')}   
            </p>
          </div>
        )}

        {/* Liste des messages */}
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} sessionId={sessionId} />
        ))}

        {/* Anchor pour auto-scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Zone input */}
      <div className="
        px-6 py-4
        bg-white dark:bg-[#111C44]
        border-t border-[#F4F7FE] dark:border-[#1E2A3A]
      ">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            ref={inputRef}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            className="
              flex-1 px-4 py-3 rounded-xl
              bg-[#F4F7FE] dark:bg-[#0B1437]
              border-2 border-transparent
              focus:border-[#4318FF] focus:outline-none
              text-sm text-[#2B3674] dark:text-white
              placeholder:text-[#A3AED0]
              resize-none transition-all
              disabled:opacity-60
            "
            style={{ maxHeight: '120px' }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="
              w-11 h-11 rounded-xl flex-shrink-0
              bg-gradient-to-br from-[#4318FF] to-[#00AEEF]
              flex items-center justify-center
              hover:opacity-90 transition-all shadow-md
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {isStreaming
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Send size={18} className="text-white" />
            }
          </button>
        </div>

        <p className="text-[10px] text-[#A3AED0] text-center mt-2">
          Entrée pour envoyer · Shift+Entrée pour sauter une ligne
        </p>
      </div>
    </div>
  )
}