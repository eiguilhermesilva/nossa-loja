// config/database.js (versão atualizada)
class Database {
    static getProducts(filters = {}) {
        // Primeiro tenta do cache local
        let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        
        // Aplicar filtros
        if (filters.categoria) {
            produtos = produtos.filter(p => p.categoria === filters.categoria);
        }
        
        if (filters.estoque === 'baixo') {
            const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
            produtos = produtos.filter(p => p.estoque <= estoqueMinimo && p.estoque > 0);
        }
        
        return produtos;
    }
    
    static async syncProducts() {
        try {
            await FirebaseService.syncProdutos();
            return true;
        } catch (error) {
            console.error('Erro ao sincronizar produtos:', error);
            return false;
        }
    }
    
    static addProduct(productData) {
        const produto = {
            id: productData.id || Date.now().toString(),
            ...productData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sincronizado: false
        };
        
        // Usar FirebaseService para adicionar (que cuida da sincronização)
        return FirebaseService.addProduto(produto);
    }
    
    static updateProduct(id, updates) {
        updates.updatedAt = new Date().toISOString();
        updates.sincronizado = false;
        
        return FirebaseService.updateProduto(id, updates);
    }
    
    static deleteProduct(id) {
        return FirebaseService.deleteProduto(id);
    }
    
    static getSales() {
        return JSON.parse(localStorage.getItem('vendas')) || [];
    }
    
    static addSale(saleData) {
        const venda = {
            id: saleData.id || `venda_${Date.now()}`,
            ...saleData,
            sincronizado: false
        };
        
        // Usar FirebaseService para adicionar
        FirebaseService.addVenda(venda);
        
        return venda;
    }
    
    static async syncSales() {
        try {
            await FirebaseService.syncVendas();
            return true;
        } catch (error) {
            console.error('Erro ao sincronizar vendas:', error);
            return false;
        }
    }
    
    // Método para sincronização geral
    static async syncAll() {
        return FirebaseService.syncAllData();
    }
    
    static async loadFromCloud() {
        return FirebaseService.loadFromCloud();
    }
    
    static async createBackup() {
        return FirebaseService.createBackup();
    }
    
    static async restoreBackup(file) {
        return FirebaseService.restoreBackup(file);
    }
    
    // Método para verificar pendentes
    static getPendingSyncCount() {
        return FirebaseService.pendingSync.length;
    }
    
    // Método para processar pendentes manualmente
    static async processPendingSync() {
        return FirebaseService.processPendingSync();
    }
    
    // Verificar status da conexão
    static isOnline() {
        return FirebaseService.isOnline;
    }
}