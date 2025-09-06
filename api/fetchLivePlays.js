const axios = require('axios');

/**
 * Получает последние собранные колоды для текущего раунда
 * @param {number} roundId - ID текущего раунда
 * @returns {Promise<Array>} Массив последних игр
 */
async function fetchLivePlays(roundId) {
  try {
    const url = 'https://api.app.infinex.xyz/cardrunGetLatestRoundPlays';
    const params = {
      batch: 1,
      input: JSON.stringify({
        "0": { roundId: roundId }
      })
    };

    const response = await axios.get(url, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://app.infinex.xyz/',
        'Origin': 'https://app.infinex.xyz',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.data && response.data[0] && response.data[0].result && response.data[0].result.data && response.data[0].result.data.latestPlays) {
      const latestPlays = response.data[0].result.data.latestPlays;
      console.log(`🎮 Получено ${latestPlays.length} последних игр для раунда ${roundId}`);
      return latestPlays;
    } else {
      console.log(`⚠️  Пустой ответ для раунда ${roundId}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Ошибка при получении последних игр для раунда ${roundId}:`, error.message);
    return [];
  }
}

/**
 * Получает текущий раунд из API
 * @returns {Promise<number>} ID текущего раунда
 */
async function getCurrentRoundId() {
  try {
    // Пытаемся получить currentRoundId из API с новыми колодами
    // Используем раунд 999999 как "текущий" для получения метаданных
    const url = 'https://api.app.infinex.xyz/cardrunGetLatestRoundPlays';
    const params = {
      batch: 1,
      input: JSON.stringify({
        "0": { roundId: 999999 } // Специальный ID для получения текущего раунда
      })
    };

    const response = await axios.get(url, { params });
    
    if (response.data && response.data[0]) {
      // Ищем currentRoundId в ответе
      const data = response.data[0];
      
      // Проверяем различные возможные поля
      if (data.currentRoundId) {
        console.log(`🎯 Текущий раунд из API: ${data.currentRoundId}`);
        return data.currentRoundId;
      }
      
      // Если currentRoundId не найден, пытаемся определить из latestPlays
      if (data.latestPlays && data.latestPlays.length > 0) {
        const maxRoundId = Math.max(...data.latestPlays.map(play => play.roundId || 0));
        if (maxRoundId > 0) {
          console.log(`🎯 Текущий раунд из latestPlays: ${maxRoundId}`);
          return maxRoundId;
        }
      }
    }
    
    // Fallback: возвращаем сохраненное значение или дефолтное
    const savedRoundId = await getSavedCurrentRoundId();
    console.log(`🎯 Используем сохраненный раунд: ${savedRoundId}`);
    return savedRoundId;
    
  } catch (error) {
    console.error('❌ Ошибка при получении currentRoundId:', error.message);
    // Fallback к сохраненному значению
    const savedRoundId = await getSavedCurrentRoundId();
    console.log(`🎯 Fallback к сохраненному раунду: ${savedRoundId}`);
    return savedRoundId;
  }
}

/**
 * Получает сохраненный currentRoundId из файла
 * @returns {Promise<number>} Сохраненный ID раунда
 */
async function getSavedCurrentRoundId() {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'data', 'currentRound.json');
    
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    return config.currentRoundId || 359; // Дефолтное значение
  } catch (error) {
    console.log('⚠️  Файл конфигурации раунда не найден, используем дефолтное значение');
    return 359; // Дефолтное значение
  }
}

/**
 * Сохраняет currentRoundId в файл
 * @param {number} roundId - ID раунда для сохранения
 */
async function saveCurrentRoundId(roundId) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, '..', 'data', 'currentRound.json');
    
    const config = {
      currentRoundId: roundId,
      lastUpdated: new Date().toISOString(),
      timezone: 'UTC'
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`💾 Сохранен currentRoundId: ${roundId}`);
  } catch (error) {
    console.error('❌ Ошибка при сохранении currentRoundId:', error.message);
  }
}

module.exports = {
  fetchLivePlays,
  getCurrentRoundId,
  saveCurrentRoundId,
  getSavedCurrentRoundId
};
