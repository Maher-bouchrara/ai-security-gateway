import axios from 'axios'
import type { ChatRequest, ChatResponse } from '../types'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ─── Client Axios ────────────────────────────────────────

const apiClient = axios.create({ baseURL: API_URL })

// Intercepteur — ajoute le JWT automatiquement sur chaque requête
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Fonctions ───────────────────────────────────────────

export const sendMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>('/chat', request)
  return response.data
}

export const sendMessageStream = async (
  request: ChatRequest,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  onPII: (count: number) => void
): Promise<void> => {
  const token = useAuthStore.getState().token

  const response = await fetch(`${API_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    onError(error.detail || 'Erreur serveur')
    return
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') {
          onDone()
        } else if (data.startsWith('[PII:')) {
            const count = parseInt(data.replace('[PII:', '').replace(']', ''))
            onPII(count)
        } else if (data.startsWith('[ERROR]')) {
          onError(data.replace('[ERROR] ', ''))
        } else if (data.trim()) {
          onChunk(data)
        }
      }
    }
  }
}