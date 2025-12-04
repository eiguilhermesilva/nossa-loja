// components/sync-panel.js
let syncPanelVisible = false;

function toggleSyncPanel() {
    const panel = document.getElementById('sync-panel');
    syncPanelVisible = !syncPanelVisible;
    panel.style.display = syncPanelVisible ? 'block' : 'none';
    
    if (syncPanelVisible) {
        updateSyncStatus();
    }
}

function updateSyncStatus() {
    document.getElementById('connection-status').innerHTML = Database.isOnline() 
        ? '<i class="fas fa-wifi" style="color: #4caf50;"></i> Online'
        : '<i class="fas fa-wifi-slash" style="color: #f44336;"></i> Offline';
    
    document.getElementById('pending-count').textContent = Database.getPendingSyncCount();
    
    const lastSync = localStorage.getItem('lastSync');
    document.getElementById('last-sync').textContent = lastSync 
        ? new Date(lastSync).toLocaleString('pt-BR')
        : 'Nunca';
}

async function syncNow() {
    showNotification('Iniciando sincronização...', 'info');
    
    const success = await Database.syncAll();
    
    if (success) {
        localStorage.setItem('lastSync', new Date().toISOString());
        updateSyncStatus();
    }
}

async function loadFromCloud() {
    if (!confirm('Isso substituirá seus dados locais pelos dados da nuvem. Continuar?')) {
        return;
    }
    
    showNotification('Carregando dados da nuvem...', 'info');
    await Database.loadFromCloud();
    updateSyncStatus();
    
    // Recarregar a página para atualizar dados
    setTimeout(() => location.reload(), 1000);
}

async function createBackup() {
    showNotification('Criando backup...', 'info');
    await Database.createBackup();
}

function showRestoreDialog() {
    document.getElementById('backup-file-input').click();
}

// Configurar evento do input de arquivo
document.getElementById('backup-file-input').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    if (!confirm(`Restaurar backup ${file.name}? Todos os dados atuais serão substituídos.`)) {
        return;
    }
    
    try {
        await Database.restoreBackup(file);
        showNotification('Backup restaurado com sucesso!', 'success');
        updateSyncStatus();
        
        // Limpar input
        e.target.value = '';
        
        // Recarregar página
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showNotification('Erro ao restaurar backup', 'error');
    }
});

// Adicionar ao Dashboard
function addSyncButtonToDashboard() {
    const headerActions = document.querySelector('.header-actions');
    
    if (headerActions) {
        const syncButton = document.createElement('button');
        syncButton.className = 'btn-sync';
        syncButton.innerHTML = '<i class="fas fa-cloud"></i>';
        syncButton.title = 'Sincronização';
        syncButton.onclick = toggleSyncPanel;
        
        headerActions.appendChild(syncButton);
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    addSyncButtonToDashboard();
    
    // Inicializar serviço Firebase
    if (typeof FirebaseService !== 'undefined') {
        // Atualizar status periodicamente
        setInterval(updateSyncStatus, 30000);
        
        // Verificar pendentes a cada minuto se estiver online
        setInterval(() => {
            if (Database.isOnline() && Database.getPendingSyncCount() > 0) {
                Database.processPendingSync();
            }
        }, 60000);
    }
});