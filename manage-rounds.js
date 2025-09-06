const RoundManager = require('./utils/roundManager');

/**
 * Скрипт для управления раундами
 * Позволяет просматривать статус, принудительно обновлять раунды и т.д.
 */

async function showHelp() {
  console.log('🎮 Управление раундами Bullrun Tracker');
  console.log('='.repeat(50));
  console.log('');
  console.log('Доступные команды:');
  console.log('  node manage-rounds.js status     - Показать статус');
  console.log('  node manage-rounds.js update     - Принудительно обновить раунд');
  console.log('  node manage-rounds.js next       - Показать информацию о следующем обновлении');
  console.log('  node manage-rounds.js help       - Показать эту справку');
  console.log('');
}

async function showStatus() {
  console.log('📊 Статус менеджера раундов...\n');
  
  const roundManager = new RoundManager();
  await roundManager.initialize();
  roundManager.showStatus();
}

async function forceUpdate() {
  console.log('🔧 Принудительное обновление раунда...\n');
  
  const roundManager = new RoundManager();
  await roundManager.initialize();
  
  const oldRound = roundManager.getCurrentRound();
  await roundManager.forceUpdateRound();
  const newRound = roundManager.getCurrentRound();
  
  console.log(`✅ Раунд обновлен: ${oldRound} → ${newRound}`);
}

async function showNextUpdate() {
  console.log('⏰ Информация о следующем обновлении...\n');
  
  const roundManager = new RoundManager();
  await roundManager.initialize();
  
  const nextUpdateInfo = roundManager.getNextUpdateInfo();
  
  console.log('📅 СЛЕДУЮЩЕЕ ОБНОВЛЕНИЕ:');
  console.log('='.repeat(30));
  console.log(`🎯 Текущий раунд: ${nextUpdateInfo.currentRound}`);
  console.log(`🎯 Следующий раунд: ${nextUpdateInfo.nextRound}`);
  console.log(`⏰ Время обновления: ${nextUpdateInfo.nextUpdate}`);
  console.log(`⏳ Время до обновления: ${nextUpdateInfo.timeUntilUpdate}`);
}

// Основная функция
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await showStatus();
      break;
      
    case 'update':
      await forceUpdate();
      break;
      
    case 'next':
      await showNextUpdate();
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
  showStatus,
  forceUpdate,
  showNextUpdate
};
