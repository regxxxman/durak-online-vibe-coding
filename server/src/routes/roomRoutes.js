/**
 * Маршруты для работы с комнатами
 */
import express from 'express'
import { getAllRooms, getRoomById, createRoom, deleteRoom } from '../controllers/roomController.js'

const router = express.Router()

// Получение всех комнат
router.get('/', getAllRooms)

// Получение комнаты по ID
router.get('/:id', getRoomById)

// Создание новой комнаты
router.post('/', createRoom)

// Удаление комнаты
router.delete('/:id', deleteRoom)

export default router
