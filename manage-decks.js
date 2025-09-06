const DeckTracker = require('./utils/deckTracker');

/**
 * Скрипт для управления трекером колод
 * Позволяет просматривать статистику, очищать данные и т.д.
 */

async function showHelp() {
  console.log('🃏 Управление трекером колод Bullrun Tracker');
  console.log('='.repeat(50));
  console.log('');
  console.log('Доступные команды:');
  console.log('  node manage-decks.js stats      - Показать статистику');
  console.log('  node manage-decks.js clean      - Очистить старые данные');
  console.log('  node manage-decks.js history    - Показать историю игрока');
  console.log('  node manage-decks.js help       - Показать эту справку');
  console.log('');
}

async function showStats() {
  console.log('📊 Статистика трекера колод...\n');
  
  const deckTracker = new DeckTracker();
  await deckTracker.initialize();
  deckTracker.showStats();
}

async function cleanOldData() {
  console.log('🧹 Очистка старых данных...\n');
  
  const deckTracker = new DeckTracker();
  await deckTracker.initialize();
  
  const daysToKeep = process.argv[3] ? parseInt(process.argv[3]) : 30;
  console.log(`🗑️  Удаляем данные старше ${daysToKeep} дней...`);
  
  await deckTracker.cleanOldData(daysToKeep);
  
  console.log('✅ Очистка завершена!');
}

async function showHistory() {
  const username = process.argv[3];
  
  if (!username) {
    console.log('❌ Укажите имя пользователя: node manage-decks.js history <username>');
    return;
  }
  
  console.log(`📚 История колод для ${username}...\n`);
  
  const deckTracker = new DeckTracker();
  await deckTracker.initialize();
  
  if (!deckTracker.deckHistory.has(username)) {
    console.log(`⚠️  История для игрока ${username} не найдена`);
    return;
  }
  
  const history = deckTracker.deckHistory.get(username);
  
  console.log(`📊 Найдено ${history.length} колод:`);
  console.log('='.repeat(60));
  
  history.slice(0, 10).forEach((deck, index) => {
    console.log(`${index + 1}. Раунд ${deck.roundId} - ${deck.createdAt}`);
    console.log(`   Карты: ${deck.cards.join(', ')}`);
    console.log(`   Статус: ${deck.status} (${deck.appearances} появлений)`);
    if (deck.isUpdate) {
      console.log(`   🔄 Обновление: ${deck.updatedAt}`);
    }
    console.log('');
  });
  
  if (history.length > 10) {
    console.log(`... и еще ${history.length - 10} колод`);
  }
}

// Основная функция
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      await showStats();
      break;
      
    case 'clean':
      await cleanOldData();
      break;
      
    case 'history':
      await showHistory();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      await showHelp();
      break;
      
    default:
      console.log('❌ Неизвестная команда. Используйте "help" для справки.\n');
      await showHelp();
      process.exit(1);
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  showStats,
  cleanOldData,
  showHistory
};
