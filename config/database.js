// Configuração do Banco de Dados - BeautyStore
class Database {
    constructor() {
        // URLs CONFIGURADAS COM SEUS DADOS:
        this.sheetId = '1Nj0U6Fd7aa0rUnNrREH_ocMMw-jZZCacpfHhuM_LFYM';
        this.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbySgdwz__W5fKqP48rjNlqaLsXcLG2sZW6isCXm-thrLzLuXzcP-c9_-ccBiGDKXog-nQ/exec';
    }

    // ========== FUNÇÃO PARA CHAMAR O GOOGLE APPS SCRIPT ==========
    static async callGoogleAPI(action, data = null) {
        const db = new Database();
        
        try {
            // Prepara a URL
            let url = `${db.appsScriptUrl}?action=${action}`;
            
            if (data) {
                // Adiciona os dados como parâmetro
                const dataStr = encodeURIComponent(JSON.stringify(data));
                url += `&data=${dataStr}`;
            }
            
            // Adiciona timestamp para evitar cache
            url += `&_=${Date.now()}`;
            
            console.log(`📡 Chamando Google API: ${action}`);
            
            // Faz a requisição
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`✅ Resposta Google API (${action}):`, result.success ? 'Sucesso' : 'Erro');
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro ao chamar Google API (${action}):`, error.message);
            return { 
                success: false, 
                error: error.message,
                fallback: true 
            };
        }
    }

    // ========== FUNÇÕES BÁSICAS DE ARMAZENAMENTO LOCAL ==========
    static saveToLocal(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`💾 Salvo localmente: ${key} (${data?.length || 1} itens)`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar localmente:', error);
            return false;
        }
    }

    static loadFromLocal(key) {
        try {
            const data = localStorage.getItem(key);
            const result = data ? JSON.parse(data) : [];
            console.log(`📂 Carregado localmente: ${key} (${result.length} itens)`);
            return result;
        } catch (error) {
            console.error('❌ Erro ao carregar localmente:', error);
            return [];
        }
    }

    // ========== GERADOR DE CÓDIGO DE PRODUTO ==========
    static generateProductCode(nome, categoria) {
        if (!nome || nome.trim() === '') {
            return 'PROD-' + Date.now().toString().slice(-6);
        }
        
        // Pega iniciais do nome (máx 3 letras)
        const nomeParts = nome.split(' ').filter(p => p.length > 0);
        let nomeCode = '';
        
        if (nomeParts.length >= 2) {
            // Usa iniciais das duas primeiras palavras
            nomeCode = (nomeParts[0][0] + nomeParts[1][0]).toUpperCase();
        } else {
            // Usa as 3 primeiras letras da única palavra
            nomeCode = nome.substring(0, 3).toUpperCase();
        }
        
        // Código da categoria
        const catCodes = {
            'maquiagem': 'MQ',
            'skincare': 'SK',
            'acessorios': 'AC',
            'fragrancias': 'FR',
            'cabelos': 'CB',
            'outros': 'OT'
        };
        
        const catCode = catCodes[categoria?.toLowerCase()] || 'PR';
        
        // Número sequencial único
        const timestamp = Date.now().toString();
        const sequential = timestamp.slice(-4);
        
        const code = `${catCode}-${nomeCode}-${sequential}`;
        console.log(`🔢 Código gerado: ${code} para "${nome}"`);
        return code;
    }

    // ========== GESTÃO DE PRODUTOS ==========
    static async getProducts(filter = {}) {
        console.log('🔄 Buscando produtos...');
        
        // PRIMEIRO: Tenta buscar do Google Sheets
        try {
            const result = await this.callGoogleAPI('getProducts');
            
            if (result.success && result.data && Array.isArray(result.data)) {
                console.log(`✅ Produtos do Google: ${result.data.length} itens`);
                
                // Salva como cache local
                this.saveToLocal('produtos_cache', result.data);
                this.saveToLocal('produtos_last_sync', new Date().toISOString());
                
                let products = result.data;
                
                // Aplica filtros
                products = this.applyProductFilters(products, filter);
                
                return products;
            }
        } catch (error) {
            console.log('⚠️  Usando cache local devido a erro no Google');
        }
        
        // SEGUNDO: Usa cache local
        const cachedProducts = this.loadFromLocal('produtos_cache');
        if (cachedProducts.length > 0) {
            console.log(`📦 Produtos do cache: ${cachedProducts.length} itens`);
            return this.applyProductFilters(cachedProducts, filter);
        }
        
        // TERCEIRO: Usa dados locais antigos
        const localProducts = this.loadFromLocal('produtos');
        console.log(`🏠 Produtos locais: ${localProducts.length} itens`);
        return this.applyProductFilters(localProducts, filter);
    }

    static applyProductFilters(products, filter) {
        let filtered = [...products];
        
        if (filter.categoria) {
            filtered = filtered.filter(p => p.categoria === filter.categoria);
        }
        
        if (filter.estoqueBaixo) {
            const minStock = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
            filtered = filtered.filter(p => p.estoque <= minStock && p.estoque > 0);
        }
        
        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.nome?.toLowerCase().includes(searchTerm) ||
                p.codigo?.toLowerCase().includes(searchTerm) ||
                p.marca?.toLowerCase().includes(searchTerm) ||
                p.descricao?.toLowerCase().includes(searchTerm)
            );
        }
        
        return filtered;
    }

    static async addProduct(product) {
        console.log('➕ Adicionando produto:', product.nome);
        
        // GERA CÓDIGO AUTOMATICAMENTE
        if (!product.codigo && product.nome) {
            product.codigo = this.generateProductCode(product.nome, product.categoria);
        }
        
        // Garante dados obrigatórios
        product.id = 'PROD-' + Date.now().toString();
        product.createdAt = new Date().toISOString();
        product.updatedAt = new Date().toISOString();
        
        // Define valores padrão
        product.estoque = product.estoque || 0;
        product.estoqueMinimo = product.estoqueMinimo || 5;
        product.custo = product.custo || 0;
        product.precoSugerido = product.precoSugerido || 0;
        
        // PRIMEIRO: Salva localmente (instantâneo)
        const localProducts = this.loadFromLocal('produtos');
        localProducts.push(product);
        this.saveToLocal('produtos', localProducts);
        
        // Atualiza cache
        const cachedProducts = this.loadFromLocal('produtos_cache');
        cachedProducts.push(product);
        this.saveToLocal('produtos_cache', cachedProducts);
        
        console.log('✅ Produto salvo localmente:', product.codigo);
        
        // SEGUNDO: Tenta salvar no Google (em segundo plano)
        setTimeout(async () => {
            try {
                const result = await this.callGoogleAPI('addProduct', product);
                if (result.success) {
                    console.log('☁️  Produto sincronizado com Google Sheets:', product.codigo);
                    
                    // Atualiza com o ID do Google se necessário
                    if (result.data && result.data.id !== product.id) {
                        const index = localProducts.findIndex(p => p.codigo === product.codigo);
                        if (index !== -1) {
                            localProducts[index].googleId = result.data.id;
                            this.saveToLocal('produtos', localProducts);
                        }
                    }
                }
            } catch (error) {
                console.log('⚠️  Produto não sincronizado com Google (será sincronizado depois)');
            }
        }, 1000);
        
        return product;
    }

    static async updateProduct(id, updates) {
        console.log('✏️  Atualizando produto:', id);
        
        // Adiciona timestamp de atualização
        updates.updatedAt = new Date().toISOString();
        
        // PRIMEIRO: Atualiza localmente
        const products = this.loadFromLocal('produtos');
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            this.saveToLocal('produtos', products);
            
            // Atualiza cache também
            const cachedProducts = this.loadFromLocal('produtos_cache');
            const cacheIndex = cachedProducts.findIndex(p => p.id === id);
            if (cacheIndex !== -1) {
                cachedProducts[cacheIndex] = { ...cachedProducts[cacheIndex], ...updates };
                this.saveToLocal('produtos_cache', cachedProducts);
            }
            
            console.log('✅ Produto atualizado localmente:', id);
            
            // SEGUNDO: Tenta atualizar no Google
            setTimeout(async () => {
                try {
                    const updateData = { id, ...updates };
                    const result = await this.callGoogleAPI('updateProduct', updateData);
                    if (result.success) {
                        console.log('☁️  Atualização sincronizada com Google Sheets');
                    }
                } catch (error) {
                    console.log('⚠️  Atualização não sincronizada com Google');
                }
            }, 1000);
            
            return products[index];
        }
        
        return null;
    }

    static deleteProduct(id) {
        const products = this.loadFromLocal('produtos');
        const filtered = products.filter(p => p.id !== id);
        this.saveToLocal('produtos', filtered);
        
        // Atualiza cache
        const cachedProducts = this.loadFromLocal('produtos_cache');
        const filteredCache = cachedProducts.filter(p => p.id !== id);
        this.saveToLocal('produtos_cache', filteredCache);
        
        return filtered.length < products.length;
    }

    // ========== GESTÃO DE VENDAS ==========
    static async getSales(filter = {}) {
        console.log('🔄 Buscando vendas...');
        
        // PRIMEIRO: Tenta do Google
        try {
            const result = await this.callGoogleAPI('getSales');
            if (result.success && result.data) {
                this.saveToLocal('vendas_cache', result.data);
                let sales = result.data;
                
                if (filter.mes !== undefined) {
                    sales = sales.filter(s => {
                        const saleDate = new Date(s.data);
                        return saleDate.getMonth() === filter.mes;
                    });
                }
                
                if (filter.status) {
                    sales = sales.filter(s => s.status === filter.status);
                }
                
                return sales;
            }
        } catch (error) {
            console.log('⚠️  Usando cache local de vendas');
        }
        
        // SEGUNDO: Usa dados locais
        const localSales = this.loadFromLocal('vendas') || [];
        let sales = localSales;
        
        if (filter.mes !== undefined) {
            sales = sales.filter(s => {
                const saleDate = new Date(s.data);
                return saleDate.getMonth() === filter.mes;
            });
        }
        
        if (filter.status) {
            sales = sales.filter(s => s.status === filter.status);
        }
        
        return sales;
    }

    static async addSale(sale) {
        console.log('💰 Registrando venda...');
        
        // Prepara a venda
        sale.id = 'VEND-' + Date.now().toString();
        sale.data = new Date().toISOString();
        sale.status = sale.status || 'concluida';
        
        // Calcula totais se necessário
        if (!sale.subtotal && sale.produtos) {
            sale.subtotal = sale.produtos.reduce((total, item) => 
                total + (item.precoUnitario * item.quantidade), 0);
        }
        
        if (!sale.valorTotal) {
            const desconto = sale.desconto || 0;
            const taxas = sale.taxas || 0;
            sale.valorTotal = sale.subtotal - desconto + taxas;
        }
        
        // PRIMEIRO: Salva localmente
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
                console.log(`➖ Estoque atualizado: ${products[productIndex].nome} -${item.quantidade}`);
            }
        });
        this.saveToLocal('produtos', products);
        
        console.log('✅ Venda registrada localmente:', sale.id);
        
        // SEGUNDO: Tenta enviar para Google
        setTimeout(async () => {
            try {
                const result = await this.callGoogleAPI('addSale', sale);
                if (result.success) {
                    console.log('☁️  Venda sincronizada com Google Sheets');
                }
            } catch (error) {
                console.log('⚠️  Venda não sincronizada com Google');
            }
        }, 1000);
        
        return sale;
    }

    // ========== RELATÓRIOS ==========
    static getReports(type, periodo) {
        const sales = this.loadFromLocal('vendas') || [];
        const products = this.loadFromLocal('produtos') || [];
        
        switch(type) {
            case 'vendas-por-mes':
                return this.getMonthlySales(sales, periodo);
            case 'produtos-mais-vendidos':
                return this.getTopProducts(sales, periodo);
            case 'lucratividade':
                return this.getProfitability(sales, products, periodo);
            default:
                return {};
        }
    }

    static getMonthlySales(sales, periodo) {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const resultado = {};
        
        sales.forEach(sale => {
            if (sale.status === 'concluida') {
                const data = new Date(sale.data);
                const mesAno = `${meses[data.getMonth()]}/${data.getFullYear()}`;
                
                if (!resultado[mesAno]) {
                    resultado[mesAno] = 0;
                }
                
                resultado[mesAno] += sale.valorTotal || 0;
            }
        });
        
        return resultado;
    }

    static getTopProducts(sales, periodo) {
        const produtosMap = {};
        
        sales.forEach(sale => {
            if (sale.status === 'concluida' && sale.produtos) {
                sale.produtos.forEach(item => {
                    if (!produtosMap[item.produtoId]) {
                        produtosMap[item.produtoId] = {
                            nome: item.nome,
                            quantidade: 0,
                            valorTotal: 0
                        };
                    }
                    
                    produtosMap[item.produtoId].quantidade += item.quantidade;
                    produtosMap[item.produtoId].valorTotal += (item.precoUnitario * item.quantidade);
                });
            }
        });
        
        return Object.values(produtosMap)
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);
    }

    static getProfitability(sales, products, periodo) {
        const resultado = {
            faturamentoTotal: 0,
            custoTotal: 0,
            lucroTotal: 0,
            margemMedia: 0
        };
        
        sales.forEach(sale => {
            if (sale.status === 'concluida') {
                resultado.faturamentoTotal += sale.valorTotal || 0;
                
                if (sale.produtos) {
                    sale.produtos.forEach(item => {
                        const produto = products.find(p => p.id === item.produtoId);
                        if (produto && produto.custo) {
                            resultado.custoTotal += produto.custo * item.quantidade;
                        }
                    });
                }
            }
        });
        
        resultado.lucroTotal = resultado.faturamentoTotal - resultado.custoTotal;
        resultado.margemMedia = resultado.faturamentoTotal > 0 ? 
            (resultado.lucroTotal / resultado.faturamentoTotal) * 100 : 0;
        
        return resultado;
    }

    // ========== SINCRONIZAÇÃO ==========
    static async syncAllData() {
        console.log('🔄 Iniciando sincronização completa...');
        
        try {
            // Sincroniza produtos
            const productsResult = await this.callGoogleAPI('getProducts');
            if (productsResult.success) {
                this.saveToLocal('produtos_cache', productsResult.data);
                console.log('✅ Produtos sincronizados:', productsResult.data?.length || 0);
            }
            
            // Sincroniza vendas
            const salesResult = await this.callGoogleAPI('getSales');
            if (salesResult.success) {
                this.saveToLocal('vendas_cache', salesResult.data);
                console.log('✅ Vendas sincronizadas:', salesResult.data?.length || 0);
            }
            
            this.saveToLocal('last_sync', new Date().toISOString());
            console.log('🎉 Sincronização completa!');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
    }
}

// Exportar para uso global
window.Database = Database;

// Inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Database inicializado com suas URLs');
    console.log('📊 Sheet ID:', new Database().sheetId);
    console.log('🔗 Apps Script URL:', new Database().appsScriptUrl);
    
    // Tenta sincronizar ao carregar (em segundo plano)
    setTimeout(() => {
        Database.syncAllData().catch(() => {
            console.log('⚠️  Sincronização inicial falhou - usando dados locais');
        });
    }, 3000);
});
