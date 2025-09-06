/**
 * Анализирует данные лидербордов и определяет топ-игроков
 * @param {Array} allPlayers - Массив всех игроков из всех раундов
 * @returns {Object} Объект с анализом игроков
 */
function parseLeaderboard(allPlayers) {
  console.log('🔍 Анализируем данные лидербордов...');
  
  // Собираем статистику по игрокам
  const playerStats = new Map();
  const uniquePlayers = new Set();
  
  allPlayers.forEach(player => {
    const username = player.username;
    uniquePlayers.add(username);
    
    if (!playerStats.has(username)) {
      playerStats.set(username, {
        username: username,
        appearances: 0,
        totalPoints: 0,
        bestPosition: Infinity,
        rounds: [],
        cards: new Set()
      });
    }
    
    const stats = playerStats.get(username);
    stats.appearances++;
    stats.totalPoints += player.points || 0;
    stats.bestPosition = Math.min(stats.bestPosition, player.position || Infinity);
    stats.rounds.push(player.roundId || 'unknown');
    
    // Собираем карты игрока
    if (player.play && Array.isArray(player.play)) {
      player.play.forEach(card => {
        if (card.cardId) {
          stats.cards.add(card.cardId);
        }
      });
    }
  });
  
  // Определяем "Hot" игроков (появлялись 2+ раза)
  const hotPlayers = [];
  const regularPlayers = [];
  
  playerStats.forEach((stats, username) => {
    const playerData = {
      username: stats.username,
      isHot: stats.appearances >= 2,
      appearances: stats.appearances,
      totalPoints: stats.totalPoints,
      bestPosition: stats.bestPosition === Infinity ? null : stats.bestPosition,
      rounds: stats.rounds,
      cards: Array.from(stats.cards),
      lastSeen: Math.max(...stats.rounds.filter(r => typeof r === 'number'))
    };
    
    if (playerData.isHot) {
      hotPlayers.push(playerData);
    } else {
      regularPlayers.push(playerData);
    }
  });
  
  // Сортируем Hot игроков по количеству появлений
  hotPlayers.sort((a, b) => b.appearances - a.appearances);
  
  console.log(`📊 Анализ завершен:`);
  console.log(`   • Всего уникальных игроков: ${uniquePlayers.size}`);
  console.log(`   • Hot игроков (2+ появлений): ${hotPlayers.length}`);
  console.log(`   • Обычных игроков: ${regularPlayers.length}`);
  
  return {
    hotPlayers,
    regularPlayers,
    totalUniquePlayers: uniquePlayers.size,
    allPlayers: Array.from(playerStats.values())
  };
}

/**
 * Создает список раундов для анализа
 * @param {number} currentRoundId - ID текущего раунда
 * @param {number} roundsCount - Количество раундов для анализа (по умолчанию 10)
 * @returns {Array<number>} Массив ID раундов
 */
function generateRoundIds(currentRoundId, roundsCount = 10) {
  const roundIds = [];
  // Генерируем раунды от currentRoundId до currentRoundId - 9
  // Например, если currentRoundId = 357, то получаем [357, 356, 355, 354, 353, 352, 351, 350, 349, 348]
  for (let i = 0; i < roundsCount; i++) {
    roundIds.push(currentRoundId - i);
  }
  return roundIds;
}

module.exports = {
  parseLeaderboard,
  generateRoundIds
};
