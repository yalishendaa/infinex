const { fetchMultipleLeaderboards } = require('./api/fetchLeaderboard');
const { fetchLivePlays, getCurrentRoundId } = require('./api/fetchLivePlays');
const { parseLeaderboard, generateRoundIds } = require('./utils/parseLeaderboard');
const { 
  matchTopPlayer, 
  analyzeCardSimilarity, 
  saveToJson, 
  loadFromJson,
  createDeckId,
  formatTimestamp 
} = require('./utils/matchPlayers');
const RoundManager = require('./utils/roundManager');
const DeckTracker = require('./utils/deckTracker');

class BullrunTracker {
  constructor() {
    this.roundManager = new RoundManager();
    this.deckTracker = new DeckTracker();
    this.hotPlayers = [];
    this.monitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Инициализация: сбор данных о топ-игроках
   */
  async initialize() {
    console.log('🚀 Инициализация Bullrun Tracker...');
    
    // Инициализируем менеджер раундов
    await this.roundManager.initialize();
    this.currentRoundId = this.roundManager.getCurrentRound();
    
    // Инициализируем трекер колод
    await this.deckTracker.initialize();
    
    console.log(`📅 Текущий раунд: ${this.currentRoundId}`);
    
    // Пытаемся загрузить сохраненные данные
    const savedData = await loadFromJson('topPlayers.json');
    if (savedData && savedData.hotPlayers && savedData.hotPlayers.length > 0) {
      console.log('📂 Загружены сохраненные данные о топ-игроках');
      console.log(`🔥 Найдено ${savedData.hotPlayers.length} Hot игроков из сохраненных данных`);
      this.hotPlayers = savedData.hotPlayers;
      
      // Проверяем, не устарели ли данные (старше 24 часов)
      const lastUpdated = new Date(savedData.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log(`✅ Данные актуальны (обновлены ${Math.round(hoursSinceUpdate)} часов назад)`);
        return;
      } else {
        console.log(`⚠️  Данные устарели (${Math.round(hoursSinceUpdate)} часов назад), пытаемся обновить...`);
      }
    }
    
    console.log('⚠️  API лидербордов требует авторизацию');
    console.log('💡 Для получения Hot игроков нужны сохраненные данные или авторизация');
    
    // Fallback: используем сохраненные данные если они есть
    if (savedData && savedData.hotPlayers && savedData.hotPlayers.length > 0) {
      console.log('🔄 Используем сохраненные данные о Hot игроках');
      this.hotPlayers = savedData.hotPlayers;
      console.log(`🔥 Загружено ${this.hotPlayers.length} Hot игроков из сохраненных данных`);
      this.printHotPlayers();
      return;
    } else {
      console.log('❌ Нет сохраненных данных о Hot игроках');
      console.log('💡 Скрипт будет работать в режиме мониторинга всех игроков');
      this.hotPlayers = []; // Пустой список - будем отслеживать всех
      return;
    }
  }

  /**
   * Выводит информацию о Hot игроках
   */
  printHotPlayers() {
    console.log('\n🔥 HOT ИГРОКИ:');
    console.log('='.repeat(50));
    
    this.hotPlayers.slice(0, 10).forEach((player, index) => {
      console.log(`${index + 1}. ${player.username}`);
      console.log(`   Появлений: ${player.appearances}`);
      console.log(`   Лучшая позиция: ${player.bestPosition || 'N/A'}`);
      console.log(`   Последний раунд: ${player.lastSeen}`);
      console.log(`   Карты: ${player.cards.slice(0, 5).join(', ')}${player.cards.length > 5 ? '...' : ''}`);
      console.log('');
    });
  }

  /**
   * Начинает мониторинг в реальном времени
   */
  startMonitoring() {
    if (this.monitoring) {
      console.log('⚠️  Мониторинг уже запущен');
      return;
    }
    
    console.log('👁️  Запуск мониторинга в реальном времени...');
    this.monitoring = true;
    
    // Первый запрос сразу
    this.checkForNewPlays();
    
    // Затем каждые 5 секунд
    this.monitoringInterval = setInterval(() => {
      this.checkForNewPlays();
    }, 5000);
  }

  /**
   * Останавливает мониторинг
   */
  stopMonitoring() {
    if (!this.monitoring) {
      console.log('⚠️  Мониторинг не запущен');
      return;
    }
    
    console.log('⏹️  Остановка мониторинга...');
    this.monitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Проверяет новые игры топ-игроков
   */
  async checkForNewPlays() {
    try {
      // Обновляем currentRoundId из менеджера раундов
      this.currentRoundId = this.roundManager.getCurrentRound();
      
      const latestPlays = await fetchLivePlays(this.currentRoundId);
      
      if (latestPlays.length === 0) {
        return;
      }
      
      console.log(`🔍 Проверяем ${latestPlays.length} последних игр...`);
      
      // Используем новый трекер колод для обработки
      const { newDecks, updatedDecks } = await this.deckTracker.processNewDecks(latestPlays, this.hotPlayers);
      
      // Логируем новые колоды
      for (const deckData of newDecks) {
        await this.logTopPlayerDeck(deckData);
      }
      
      // Логируем обновленные колоды
      for (const deckData of updatedDecks) {
        await this.logTopPlayerDeck(deckData, true);
      }
      
      if (newDecks.length > 0 || updatedDecks.length > 0) {
        console.log(`📊 Обработано: ${newDecks.length} новых, ${updatedDecks.length} обновленных колод`);
      }
      
    } catch (error) {
      console.error('❌ Ошибка при проверке новых игр:', error.message);
    }
  }

  /**
   * Логирует колоду топ-игрока
   */
  async logTopPlayerDeck(deckData, isUpdate = false) {
    const prefix = isUpdate ? '🔄 ОБНОВЛЕНИЕ КОЛОДЫ' : '🎯 НОВАЯ КОЛОДА ОТ ТОП-ИГРОКА!';
    
    console.log(`\n${prefix}`);
    console.log('='.repeat(40));
    console.log(`👤 Игрок: ${deckData.username}`);
    console.log(`🔥 Статус: ${deckData.status} (${deckData.appearances} появлений)`);
    console.log(`🃏 Карты: ${deckData.cards.join(', ')}`);
    console.log(`⚡ Модификаторы: ${deckData.modifiers.join(', ') || 'Нет'}`);
    console.log(`⏰ Время: ${deckData.createdAt}`);
    console.log(`🎮 Раунд: ${deckData.roundId}`);
    
    if (isUpdate) {
      console.log(`🔄 Тип: Обновление существующей колоды`);
    }
    
    // Сохраняем в файл
    const logFilename = `round${deckData.roundId}.json`;
    await this.saveDeckLog(logFilename, deckData);
  }

  /**
   * Сохраняет лог колоды в файл
   */
  async saveDeckLog(filename, deckData) {
    try {
      const filePath = `./data/logs/${filename}`;
      let existingData = [];
      
      try {
        const fs = require('fs').promises;
        const data = await fs.readFile(filePath, 'utf8');
        existingData = JSON.parse(data);
      } catch (error) {
        // Файл не существует, создаем новый
      }
      
      existingData.push(deckData);
      
      const fs = require('fs').promises;
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf8');
      
      console.log(`💾 Лог сохранен в ${filename}`);
    } catch (error) {
      console.error('❌ Ошибка при сохранении лога:', error.message);
    }
  }

  /**
   * Показывает статистику
   */
  showStats() {
    console.log('\n📊 СТАТИСТИКА:');
    console.log('='.repeat(30));
    console.log(`🔥 Hot игроков: ${this.hotPlayers.length}`);
    console.log(`👁️  Мониторинг: ${this.monitoring ? 'Активен' : 'Остановлен'}`);
    console.log(`🎮 Текущий раунд: ${this.currentRoundId}`);
    
    // Показываем статус менеджера раундов
    this.roundManager.showStatus();
    
    // Показываем статистику трекера колод
    this.deckTracker.showStats();
  }
}

// Основная функция
async function main() {
  const tracker = new BullrunTracker();
  
  // Обработка сигналов для корректного завершения
  process.on('SIGINT', () => {
    console.log('\n👋 Завершение работы...');
    tracker.stopMonitoring();
    tracker.roundManager.stopRoundUpdateCheck();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Завершение работы...');
    tracker.stopMonitoring();
    tracker.roundManager.stopRoundUpdateCheck();
    process.exit(0);
  });
  
  try {
    // Инициализация
    await tracker.initialize();
    
    // Показываем статистику
    tracker.showStats();
    
    // Запускаем мониторинг
    console.log('\n🚀 Запуск мониторинга...');
    console.log('💡 Нажмите Ctrl+C для остановки');
    tracker.startMonitoring();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  main();
}

module.exports = BullrunTracker;
