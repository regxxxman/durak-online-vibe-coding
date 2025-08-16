/**
 * Главный файл сервера приложения Дурак-Онлайн
 */
import express from 'express'
import http from 'http'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

import roomRoutes from './routes/roomRoutes.js'
import WebSocketService from './services/webSocketService.js'

// Получение __dirname в ES модуле
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Загрузка переменных окружения
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Порт сервера - Render.com использует переменную PORT
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001

// Создание приложения Express
const app = express()

// Создание HTTP сервера
const server = http.createServer(app)

// Создание WebSocket сервиса
const wsService = new WebSocketService(server)

// Настройка CORS - принимаем запросы с любого источника для отладки
app.use(cors({ origin: true, credentials: true }))

// Парсинг JSON
app.use(express.json())

// Добавление middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`)
  next()
})

// Маршруты API
app.use('/api/rooms', roomRoutes)

// Добавим маршрут для проверки здоровья сервера
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV })
})

// Обрабатываем запросы к несуществующим API маршрутам
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// В режиме production мы не обслуживаем статические файлы,
// так как фронтенд деплоится отдельно
app.get('*', (req, res) => {
  if (req.url.startsWith('/api')) {
    // Если это API запрос, который не был обработан ранее
    return res.status(404).json({ error: 'API endpoint not found' })
  }

  // Для всех остальных запросов отдаем информацию о сервере
  res.status(200).json({
    message: 'Durak Online Game API Server',
    env: process.env.NODE_ENV,
    endpoints: ['/api/rooms', '/health'],
  })
})

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err.message)

  // Если ошибка связана с отсутствием файла (ENOENT)
  if (err.code === 'ENOENT') {
    // Для запросов к корню или статическим файлам
    if (req.path === '/' || !req.path.startsWith('/api')) {
      return res.status(200).json({
        message: 'Durak Online Game API Server',
        env: process.env.NODE_ENV,
        endpoints: ['/api/rooms', '/health'],
      })
    }
  }

  // Для остальных ошибок
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`)
  console.log(`WebSocket сервер готов`)
  console.log(`Окружение: ${process.env.NODE_ENV || 'development'}`)
})

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('Завершение работы сервера...')
  server.close(() => {
    console.log('Сервер остановлен')
    process.exit(0)
  })
})
