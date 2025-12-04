// services/firebase-service.js
class FirebaseService {
    constructor() {
        this.db = firebaseApp.db;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        
        // Monitorar conexão
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Carregar pendentes do localStorage
        this.loadPendingSync();
    }
    
    // Coleções do Firestore
    collections = {
        produtos: 'produtos',
        vendas: 'vendas',
        movimentacoes: 'movimentacoes',
        config: 'configuracoes',
        usuarios: 'usuarios'
    };
    
    // ========== MÉTODOS DE SINCRONIZAÇÃO ==========
    
    async syncAllData() {
        if (!this.isOnline) {
            showNotification('Sem conexão. Dados serão sincronizados quando online.', 'warning');
            return false;
        }
        
        try {
            // Sincronizar dados locais para a nuvem
            await Promise.all([
                this.syncProdutos(),
                this.syncVendas(),
                this.syncMovimentacoes(),
                this.syncConfiguracoes()
            ]);
            
            // Sincronizar pendentes
            await this.processPendingSync();
            
            showNotification('Todos os dados sincronizados com a nuvem! ✅', 'success');
            return true;
        } catch (error) {
            console.error('Erro na sincronização completa:', error);
            showNotification('Erro na sincronização', 'error');
            return false;
        }
    }
    
    async loadFromCloud() {
        if (!this.isOnline) {
            showNotification('Sem conexão. Carregando dados locais.', 'info');
            return this.loadFromLocal();
        }
        
        try {
            const [produtos, vendas, movimentacoes, config] = await Promise.all([
                this.getAllProdutos(),
                this.getAllVendas(),
                this.getAllMovimentacoes(),
                this.getConfiguracoes()
            ]);
            
            // Salvar localmente
            localStorage.setItem('produtos', JSON.stringify(produtos));
            localStorage.setItem('vendas', JSON.stringify(vendas));
            localStorage.setItem('movimentacoesEstoque', JSON.stringify(movimentacoes));
            
            // Salvar configurações
            config.forEach(item => {
                localStorage.setItem(item.key, item.value);
            });
            
            showNotification('Dados carregados da nuvem! ☁️', 'success');
            return true;
        } catch (error) {
            console.error('Erro ao carregar da nuvem:', error);
            showNotification('Erro ao carregar. Usando dados locais.', 'error');
            return this.loadFromLocal();
        }
    }
    
    // ========== CRUD PARA PRODUTOS ==========
    
