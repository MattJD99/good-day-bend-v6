const syncFavorites = require('../functions/workflows/sync_favorites');

async function runManualSync() {
    console.log("🛠️ Manually triggering favorites sync...");
    await syncFavorites();
    console.log("🏁 Manual sync complete.");
}

runManualSync();
