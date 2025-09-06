const fs = require('fs').promises;
const path = require('path');

class DeckTracker {
  constructor() {
    this.processedDecks = new Map(); // username -> Set of deckIds
    this.deckHistory = new Map(); // username -> Array of deck objects
    this.dataFile = path.join(__dirname, '..', 'data', 'processedDecks.json');
    this.historyFile = path.join(__dirname, '..', 'data', 'deckHistory.json');
  }

  /**
   * Инициализирует трекер, загружая сохраненные данные
   */
  async initialize() {
    console.log('🔄 Инициализация трекера колод...');
    
    try {
      // Загружаем обработанные колоды
      await this.loadProcessedDecks();
      
      // Загружаем историю колод
      await this.loadDeckHistory();
      
      console.log(`📊 Загружено ${this.processedDecks.size} игроков с обработанными колодами`);
      console.log(`📈 Загружено ${this.deckHistory.size} игроков с историей колод`);
    } catch (error) {
      console.error('❌ Ошибка при инициализации трекера колод:', error.message);
    }
  }

  /**
   * Загружает обработанные колоды из файла
   */
  async loadProcessedDecks() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const saved = JSON.parse(data);
      
      // Восстанавливаем Map из сохраненных данных
      this.processedDecks = new Map();
      for (const [username, deckIds] of Object.entries(saved.processedDecks || {})) {
        this.processedDecks.set(username, new Set(deckIds));
      }
    } catch (error) {
      console.log('⚠️  Файл обработанных колод не найден, начинаем с пустого состояния');
      this.processedDecks = new Map();
    }
  }

  /**
   * Загружает историю колод из файла
   */
  async loadDeckHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      const saved = JSON.parse(data);
      
      // Восстанавливаем Map из сохраненных данных
      this.deckHistory = new Map();
      for (const [username, decks] of Object.entries(saved.deckHistory || {})) {
        this.deckHistory.set(username, decks);
      }
    } catch (error) {
      console.log('⚠️  Файл истории колод не найден, начинаем с пустого состояния');
      this.deckHistory = new Map();
    }
  }

  /**
   * Сохраняет обработанные колоды в файл
   */
  async saveProcessedDecks() {
    try {
      // Конвертируем Map в объект для JSON
      const processedDecksObj = {};
      for (const [username, deckIds] of this.processedDecks) {
        processedDecksObj[username] = Array.from(deckIds);
      }
      
      const data = {
        processedDecks: processedDecksObj,
        lastUpdated: new Date().toISOString(),
        totalPlayers: this.processedDecks.size,
        totalDecks: Array.from(this.processedDecks.values()).reduce((sum, set) => sum + set.size, 0)
      };
      
      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Ошибка при сохранении обработанных колод:', error.message);
    }
  }

  /**
   * Сохраняет историю колод в файл
   */
  async saveDeckHistory() {
    try {
      // Конвертируем Map в объект для JSON
      const deckHistoryObj = {};
      for (const [username, decks] of this.deckHistory) {
        deckHistoryObj[username] = decks;
      }
      
      const data = {
        deckHistory: deckHistoryObj,
        lastUpdated: new Date().toISOString(),
        totalPlayers: this.deckHistory.size,
        totalDecks: Array.from(this.deckHistory.values()).reduce((sum, decks) => sum + decks.length, 0)
      };
      
      await fs.writeFile(this.historyFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('❌ Ошибка при сохранении истории колод:', error.message);
    }
  }

  /**
   * Создает уникальный ID для колоды
   */
  createDeckId(username, createdAt, roundId) {
    return `${username}_${roundId}_${createdAt}`;
  }

  /**
   * Проверяет, была ли колода уже обработана
   */
  isDeckProcessed(username, createdAt, roundId) {
    const deckId = this.createDeckId(username, createdAt, roundId);
    
    if (!this.processedDecks.has(username)) {
      return false;
    }
    
    return this.processedDecks.get(username).has(deckId);
  }

  /**
   * Отмечает колоду как обработанную
   */
  markDeckAsProcessed(username, createdAt, roundId) {
    const deckId = this.createDeckId(username, createdAt, roundId);
    
    if (!this.processedDecks.has(username)) {
      this.processedDecks.set(username, new Set());
    }
    
    this.processedDecks.get(username).add(deckId);
  }

  /**
   * Добавляет колоду в историю игрока
   */
  addDeckToHistory(username, deckData) {
    if (!this.deckHistory.has(username)) {
      this.deckHistory.set(username, []);
    }
    
    const history = this.deckHistory.get(username);
    
    // Проверяем, есть ли уже колода с таким же roundId и createdAt
    const existingIndex = history.findIndex(deck => 
      deck.roundId === deckData.roundId && 
      deck.createdAt === deckData.createdAt
    );
    
    if (existingIndex !== -1) {
      // Обновляем существующую колоду
      console.log(`🔄 Обновление колоды для ${username} в раунде ${deckData.roundId}`);
      history[existingIndex] = {
        ...history[existingIndex],
        ...deckData,
        updatedAt: new Date().toISOString(),
        isUpdate: true
      };
    } else {
      // Добавляем новую колоду
      history.push({
        ...deckData,
        addedAt: new Date().toISOString(),
        isUpdate: false
      });
    }
    
    // Сортируем по времени создания (новые сверху)
    history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Ограничиваем историю последними 50 колодами на игрока
    if (history.length > 50) {
      history.splice(50);
    }
  }

  /**
   * Обрабатывает новые колоды, проверяя на дублирование
   */
  async processNewDecks(latestPlays, hotPlayers) {
    const newDecks = [];
    const updatedDecks = [];
    
    for (const play of latestPlays) {
      const username = play.username;
      const createdAt = play.createdAt;
      const roundId = play.roundId;
      
      // Исключаем пользователя "Seal"
      if (username.toLowerCase() === 'seal') {
        console.log(`🚫 Исключаем пользователя: ${username}`);
        continue;
      }
      
      // Проверяем, является ли игрок топовым (если есть список Hot игроков)
      let topPlayer = null;
      if (hotPlayers && hotPlayers.length > 0) {
        topPlayer = hotPlayers.find(player => player.username === username);
        if (!topPlayer) {
          continue; // Пропускаем, если есть список Hot игроков, но игрок не в нем
        }
      } else {
        // Если нет списка Hot игроков, считаем всех топовыми
        topPlayer = { username: username, isHot: false, appearances: 1 };
      }
      
      // Проверяем, была ли колода уже обработана
      if (this.isDeckProcessed(username, createdAt, roundId)) {
        continue;
      }
      
      // Создаем данные колоды
      const deckData = {
        username: username,
        status: topPlayer.isHot ? 'Hot' : 'Top',
        isHot: topPlayer.isHot,
        appearances: topPlayer.appearances,
        cards: play.play ? play.play.map(card => card.cardId) : [],
        modifiers: play.modifiers || [],
        createdAt: createdAt,
        roundId: roundId,
        timestamp: new Date().toISOString()
      };
      
      // Проверяем, есть ли обновление существующей колоды
      const isUpdate = this.isDeckUpdate(username, roundId, createdAt);
      const hasExistingDeck = this.hasDeckInRound(username, roundId);
      
      if (isUpdate) {
        updatedDecks.push(deckData);
        console.log(`🔄 Обновление колоды для ${username} в раунде ${roundId}`);
      } else if (hasExistingDeck) {
        // Если есть колода в раунде, но время создания одинаковое - пропускаем
        console.log(`⏭️  Пропускаем дублированную колоду от ${username} в раунде ${roundId}`);
        continue;
      } else {
        newDecks.push(deckData);
        console.log(`🆕 Новая колода от ${username} в раунде ${roundId}`);
      }
      
      // Отмечаем как обработанную
      this.markDeckAsProcessed(username, createdAt, roundId);
      
      // Добавляем в историю
      this.addDeckToHistory(username, deckData);
    }
    
    // Сохраняем данные
    await this.saveProcessedDecks();
    await this.saveDeckHistory();
    
    return { newDecks, updatedDecks };
  }

  /**
   * Проверяет, является ли колода обновлением существующей
   */
  isDeckUpdate(username, roundId, createdAt) {
    if (!this.deckHistory.has(username)) {
      return false;
    }
    
    const history = this.deckHistory.get(username);
    
    // Ищем колоду с тем же roundId
    const existingDeck = history.find(deck => deck.roundId === roundId);
    
    if (existingDeck) {
      // Если время создания отличается, это обновление
      // Также проверяем, что новая колода создана позже
      const existingTime = new Date(existingDeck.createdAt);
      const newTime = new Date(createdAt);
      
      return existingTime.getTime() !== newTime.getTime() && newTime > existingTime;
    }
    
    return false;
  }

  /**
   * Проверяет, есть ли у игрока колода в текущем раунде
   */
  hasDeckInRound(username, roundId) {
    if (!this.deckHistory.has(username)) {
      return false;
    }
    
    const history = this.deckHistory.get(username);
    return history.some(deck => deck.roundId === roundId);
  }

  /**
   * Получает статистику трекера
   */
  getStats() {
    const totalProcessedDecks = Array.from(this.processedDecks.values())
      .reduce((sum, set) => sum + set.size, 0);
    
    const totalHistoryDecks = Array.from(this.deckHistory.values())
      .reduce((sum, decks) => sum + decks.length, 0);
    
    return {
      totalPlayers: this.processedDecks.size,
      totalProcessedDecks: totalProcessedDecks,
      totalHistoryDecks: totalHistoryDecks,
      playersWithHistory: this.deckHistory.size
    };
  }

  /**
   * Показывает статистику трекера
   */
  showStats() {
    const stats = this.getStats();
    
    console.log('\n📊 СТАТИСТИКА ТРЕКЕРА КОЛОД:');
    console.log('='.repeat(40));
    console.log(`👥 Игроков с обработанными колодами: ${stats.totalPlayers}`);
    console.log(`🃏 Всего обработано колод: ${stats.totalProcessedDecks}`);
    console.log(`📈 Игроков с историей: ${stats.playersWithHistory}`);
    console.log(`📚 Всего колод в истории: ${stats.totalHistoryDecks}`);
  }

  /**
   * Очищает старые данные (старше указанного количества дней)
   */
  async cleanOldData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let cleanedDecks = 0;
    let cleanedHistory = 0;
    
    // Очищаем обработанные колоды
    for (const [username, deckIds] of this.processedDecks) {
      const originalSize = deckIds.size;
      
      // Удаляем старые deckIds (это упрощенная логика)
      // В реальности нужно было бы парсить даты из deckIds
      
      if (deckIds.size !== originalSize) {
        cleanedDecks += (originalSize - deckIds.size);
      }
    }
    
    // Очищаем историю колод
    for (const [username, decks] of this.deckHistory) {
      const originalLength = decks.length;
      
      // Фильтруем колоды по дате
      const filteredDecks = decks.filter(deck => {
        const deckDate = new Date(deck.createdAt);
        return deckDate >= cutoffDate;
      });
      
      if (filteredDecks.length !== originalLength) {
        this.deckHistory.set(username, filteredDecks);
        cleanedHistory += (originalLength - filteredDecks.length);
      }
    }
    
    if (cleanedDecks > 0 || cleanedHistory > 0) {
      await this.saveProcessedDecks();
      await this.saveDeckHistory();
      console.log(`🧹 Очищено ${cleanedDecks} обработанных колод и ${cleanedHistory} записей истории`);
    }
  }
}

module.exports = DeckTracker;

