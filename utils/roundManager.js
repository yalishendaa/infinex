const { saveCurrentRoundId, getSavedCurrentRoundId } = require('../api/fetchLivePlays');

class RoundManager {
  constructor() {
    this.currentRoundId = null;
    this.lastUpdateDate = null;
    this.updateInterval = null;
  }

  /**
   * Инициализирует менеджер раундов
   */
  async initialize() {
    console.log('🕐 Инициализация менеджера раундов...');
    
    // Загружаем сохраненный раунд
    this.currentRoundId = await getSavedCurrentRoundId();
    this.lastUpdateDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log(`📅 Текущий раунд: ${this.currentRoundId}`);
    console.log(`📅 Последнее обновление: ${this.lastUpdateDate}`);
    
    // Запускаем проверку обновления раунда
    this.startRoundUpdateCheck();
  }

  /**
   * Запускает проверку обновления раунда в 00:00 UTC
   */
  startRoundUpdateCheck() {
    console.log('⏰ Запуск проверки обновления раунда...');
    
    // Проверяем каждую минуту, не наступило ли 00:00 UTC
    this.updateInterval = setInterval(() => {
      this.checkForRoundUpdate();
    }, 60000); // Каждую минуту
    
    // Первая проверка сразу
    this.checkForRoundUpdate();
  }

  /**
   * Останавливает проверку обновления раунда
   */
  stopRoundUpdateCheck() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️  Остановлена проверка обновления раунда');
    }
  }

  /**
   * Проверяет, нужно ли обновить раунд (в 00:00 UTC)
   */
  checkForRoundUpdate() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const currentDate = utcNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = utcNow.getUTCHours();
    const currentMinute = utcNow.getUTCMinutes();
    
    // Проверяем, наступило ли 00:00 UTC
    if (currentHour === 0 && currentMinute === 0) {
      // Проверяем, не обновляли ли мы уже сегодня
      if (this.lastUpdateDate !== currentDate) {
        this.updateRound();
        this.lastUpdateDate = currentDate;
      }
    }
  }

  /**
   * Обновляет раунд (+1) и сохраняет в файл
   */
  async updateRound() {
    const oldRoundId = this.currentRoundId;
    this.currentRoundId += 1;
    
    console.log(`🔄 Обновление раунда: ${oldRoundId} → ${this.currentRoundId}`);
    console.log(`⏰ Время обновления: ${new Date().toISOString()}`);
    
    // Сохраняем новый раунд
    await saveCurrentRoundId(this.currentRoundId);
    
    // Логируем событие
    this.logRoundUpdate(oldRoundId, this.currentRoundId);
  }

  /**
   * Логирует обновление раунда
   */
  async logRoundUpdate(oldRoundId, newRoundId) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const logPath = path.join(__dirname, '..', 'data', 'logs', 'roundUpdates.json');
      
      let updates = [];
      
      // Читаем существующие обновления
      try {
        const data = await fs.readFile(logPath, 'utf8');
        updates = JSON.parse(data);
      } catch (error) {
        // Файл не существует, создаем новый
      }
      
      // Добавляем новое обновление
      updates.push({
        oldRoundId: oldRoundId,
        newRoundId: newRoundId,
        updatedAt: new Date().toISOString(),
        timezone: 'UTC'
      });
      
      // Сохраняем
      await fs.writeFile(logPath, JSON.stringify(updates, null, 2), 'utf8');
      
      console.log(`📝 Лог обновления раунда сохранен`);
    } catch (error) {
      console.error('❌ Ошибка при логировании обновления раунда:', error.message);
    }
  }

  /**
   * Получает текущий раунд
   */
  getCurrentRound() {
    return this.currentRoundId;
  }

  /**
   * Принудительно обновляет раунд (для тестирования)
   */
  async forceUpdateRound() {
    console.log('🔧 Принудительное обновление раунда...');
    await this.updateRound();
  }

  /**
   * Получает информацию о следующем обновлении
   */
  getNextUpdateInfo() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    
    // Следующее обновление в 00:00 UTC завтра
    const nextUpdate = new Date(utcNow);
    nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
    nextUpdate.setUTCHours(0, 0, 0, 0);
    
    const timeUntilUpdate = nextUpdate.getTime() - utcNow.getTime();
    const hours = Math.floor(timeUntilUpdate / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilUpdate % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      nextUpdate: nextUpdate.toISOString(),
      timeUntilUpdate: `${hours}ч ${minutes}м`,
      currentRound: this.currentRoundId,
      nextRound: this.currentRoundId + 1
    };
  }

  /**
   * Показывает статус менеджера раундов
   */
  showStatus() {
    const nextUpdateInfo = this.getNextUpdateInfo();
    
    console.log('\n🕐 СТАТУС МЕНЕДЖЕРА РАУНДОВ:');
    console.log('='.repeat(40));
    console.log(`📅 Текущий раунд: ${this.currentRoundId}`);
    console.log(`📅 Последнее обновление: ${this.lastUpdateDate}`);
    console.log(`⏰ Следующее обновление: ${nextUpdateInfo.nextUpdate}`);
    console.log(`⏳ Время до обновления: ${nextUpdateInfo.timeUntilUpdate}`);
    console.log(`🎯 Следующий раунд: ${nextUpdateInfo.nextRound}`);
    console.log(`🔄 Автообновление: ${this.updateInterval ? 'Активно' : 'Остановлено'}`);
  }
}

module.exports = RoundManager;
