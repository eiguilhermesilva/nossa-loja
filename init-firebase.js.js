// init-firebase.js
async function initializeFirebase() {
    try {
        // Verificar se o Firebase está configurado
        if (!firebaseConfig || !firebaseConfig.apiKey) {
            console.warn('Firebase não configurado. Usando modo offline.');
            return false;
        }
        
        // Inicializar serviços
        await Promise.all([
            FirebaseService.loadFromCloud(),
            Database.loadFromCloud()
        ]);
        
        // Verificar pendentes
        const pendingCount = Database.getPendingSyncCount();
        if (pendingCount > 0) {
            showNotification(`Há ${pendingCount} ação(ões) pendentes de sincronização`, 'info');
            
            // Marcar botão de sync
            const syncBtn = document.querySelector('.btn-sync');
            if (syncBtn) {
                syncBtn.classList.add('has-pending');
            }
        }
        
        console.log('Firebase inicializado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        showNotification('Modo offline ativado. Trabalhando com dados locais.', 'warning');
        return false;
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', async function() {
    // Carregar dados locais primeiro (para velocidade)
    loadLocalData();
    
    // Inicializar Firebase (assíncrono)
    setTimeout(() => initializeFirebase(), 1000);
});