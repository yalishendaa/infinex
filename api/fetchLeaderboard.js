const axios = require('axios');

/**
 * Получает топ-20 игроков для указанного раунда с повторными попытками
 * @param {number} roundId - ID раунда
 * @param {number} retries - Количество повторных попыток
 * @returns {Promise<Array>} Массив игроков из leaderboard
 */
async function fetchLeaderboard(roundId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = 'https://api.app.infinex.xyz/cardrunGetRoundLeaderboard,cardrunGetRoundRealtimeLeaderboard';
      const params = {
        batch: 1,
        input: JSON.stringify({
          "0": { roundId: roundId },
          "1": { roundId: roundId }
        })
      };

      console.log(`📊 Запрашиваем лидерборд для раунда ${roundId} (попытка ${attempt}/${retries})...`);
      
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
      
      // Проверяем оба ответа (leaderboard и realtime leaderboard)
      let leaderboard = [];
      
      if (response.data && response.data[0] && response.data[0].leaderboard) {
        leaderboard = response.data[0].leaderboard;
        console.log(`✅ Получено ${leaderboard.length} игроков из leaderboard для раунда ${roundId}`);
      } else if (response.data && response.data[1] && response.data[1].leaderboard) {
        leaderboard = response.data[1].leaderboard;
        console.log(`✅ Получено ${leaderboard.length} игроков из realtime leaderboard для раунда ${roundId}`);
      } else {
        console.log(`⚠️  Пустой ответ для раунда ${roundId}`);
        return [];
      }
      
      return leaderboard;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`🔒 API заблокировал запрос для раунда ${roundId} (401). Попытка ${attempt}/${retries}`);
        if (attempt < retries) {
          const delayTime = attempt * 15000; // Увеличиваем задержку с каждой попыткой (15с, 30с, 45с)
          console.log(`⏳ Ожидание ${delayTime/1000} сек перед повторной попыткой...`);
          await delay(delayTime);
        }
      } else {
        console.error(`❌ Ошибка при получении лидерборда для раунда ${roundId}:`, error.message);
        return [];
      }
    }
  }
  
  console.log(`❌ Не удалось получить лидерборд для раунда ${roundId} после ${retries} попыток`);
  return [];
}

/**
 * Задержка между запросами
 * @param {number} ms - Миллисекунды для задержки
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Получает лидерборды для нескольких раундов последовательно с задержками
 * @param {Array<number>} roundIds - Массив ID раундов
 * @returns {Promise<Array>} Массив всех игроков из всех раундов
 */
async function fetchMultipleLeaderboards(roundIds) {
  console.log(`🚀 Запрашиваем лидерборды для ${roundIds.length} раундов...`);
  
  const allPlayers = [];
  const delayBetweenRequests = 2000; // 2 секунды между запросами
  
  for (let i = 0; i < roundIds.length; i++) {
    const roundId = roundIds[i];
    console.log(`📊 Запрашиваем лидерборд для раунда ${roundId} (${i + 1}/${roundIds.length})...`);
    
    try {
      const leaderboard = await fetchLeaderboard(roundId);
      allPlayers.push(...leaderboard);
      
      // Задержка между запросами (кроме последнего)
      if (i < roundIds.length - 1) {
        console.log(`⏳ Ожидание ${delayBetweenRequests/1000} сек перед следующим запросом...`);
        await delay(delayBetweenRequests);
      }
    } catch (error) {
      console.error(`❌ Ошибка при получении раунда ${roundId}:`, error.message);
      // Продолжаем с следующим раундом
    }
  }
  
  console.log(`📈 Всего получено ${allPlayers.length} записей игроков`);
  return allPlayers;
}

module.exports = {
  fetchLeaderboard,
  fetchMultipleLeaderboards
};
