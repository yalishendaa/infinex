const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'data', 'logs');
    this.ensureLogDirectory();
  }

  /**
   * Создает директорию для логов если её нет
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Ошибка при создании директории логов:', error.message);
    }
  }

  /**
   * Логирует информацию о колоде топ-игрока
   * @param {Object} deckData - Данные колоды
   */
  async logDeck(deckData) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `decks_${timestamp}.json`;
    const filePath = path.join(this.logDir, filename);
    
    try {
      let existingData = [];
      
      // Читаем существующие данные
      try {
        const data = await fs.readFile(filePath, 'utf8');
        existingData = JSON.parse(data);
      } catch (error) {
        // Файл не существует, создаем новый
      }
      
      // Добавляем новую запись
      existingData.push({
        ...deckData,
        loggedAt: new Date().toISOString()
      });
      
      // Сохраняем
      await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf8');
      
      console.log(`📝 Лог колоды сохранен в ${filename}`);
    } catch (error) {
      console.error('Ошибка при сохранении лога колоды:', error.message);
    }
  }

  /**
   * Логирует общую статистику
   * @param {Object} stats - Статистика
   */
  async logStats(stats) {
    const filename = 'stats.json';
    const filePath = path.join(this.logDir, filename);
    
    try {
      let existingStats = {};
      
      // Читаем существующие данные
      try {
        const data = await fs.readFile(filePath, 'utf8');
        existingStats = JSON.parse(data);
      } catch (error) {
        // Файл не существует, создаем новый
      }
      
      // Обновляем статистику
      const updatedStats = {
        ...existingStats,
        lastUpdate: new Date().toISOString(),
        ...stats
      };
      
      // Сохраняем
      await fs.writeFile(filePath, JSON.stringify(updatedStats, null, 2), 'utf8');
      
      console.log('📊 Статистика обновлена');
    } catch (error) {
      console.error('Ошибка при сохранении статистики:', error.message);
    }
  }

  /**
   * Получает логи за определенный период
   * @param {string} startDate - Начальная дата (YYYY-MM-DD)
   * @param {string} endDate - Конечная дата (YYYY-MM-DD)
   * @returns {Array} Массив логов
   */
  async getLogs(startDate, endDate) {
    const logs = [];
    
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.startsWith('decks_') && file.endsWith('.json'));
      
      for (const file of logFiles) {
        const fileDate = file.replace('decks_', '').replace('.json', '');
        
        if (fileDate >= startDate && fileDate <= endDate) {
          const filePath = path.join(this.logDir, file);
          const data = await fs.readFile(filePath, 'utf8');
          const fileLogs = JSON.parse(data);
          logs.push(...fileLogs);
        }
      }
    } catch (error) {
      console.error('Ошибка при чтении логов:', error.message);
    }
    
    return logs;
  }

  /**
   * Очищает старые логи (старше указанного количества дней)
   * @param {number} daysToKeep - Количество дней для хранения
   */
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(file => file.startsWith('decks_') && file.endsWith('.json'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      for (const file of logFiles) {
        const fileDate = file.replace('decks_', '').replace('.json', '');
        const fileDateObj = new Date(fileDate);
        
        if (fileDateObj < cutoffDate) {
          const filePath = path.join(this.logDir, file);
          await fs.unlink(filePath);
          console.log(`🗑️  Удален старый лог: ${file}`);
        }
      }
    } catch (error) {
      console.error('Ошибка при очистке старых логов:', error.message);
    }
  }
}

module.exports = Logger;
