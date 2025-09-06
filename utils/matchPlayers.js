const fs = require('fs').promises;
const path = require('path');

/**
 * Проверяет, является ли игрок топовым (из списка Hot игроков)
 * @param {string} username - Имя пользователя
 * @param {Array} hotPlayers - Массив Hot игроков
 * @returns {Object|null} Данные игрока или null
 */
function matchTopPlayer(username, hotPlayers) {
  return hotPlayers.find(player => player.username === username) || null;
}

/**
 * Анализирует схожесть карт между Hot игроками
 * @param {Array} hotPlayers - Массив Hot игроков
 * @returns {Array} Массив объектов с анализом схожести
 */
function analyzeCardSimilarity(hotPlayers) {
  console.log('🔍 Анализируем схожесть карт между Hot игроками...');
  
  const similarities = [];
  
  for (let i = 0; i < hotPlayers.length; i++) {
    for (let j = i + 1; j < hotPlayers.length; j++) {
      const player1 = hotPlayers[i];
      const player2 = hotPlayers[j];
      
      const cards1 = new Set(player1.cards);
      const cards2 = new Set(player2.cards);
      
      // Находим общие карты
      const commonCards = [...cards1].filter(card => cards2.has(card));
      const similarity = commonCards.length / Math.max(cards1.size, cards2.size);
      
      if (commonCards.length > 0) {
        similarities.push({
          player1: player1.username,
          player2: player2.username,
          commonCards: commonCards,
          similarity: Math.round(similarity * 100) / 100,
          commonCount: commonCards.length
        });
      }
    }
  }
  
  // Сортируем по схожести
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  console.log(`📈 Найдено ${similarities.length} пар игроков с общими картами`);
  
  return similarities;
}

/**
 * Сохраняет данные в JSON файл
 * @param {string} filename - Имя файла
 * @param {Object} data - Данные для сохранения
 */
async function saveToJson(filename, data) {
  try {
    const filePath = path.join(__dirname, '..', 'data', filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Данные сохранены в ${filename}`);
  } catch (error) {
    console.error(`❌ Ошибка при сохранении ${filename}:`, error.message);
  }
}

/**
 * Загружает данные из JSON файла
 * @param {string} filename - Имя файла
 * @returns {Object|null} Загруженные данные или null
 */
async function loadFromJson(filename) {
  try {
    const filePath = path.join(__dirname, '..', 'data', filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log(`⚠️  Файл ${filename} не найден или поврежден`);
    return null;
  }
}

/**
 * Создает уникальный ID для колоды
 * @param {string} username - Имя пользователя
 * @param {string} createdAt - Время создания
 * @returns {string} Уникальный ID
 */
function createDeckId(username, createdAt) {
  return `${username}_${createdAt}`;
}

/**
 * Форматирует время для логов
 * @returns {string} Отформатированное время
 */
function formatTimestamp() {
  return new Date().toISOString();
}

module.exports = {
  matchTopPlayer,
  analyzeCardSimilarity,
  saveToJson,
  loadFromJson,
  createDeckId,
  formatTimestamp
};
