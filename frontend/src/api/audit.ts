import axios from 'axios'
import type { AuditEvent, AuditStats } from '../types'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({ baseURL: API_URL })

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const getAuditEvents = async (
  page: number = 1,
  limit: number = 10,
  event_type?: string
): Promise<AuditEvent[]> => {
  const params: Record<string, string | number> = { page, limit }
  if (event_type) params.event_type = event_type
  const response = await apiClient.get<AuditEvent[]>('/audit', { params })
  return response.data
}

export const getAuditStats = async (): Promise<AuditStats> => {
  const response = await apiClient.get<AuditStats>('/audit/stats')
  return response.data
}

export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password })
  return response.data
}