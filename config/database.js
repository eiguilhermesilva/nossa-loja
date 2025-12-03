// Configuração do Banco de Dados - VERSÃO SIMPLIFICADA E FUNCIONAL
class Database {
    constructor() {
        // SUA URL DO GOOGLE APPS SCRIPT
        this.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbySgdwz__W5fKqP48rjNlqaLsXcLG2sZW6isCXm-thrLzLuXzcP-c9_-ccBiGDKXog-nQ/exec';
    }

    // ========== FUNÇÃO DE TESTE DA CONEXÃO ==========
    static async testConnection() {
        console.log('🔍 Testando conexão com Google Sheets...');
        
        try {
            const db = new Database();
            const url = `${db.appsScriptUrl}?action=test&_=${Date.now()}`;
            
            const response = await fetch(url);
            const result = await response.json();
            
            console.log('✅ Resposta do teste:', result);
            return result.success;
            
        } catch (error) {
            console.error('❌ Erro no teste de conexão:', error);
            return false;
        }
    }

    // ========== FUNÇÕES BÁSICAS ==========
    static saveToLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erro ao salvar localmente:', error);
            return false;
        }
    }

    static loadFromLocal(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao carregar localmente:', error);
            return [];
        }
    }

    // ========== GERADOR DE CÓDIGO ==========
    static generateProductCode(nome, categoria) {
        if (!nome) return 'PROD-' + Date.now().toString().slice(-6);
        
        // Pega as 3 primeiras letras do nome
        let nomeCode = nome.substring(0, 3).toUpperCase();
        
        // Código da categoria
        const catCodes = {
            'maquiagem': 'MQ', 'skincare': 'SK', 'acessorios': 'AC',
            'fragrancias': 'FR', 'cabelos': 'CB'
        };
        const catCode = catCodes[categoria] || 'PR';
        
        // Número sequencial
        const sequential = Date.now().toString().slice(-4);
        
        return `${catCode}-${nomeCode}-${sequential}`;
    }

    // ========== FUNÇÃO PARA CHAMAR O GOOGLE SHEETS ==========
    static async callGoogleSheets(action, data = null) {
        const db = new Database();
        
        try {
            // Cria a URL com ação
            let url = `${db.appsScriptUrl}?action=${action}`;
            
            // Adiciona dados se houver
            if (data) {
                url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
            }
            
            // Adiciona timestamp para evitar cache
            url += `&_=${Date.now()}`;
            
            console.log(`📤 Enviando para Google Sheets: ${action}`);
            
            // Faz a requisição
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ ${action} no Google Sheets: Sucesso`);
                return result;
            } else {
                console.error(`❌ ${action} no Google Sheets:`, result.error);
                return result;
            }
            
        } catch (error) {
            console.error(`❌ Falha na conexão com Google Sheets (${action}):`, error.message);
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }

    // ========== FUNÇÕES DE PRODUTOS ==========
    static async addProduct(product) {
        console.log('➕ Adicionando produto:', product.nome);
        
        // GERA O CÓDIGO AQUI MESMO
        if (!product.codigo && product.nome) {
            product.codigo = this.generateProductCode(product.nome, product.categoria);
        }
        
        // Completa dados do produto
        product.id = 'PROD-' + Date.now();
        product.createdAt = new Date().toISOString();
        product.updatedAt = new Date().toISOString();
        
        // Valores padrão
        product.estoque = product.estoque || 0;
        product.estoqueMinimo = product.estoqueMinimo || 5;
        product.custo = product.custo || 0;
        product.precoSugerido = product.precoSugerido || 0;
        
        // 1️⃣ SALVA LOCALMENTE (funciona sempre)
        const localProducts = this.loadFromLocal('produtos') || [];
        localProducts.push(product);
        this.saveToLocal('produtos', localProducts);
        
        console.log('✅ Produto salvo LOCALMENTE:', product.codigo);
        
        // 2️⃣ TENTA SALVAR NO GOOGLE SHEETS (em segundo plano)
        setTimeout(async () => {
            try {
                const result = await this.callGoogleSheets('addProduct', product);
                
                if (result.success) {
                    console.log('☁️  Produto salvo no GOOGLE SHEETS:', product.codigo);
                    
                    // Mostra alerta visual
                    if (typeof showNotification === 'function') {
                        showNotification('Produto sincronizado com Google Sheets!', 'success');
                    }
                }
            } catch (error) {
                console.log('⚠️  Produto salvo apenas localmente (Google offline)');
            }
        }, 500);
        
        return product;
    }

    static async getProducts(filter = {}) {
        console.log('🔄 Buscando produtos...');
        
        // PRIMEIRO: Tenta buscar do Google Sheets
        try {
            const result = await this.callGoogleSheets('getProducts');
            
            if (result.success && result.data) {
                console.log(`✅ Produtos do Google Sheets: ${result.data.length} itens`);
                
                // Salva como cache local
                this.saveToLocal('produtos_cache', result.data);
                this.saveToLocal('produtos_last_sync', new Date().toISOString());
                
                let products = result.data;
                
                // Aplica filtros
                if (filter.categoria) {
                    products = products.filter(p => p.categoria === filter.categoria);
                }
                
                if (filter.search) {
                    const searchTerm = filter.search.toLowerCase();
                    products = products.filter(p => 
                        p.nome?.toLowerCase().includes(searchTerm) ||
                        p.codigo?.toLowerCase().includes(searchTerm)
                    );
                }
                
                return products;
            }
        } catch (error) {
            console.log('⚠️  Usando cache local');
        }
        
        // SEGUNDO: Usa cache local
        const cachedProducts = this.loadFromLocal('produtos_cache');
        if (cachedProducts.length > 0) {
            console.log(`📦 Produtos do cache: ${cachedProducts.length} itens`);
            return cachedProducts;
        }
        
        // TERCEIRO: Usa dados locais
        const localProducts = this.loadFromLocal('produtos');
        console.log(`🏠 Produtos locais: ${localProducts.length} itens`);
        return localProducts;
    }

    static async updateProduct(id, updates) {
        // Atualiza localmente
        const products = this.loadFromLocal('produtos') || [];
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            updates.updatedAt = new Date().toISOString();
            products[index] = { ...products[index], ...updates };
            this.saveToLocal('produtos', products);
            
            // Tenta atualizar no Google também
            setTimeout(async () => {
                try {
                    await this.callGoogleSheets('updateProduct', { id, ...updates });
                } catch (error) {
                    console.log('⚠️  Atualizado apenas localmente');
                }
            }, 500);
            
            return products[index];
        }
        
        return null;
    }

    // ========== FUNÇÕES DE VENDAS ==========
    static async addSale(sale) {
        console.log('💰 Registrando venda...');
        
        // Prepara a venda
        sale.id = 'VEND-' + Date.now();
        sale.data = new Date().toISOString();
        sale.status = sale.status || 'concluida';
        
        // Calcula totais
        if (!sale.subtotal && sale.produtos) {
            sale.subtotal = sale.produtos.reduce((total, item) => 
                total + (item.precoUnitario * item.quantidade), 0);
        }
        
        if (!sale.valorTotal) {
            const desconto = sale.desconto || 0;
            const taxas = sale.taxas || 0;
            sale.valorTotal = sale.subtotal - desconto + taxas;
        }
        
        // 1️⃣ SALVA LOCALMENTE
        const localSales = this.loadFromLocal('vendas') || [];
        localSales.push(sale);
        this.saveToLocal('vendas', localSales);
        
        // Atualiza estoque local
        const products = this.loadFromLocal('produtos');
        sale.produtos.forEach(item => {
            const productIndex = products.findIndex(p => p.id === item.produtoId);
            if (productIndex !== -1) {
                products[productIndex].estoque -= item.quantidade;
                products[productIndex].ultimaVenda = new Date().toISOString();
            }
        });
        this.saveToLocal('produtos', products);
        
        console.log('✅ Venda registrada LOCALMENTE:', sale.id);
        
        // 2️⃣ TENTA ENVIAR PARA GOOGLE SHEETS
        setTimeout(async () => {
            try {
                const result = await this.callGoogleSheets('addSale', sale);
                
                if (result.success) {
                    console.log('☁️  Venda salva no GOOGLE SHEETS');
                    
                    if (typeof showNotification === 'function') {
                        showNotification('Venda sincronizada com Google Sheets!', 'success');
                    }
                }
            } catch (error) {
                console.log('⚠️  Venda salva apenas localmente');
            }
        }, 500);
        
        return sale;
    }

    static getSales(filter = {}) {
        const sales = this.loadFromLocal('vendas') || [];
        
        // Aplica filtros
        let filteredSales = [...sales];
        
        if (filter.mes !== undefined) {
            filteredSales = filteredSales.filter(s => {
                const saleDate = new Date(s.data);
                return saleDate.getMonth() === filter.mes;
            });
        }
        
        if (filter.status) {
            filteredSales = filteredSales.filter(s => s.status === filter.status);
        }
        
        return filteredSales;
    }

    // ========== OUTRAS FUNÇÕES ==========
    static deleteProduct(id) {
        const products = this.loadFromLocal('produtos');
        const filtered = products.filter(p => p.id !== id);
        this.saveToLocal('produtos', filtered);
        return filtered.length < products.length;
    }

    // ========== INICIALIZAÇÃO ==========
    static async initialize() {
        console.log('🚀 Inicializando Database...');
        
        // Testa conexão com Google Sheets
        const connected = await this.testConnection();
        
        if (connected) {
            console.log('✅ Conectado ao Google Sheets');
            
            // Tenta sincronizar dados
            try {
                const productsResult = await this.callGoogleSheets('getProducts');
                if (productsResult.success) {
                    this.saveToLocal('produtos_cache', productsResult.data);
                    console.log('📦 Dados sincronizados do Google Sheets');
                }
            } catch (error) {
                console.log('⚠️  Usando dados locais');
            }
        } else {
            console.log('⚠️  Modo offline - usando dados locais');
        }
        
        return connected;
    }
}

// Inicializa automaticamente
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Database carregado');
    
    // Inicializa em segundo plano
    setTimeout(() => {
        Database.initialize();
    }, 2000);
});

// Exporta para uso global
window.Database = Database;
