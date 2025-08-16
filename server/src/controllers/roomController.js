/**
 * Контроллер для работы с комнатами
 */
import roomService from '../services/roomService.js'

// Получение всех комнат
const getAllRooms = (req, res) => {
  try {
    const rooms = roomService.getAllRooms()
    res.json(rooms.map((room) => room.toJSON()))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Получение комнаты по ID
const getRoomById = (req, res) => {
  try {
    const roomId = req.params.id
    const room = roomService.getRoomById(roomId)

    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' })
    }

    res.json(room.toJSON())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Создание новой комнаты
const createRoom = (req, res) => {
  try {
    const { name, maxPlayers } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Необходимо указать название комнаты' })
    }

    const room = roomService.createRoom(name, maxPlayers || 6)
    res.status(201).json(room.toJSON())
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Удаление комнаты
const deleteRoom = (req, res) => {
  try {
    const roomId = req.params.id
    const result = roomService.removeRoom(roomId)

    if (!result) {
      return res.status(404).json({ error: 'Комната не найдена' })
    }

    res.status(204).end()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export { getAllRooms, getRoomById, createRoom, deleteRoom }
