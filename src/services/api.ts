/**
 * Cliente HTTP base para todas as requisições
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import { env } from '../env'

const API_BASE_URL = env.VITE_API_BASE_URL
const USE_MOCK = env.VITE_USE_MOCK === 'true'

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    ...(env.VITE_API_SECRET ? { 'X-Api-Key': env.VITE_API_SECRET } : {}),
  },
})

// Interceptor para adicionar token se necessário
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('api_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratamento de erros
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message)
    throw error
  }
)

export const apiClient = client
export const useMockData = USE_MOCK

export const setApiToken = (token: string) => {
  localStorage.setItem('api_token', token)
  client.defaults.headers.common.Authorization = `Bearer ${token}`
}