    async addProduto(produto) {
        try {
            if (this.isOnline) {
                // Adicionar ao Firestore
                const docRef = await this.db.collection(this.collections.produtos).add({
                    ...produto,
                    sincronizado: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Atualizar ID
                produto.id = docRef.id;
                
                // Atualizar no Firestore com ID
                await docRef.update({ id: docRef.id });
            }
            
            // Salvar localmente (cache)
            this.saveProdutoLocal(produto);
            
            // Se offline, marcar para sincronização posterior
            if (!this.isOnline) {
                this.addToPendingSync('produtos', 'add', produto);
            }
            
            return produto;
        } catch (error) {
            console.error('Erro ao adicionar produto:', error);
            // Fallback: salvar apenas localmente
            this.saveProdutoLocal(produto);
            return produto;
        }
    }
    
    async updateProduto(id, updates) {
        try {
            if (this.isOnline) {
                await this.db.collection(this.collections.produtos).doc(id).update({
                    ...updates,
                    sincronizado: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Atualizar localmente
            this.updateProdutoLocal(id, updates);
            
            // Se offline, marcar para sincronização
            if (!this.isOnline) {
                this.addToPendingSync('produtos', 'update', { id, ...updates });
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            // Fallback: atualizar apenas localmente
            this.updateProdutoLocal(id, updates);
            return false;
        }
    }
    
    async deleteProduto(id) {
        try {
            if (this.isOnline) {
                await this.db.collection(this.collections.produtos).doc(id).delete();
            }
            
            // Remover localmente
            this.deleteProdutoLocal(id);
            
            // Se offline, marcar para sincronização
            if (!this.isOnline) {
                this.addToPendingSync('produtos', 'delete', { id });
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            // Fallback: excluir apenas localmente
            this.deleteProdutoLocal(id);
            return false;
        }
    }
    
    async getAllProdutos() {
        if (this.isOnline) {
            try {
                const snapshot = await this.db.collection(this.collections.produtos)
                    .orderBy('createdAt', 'desc')
                    .get();
                
                const produtos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Atualizar cache local
                localStorage.setItem('produtos', JSON.stringify(produtos));
                
                return produtos;
            } catch (error) {
                console.error('Erro ao buscar produtos:', error);
                // Fallback para dados locais
            }
        }
        
        return this.getProdutosLocal();
    }
    
    // ========== CRUD PARA VENDAS ==========
    
    async addVenda(venda) {
        try {
            if (this.isOnline) {
                const docRef = await this.db.collection(this.collections.vendas).add({
                    ...venda,
                    sincronizado: true,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                venda.id = docRef.id;
                await docRef.update({ id: docRef.id });
            }
            
            // Salvar localmente
            this.saveVendaLocal(venda);
            
            // Se offline, marcar para sincronização
            if (!this.isOnline) {
                this.addToPendingSync('vendas', 'add', venda);
            }
            
            return venda;
        } catch (error) {
            console.error('Erro ao adicionar venda:', error);
            this.saveVendaLocal(venda);
            return venda;
        }
    }
    
    async getAllVendas(filters = {}) {
        if (this.isOnline) {
            try {
                let query = this.db.collection(this.collections.vendas);
                
                // Aplicar filtros
                if (filters.status) {
                    query = query.where('status', '==', filters.status);
                }
                
                const snapshot = await query.orderBy('data', 'desc').get();
                
                const vendas = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Atualizar cache local
                localStorage.setItem('vendas', JSON.stringify(vendas));
                
                return vendas;
            } catch (error) {
                console.error('Erro ao buscar vendas:', error);
            }
        }
        
        return this.getVendasLocal();
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    saveProdutoLocal(produto) {
        let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        
        // Verificar se já existe
        const index = produtos.findIndex(p => p.id === produto.id);
        
        if (index >= 0) {
            produtos[index] = produto;
        } else {
            produtos.push(produto);
        }
        
        localStorage.setItem('produtos', JSON.stringify(produtos));
    }
    
    getProdutosLocal() {
        return JSON.parse(localStorage.getItem('produtos')) || [];
    }
    
    updateProdutoLocal(id, updates) {
        let produtos = this.getProdutosLocal();
        const index = produtos.findIndex(p => p.id === id);
        
        if (index >= 0) {
            produtos[index] = { ...produtos[index], ...updates };
            localStorage.setItem('produtos', JSON.stringify(produtos));
        }
    }
    
    deleteProdutoLocal(id) {
        let produtos = this.getProdutosLocal();
        produtos = produtos.filter(p => p.id !== id);
        localStorage.setItem('produtos', JSON.stringify(produtos));
    }
    
    saveVendaLocal(venda) {
        let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
        vendas.push(venda);
        localStorage.setItem('vendas', JSON.stringify(vendas));
    }
    
    getVendasLocal() {
        return JSON.parse(localStorage.getItem('vendas')) || [];
    }
    
    // ========== SINCRONIZAÇÃO DE DADOS PENDENTES ==========
    
    addToPendingSync(collection, action, data) {
        const pending = {
            collection,
            action,
            data,
            timestamp: new Date().toISOString(),
            attempts: 0
        };
        
        this.pendingSync.push(pending);
        this.savePendingSync();
        
        showNotification('Ação salva para sincronização quando online 🔄', 'info');
    }
    
    async processPendingSync() {
        if (this.pendingSync.length === 0 || !this.isOnline) return;
        
        showNotification('Sincronizando ações pendentes...', 'info');
        
        const success = [];
        const failed = [];
        
        for (const pending of [...this.pendingSync]) {
            try {
                await this.processSyncItem(pending);
                success.push(pending);
                
                // Remover da lista de pendentes
                this.pendingSync = this.pendingSync.filter(p => 
                    !(p.collection === pending.collection && 
                      p.action === pending.action && 
                      p.timestamp === pending.timestamp)
                );
            } catch (error) {
                console.error('Erro ao processar item pendente:', error);
                pending.attempts++;
                failed.push(pending);
            }
        }
        
        this.savePendingSync();
        
        if (success.length > 0) {
            showNotification(`${success.length} ação(ões) sincronizada(s) com sucesso!`, 'success');
        }
        
        return { success, failed };
    }
    
    async processSyncItem(pending) {
        const { collection, action, data } = pending;
        
        switch (collection) {
            case 'produtos':
                if (action === 'add') {
                    await this.addProduto(data);
                } else if (action === 'update') {
                    await this.updateProduto(data.id, data);
                } else if (action === 'delete') {
                    await this.deleteProduto(data.id);
                }
                break;
                
            case 'vendas':
                if (action === 'add') {
                    await this.addVenda(data);
                }
                break;
                
            // Adicionar outros casos conforme necessário
        }
    }
    
    savePendingSync() {
        localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
    }
    
    loadPendingSync() {
        this.pendingSync = JSON.parse(localStorage.getItem('pendingSync')) || [];
    }
    
    // ========== MANIPULAÇÃO DE CONEXÃO ==========
    
    handleOnline() {
        this.isOnline = true;
        showNotification('Conexão restaurada! Sincronizando dados... 🔄', 'success');
        
        // Processar pendentes
        setTimeout(() => this.processPendingSync(), 2000);
        
        // Sincronizar todos os dados
        setTimeout(() => this.syncAllData(), 5000);
    }
    
    handleOffline() {
        this.isOnline = false;
        showNotification('Modo offline ativado. Trabalhando com dados locais.', 'warning');
    }
    
    // ========== MÉTODOS DE SINCRONIZAÇÃO ESPECÍFICA ==========
    
    async syncProdutos() {
        const produtos = this.getProdutosLocal();
        
        for (const produto of produtos) {
            if (!produto.sincronizado) {
                await this.addProduto(produto);
            }
        }
    }
    
    async syncVendas() {
        const vendas = this.getVendasLocal();
        const vendasCloud = await this.getAllVendas();
        
        // Encontrar vendas não sincronizadas
        const vendasNaoSincronizadas = vendas.filter(vendaLocal => 
            !vendasCloud.some(vendaCloud => vendaCloud.id === vendaLocal.id)
        );
        
        for (const venda of vendasNaoSincronizadas) {
            await this.addVenda(venda);
        }
    }
    
    async syncMovimentacoes() {
        const movimentacoes = JSON.parse(localStorage.getItem('movimentacoesEstoque')) || [];
        
        if (this.isOnline && movimentacoes.length > 0) {
            for (const mov of movimentacoes) {
                if (!mov.sincronizado) {
                    await this.db.collection(this.collections.movimentacoes).add({
                        ...mov,
                        sincronizado: true,
                        syncedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Marcar como sincronizado localmente
                    mov.sincronizado = true;
                }
            }
            
            localStorage.setItem('movimentacoesEstoque', JSON.stringify(movimentacoes));
        }
    }
    
    async syncConfiguracoes() {
        const configKeys = ['taxaCartao', 'imposto', 'margem', 'estoqueMinimo'];
        const configData = [];
        
        configKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                configData.push({ key, value });
            }
        });
        
        if (this.isOnline && configData.length > 0) {
            await this.db.collection(this.collections.config).doc('userConfig').set({
                config: configData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    }
    
    async getConfiguracoes() {
        if (this.isOnline) {
            try {
                const doc = await this.db.collection(this.collections.config).doc('userConfig').get();
                
                if (doc.exists) {
                    return doc.data().config || [];
                }
            } catch (error) {
                console.error('Erro ao carregar configurações:', error);
            }
        }
        
        return [];
    }
    
    async getAllMovimentacoes() {
        if (this.isOnline) {
            try {
                const snapshot = await this.db.collection(this.collections.movimentacoes)
                    .orderBy('data', 'desc')
                    .limit(100)
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Erro ao buscar movimentações:', error);
            }
        }
        
        return JSON.parse(localStorage.getItem('movimentacoesEstoque')) || [];
    }
    
    // ========== BACKUP E RESTAURAÇÃO ==========
    
    async createBackup() {
        if (!this.isOnline) {
            showNotification('Conecte-se à internet para criar backup', 'error');
            return null;
        }
        
        try {
            const backupData = {
                produtos: await this.getAllProdutos(),
                vendas: await this.getAllVendas(),
                movimentacoes: await this.getAllMovimentacoes(),
                config: await this.getConfiguracoes(),
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            // Salvar backup no Firestore
            await this.db.collection('backups').add({
                ...backupData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Também salvar como arquivo local
            this.downloadBackupFile(backupData);
            
            showNotification('Backup criado com sucesso! 💾', 'success');
            return backupData;
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            showNotification('Erro ao criar backup', 'error');
            return null;
        }
    }
    
    downloadBackupFile(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `backup-beautystore-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async restoreBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // Validar dados do backup
                    if (!backupData.produtos || !backupData.vendas) {
                        throw new Error('Formato de backup inválido');
                    }
                    
                    showNotification('Restaurando backup...', 'info');
                    
                    // Restaurar dados
                    localStorage.setItem('produtos', JSON.stringify(backupData.produtos));
                    localStorage.setItem('vendas', JSON.stringify(backupData.vendas));
                    localStorage.setItem('movimentacoesEstoque', JSON.stringify(backupData.movimentacoes || []));
                    
                    // Restaurar configurações
                    if (backupData.config) {
                        backupData.config.forEach(item => {
                            localStorage.setItem(item.key, item.value);
                        });
                    }
                    
                    // Sincronizar com a nuvem se estiver online
                    if (this.isOnline) {
                        await this.syncAllData();
                    }
                    
                    showNotification('Backup restaurado com sucesso! 🔄', 'success');
                    resolve(true);
                } catch (error) {
                    console.error('Erro ao restaurar backup:', error);
                    showNotification('Erro ao restaurar backup', 'error');
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.readAsText(file);
        });
    }
}

// Exportar instância global
window.FirebaseService = new FirebaseService();