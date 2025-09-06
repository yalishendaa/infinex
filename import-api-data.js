const fs = require('fs').promises;

/**
 * Импортирует данные лидерборда из файла api-data.json
 * Использование: node import-api-data.js
 */

async function importApiData() {
  console.log('📋 Импорт данных лидерборда из файла');
  console.log('=====================================');
  
  try {
    // Читаем данные из файла
    const data = await fs.readFile('api-data.json', 'utf8');
    
    // Парсим несколько JSON массивов подряд
    const apiResponses = [];
    const lines = data.trim().split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line.trim());
          // Проверяем, что это массив с данными лидерборда
          if (Array.isArray(parsed) && parsed.length > 0 && 
              parsed[0].result && parsed[0].result.data && parsed[0].result.data.leaderboard) {
            apiResponses.push(parsed);
            console.log(`✅ Успешно распарсен ответ API: ${parsed[0].result.data.leaderboard.length} игроков`);
          } else {
            console.log(`⚠️  Строка не содержит данные лидерборда: ${line.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`⚠️  Ошибка парсинга JSON: ${error.message}`);
          console.log(`   Строка: ${line.substring(0, 100)}...`);
        }
      }
    }
    
    console.log(`📂 Данные загружены из api-data.json: ${apiResponses.length} ответов API`);
    
    // Извлекаем игроков из всех ответов
    const allPlayers = [];
    
    apiResponses.forEach((apiResponse, responseIndex) => {
      // Обрабатываем каждый элемент массива (каждый раунд в ответе)
      if (Array.isArray(apiResponse)) {
        apiResponse.forEach((roundData, roundIndex) => {
          if (roundData.result && roundData.result.data && roundData.result.data.leaderboard) {
            const leaderboard = roundData.result.data.leaderboard;
            console.log(`📊 Ответ ${responseIndex + 1}, раунд ${roundIndex + 1}: ${leaderboard.length} игроков`);
            
            leaderboard.forEach(player => {
              // Исключаем пользователя "Seal"
              if (player.username.toLowerCase() === 'seal') {
                console.log(`🚫 Исключаем пользователя: ${player.username}`);
                return;
              }
              
              allPlayers.push({
                username: player.username,
                userId: player.userId,
                points: player.points,
                position: player.position,
                roundId: 355 + responseIndex + roundIndex, // Предполагаем последовательные раунды
                cards: player.play ? player.play.map(card => card.cardId) : []
              });
            });
          }
        });
      }
    });
    
    console.log(`📈 Всего получено ${allPlayers.length} записей игроков`);
    
    // Группируем игроков по username и считаем появления
    const playerStats = {};
    
    allPlayers.forEach(player => {
      if (!playerStats[player.username]) {
        playerStats[player.username] = {
          username: player.username,
          userId: player.userId,
          appearances: 0,
          rounds: [],
          totalPoints: 0,
          bestPosition: Infinity,
          cards: []
        };
      }
      
      playerStats[player.username].appearances++;
      playerStats[player.username].rounds.push(player.roundId);
      playerStats[player.username].totalPoints += player.points;
      playerStats[player.username].bestPosition = Math.min(playerStats[player.username].bestPosition, player.position);
      
      // Добавляем карты (убираем дубликаты)
      if (player.cards) {
        player.cards.forEach(card => {
          if (!playerStats[player.username].cards.includes(card)) {
            playerStats[player.username].cards.push(card);
          }
        });
      }
    });
    
    // Создаем список Hot игроков (появляются больше 1 раза)
    const hotPlayers = Object.values(playerStats)
      .filter(player => player.appearances > 1)
      .map(player => ({
        username: player.username,
        isHot: true,
        appearances: player.appearances,
        rounds: player.rounds.sort((a, b) => b - a), // Сортируем по убыванию
        totalPoints: Math.round(player.totalPoints),
        bestPosition: player.bestPosition,
        cards: player.cards
      }))
      .sort((a, b) => b.appearances - a.appearances); // Сортируем по количеству появлений
    
    // Создаем список обычных игроков
    const regularPlayers = Object.values(playerStats)
      .filter(player => player.appearances === 1)
      .map(player => ({
        username: player.username,
        isHot: false,
        appearances: 1,
        rounds: player.rounds,
        totalPoints: Math.round(player.totalPoints),
        bestPosition: player.bestPosition,
        cards: player.cards
      }))
      .sort((a, b) => a.bestPosition - b.bestPosition); // Сортируем по лучшей позиции
    
    const dataToSave = {
      hotPlayers: hotPlayers,
      regularPlayers: regularPlayers,
      analysis: {
        totalUniquePlayers: Object.keys(playerStats).length,
        hotPlayersCount: hotPlayers.length,
        regularPlayersCount: regularPlayers.length,
        totalRecords: allPlayers.length
      },
      lastUpdated: new Date().toISOString(),
      roundIds: Array.from(new Set(allPlayers.map(p => p.roundId))).sort((a, b) => b - a)
    };
    
    // Сохраняем файл
    await fs.writeFile('data/topPlayers.json', JSON.stringify(dataToSave, null, 2));
    
    console.log('\n✅ Файл data/topPlayers.json создан!');
    console.log(`📊 Уникальных игроков: ${Object.keys(playerStats).length}`);
    console.log(`🔥 Hot игроков: ${hotPlayers.length}`);
    console.log(`👥 Обычных игроков: ${regularPlayers.length}`);
    console.log(`📈 Всего записей: ${allPlayers.length}`);
    console.log(`🎮 Раунды: ${dataToSave.roundIds.join(', ')}`);
    
    if (hotPlayers.length > 0) {
      console.log('\n🔥 ТОП Hot игроков:');
      hotPlayers.slice(0, 10).forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.username} (${player.appearances} появлений, лучшая позиция: ${player.bestPosition})`);
        console.log(`     Раунды: ${player.rounds.join(', ')}`);
        console.log(`     Карты: ${player.cards.join(', ')}`);
      });
    }
    
    console.log('\n🚀 Теперь можно запустить: npm start');
    
  } catch (error) {
    console.error('❌ Ошибка при импорте данных:', error.message);
    console.log('\n💡 Создайте файл api-data.json с ответами API лидербордов');
    console.log('   Формат: массив ответов API, например:');
    console.log('   [');
    console.log('     [{"result":{"data":{"leaderboard":[...]}}}],');
    console.log('     [{"result":{"data":{"leaderboard":[...]}}}]');
    console.log('   ]');
  }
}

// Запускаем импорт
importApiData().catch(console.error);
