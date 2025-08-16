import type { GameRoom } from '../models/types'

// Базовый URL API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Параметры запроса по умолчанию
const defaultOptions: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
}

// Функция для выполнения HTTP-запросов
async function fetchApi<T>(
  endpoint: string,
  method: string = 'GET',
  data?: Record<string, unknown>,
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const options: RequestInit = {
    ...defaultOptions,
    method,
  }

  if (data) {
    options.body = JSON.stringify(data)
  }

  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// API-методы для работы с игровыми комнатами
export const roomsApi = {
  // Получение списка комнат
  getAll(): Promise<GameRoom[]> {
    return fetchApi<GameRoom[]>('/rooms')
  },

  // Получение конкретной комнаты
  getById(id: string): Promise<GameRoom> {
    return fetchApi<GameRoom>(`/rooms/${id}`)
  },

  // Создание новой комнаты
  create(name: string, maxPlayers: number): Promise<GameRoom> {
    return fetchApi<GameRoom>('/rooms', 'POST', { name, maxPlayers })
  },

  // Обновление комнаты
  update(id: string, data: Partial<GameRoom>): Promise<GameRoom> {
    return fetchApi<GameRoom>(`/rooms/${id}`, 'PUT', data)
  },

  // Удаление комнаты
  delete(id: string): Promise<void> {
    return fetchApi<void>(`/rooms/${id}`, 'DELETE')
  },
}

// API-методы для работы с пользователями
export const usersApi = {
  // Регистрация пользователя
  register(username: string, password: string): Promise<{ token: string; userId: string }> {
    return fetchApi('/auth/register', 'POST', { username, password })
  },

  // Вход пользователя
  login(username: string, password: string): Promise<{ token: string; userId: string }> {
    return fetchApi('/auth/login', 'POST', { username, password })
  },

  // Получение профиля
  getProfile(): Promise<{ username: string; id: string; stats: { wins: number; losses: number } }> {
    return fetchApi('/users/me')
  },
}
