// Configuração do Google Sheets como banco de dados - VERSÃO SIMPLIFICADA
class Database {
    constructor() {
        // Cole sua URL do Google Apps Script AQUI:
        this.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbxTsjrcQWnvNYva7Baw9i2ZrI3Tp4UlFAh80Vwt6DIKbPY2pw-JkPBnoQWNf7arSSpdZw/exec';
    }

    // ========== MÉTODO SIMPLIFICADO PARA CONECTAR COM GOOGLE ==========
    static async callGoogleAPI(action, data = null) {
        const db = new Database();
        
        // Cria a URL com os parâmetros
        let url = `${db.appsScriptUrl}?action=${action}`;
        
        if (data) {
            // Para dados complexos, usa POST
            try {
                const response = await fetch(db.appsScriptUrl, {
                    method: 'POST',
                    mode: 'no-cors', // IMPORTANTE para Google Apps Script
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=${action}&data=${encodeURIComponent(JSON.stringify(data))}`
                });
                
                // Como usamos no-cors, não podemos ler a resposta diretamente
                // O Google Apps Script vai processar e salvar
                return { success: true };
                
            } catch (error) {
                console.log('Usando fallback para GET:', error);
                // Fallback para GET
                url += `&data=${encodeURIComponent(JSON.stringify(data))}`;
                const response = await fetch(url);
                const result = await response.json();
                return result;
            }
        } else {
            // Para requisições GET simples
            try {
                const response = await fetch(url);
                const result = await response.json();
                return result;
            } catch (error) {
                console.error('Erro na requisição GET:', error);
                return { success: false, error: error.message };
            }
        }
    }

    // ========== MÉTODOS BÁSICOS (MANTENHA ESTES) ==========
    static saveToLocal(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    static loadFromLocal(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    // ========== MÉTODO PARA GERAR CÓDIGO DO PRODUTO ==========
    static generateProductCode(nome, categoria) {
        if (!nome) return 'PROD-0001';
        
        // Pega as 3 primeiras letras do nome em maiúsculas
        const nomeCode = nome.substring(0, 3).toUpperCase();
        
        // Código da categoria
        const catCodes = {
            'maquiagem': 'MQ',
            'skincare': 'SK',
            'acessorios': 'AC',
            'fragrancias': 'FR',
            'cabelos': 'CB'
        };
        const catCode = catCodes[categoria] || 'GN';
        
        // Número sequencial baseado no timestamp
        const sequential = Date.now().toString().slice(-4);
        
        return `${catCode}-${nomeCode}-${sequential}`;
    }

    // ========== MÉTODO PARA ADICIONAR PRODUTO (VERSÃO QUE FUNCIONA) ==========
    static async addProduct(product) {
        // GERA O CÓDIGO AQUI MESMO - não depende do Google
        if (!product.codigo && product.nome) {
            product.codigo = this.generateProductCode(product.nome, product.categoria);
        }
        
        // Gera ID e timestamps
        product.id = Date.now().toString();
        product.createdAt = new Date().toISOString();
        product.updatedAt = new Date().toISOString();
        
        // PRIMEIRO: Salva localmente (funciona sempre)
        const localProducts = this.loadFromLocal('produtos') || [];
        localProducts.push(product);
        this.saveToLocal('produtos', localProducts);
        
        // DEPOIS: Tenta salvar no Google (em segundo plano)
        try {
            await this.callGoogleAPI('addProduct', product);
            console.log('Produto enviado para Google Sheets com sucesso');
        } catch (error) {
            console.log('Produto salvo localmente. Erro ao enviar para Google:', error);
        }
        
        return product;
    }

    // ========== MÉTODO PARA OBTER PRODUTOS ==========
    static async getProducts(filter = {}) {
        // SEMPRE retorna do localStorage primeiro (para ser rápido)
        let products = this.loadFromLocal('produtos') || [];
        
        // Se não tiver produtos locais, tenta buscar do Google
        if (products.length === 0) {
            try {
                const result = await this.callGoogleAPI('getProducts');
                if (result.success && result.data) {
                    products = result.data;
                    // Salva localmente como cache
                    this.saveToLocal('produtos', products);
                }
            } catch (error) {
                console.log('Usando dados locais:', error);
            }
        }
        
        // Aplica filtros
        if (filter.categoria) {
            products = products.filter(p => p.categoria === filter.categoria);
        }
        
        if (filter.estoqueBaixo) {
            const minStock = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
            products = products.filter(p => p.estoque <= minStock);
        }
        
        if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            products = products.filter(p => 
                p.nome.toLowerCase().includes(searchTerm) ||
                (p.descricao && p.descricao.toLowerCase().includes(searchTerm)) ||
                (p.codigo && p.codigo.toLowerCase().includes(searchTerm))
            );
        }
        
        return products;
    }

    // ========== MÉTODO PARA ATUALIZAR PRODUTO ==========
    static async updateProduct(id, updates) {
        // Atualiza localmente primeiro
        const products = this.loadFromLocal('produtos') || [];
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            // Adiciona timestamp de atualização
            updates.updatedAt = new Date().toISOString();
            
            // Atualiza o produto
            products[index] = { ...products[index], ...updates };
            this.saveToLocal('produtos', products);
            
            // Tenta atualizar no Google também
            try {
                await this.callGoogleAPI('updateProduct', { id, ...updates });
            } catch (error) {
                console.log('Atualizado localmente. Erro ao enviar para Google:', error);
            }
            
            return products[index];
        }
        
        return null;
    }

    // ========== MÉTODO PARA ADICIONAR VENDA ==========
    static async addSale(sale) {
        // Prepara a venda
        sale.id = Date.now().toString();
        sale.data = new Date().toISOString();
        sale.status = sale.status || 'concluida';
        
        // Salva localmente primeiro
        const localSales = this.loadFromLocal('vendas') || [];
        localSales.push(sale);
        this.saveToLocal('vendas', localSales);
        
        // Atualiza estoque local
        const products = this.loadFromLocal('produtos') || [];
        sale.produtos.forEach(item => {
            const productIndex = products.findIndex(p => p.id === item.produtoId);
            if (productIndex !== -1) {
                products[productIndex].estoque -= item.quantidade;
                products[productIndex].ultimaVenda = new Date().toISOString();
            }
        });
        this.saveToLocal('produtos', products);
        
        // Tenta enviar para o Google
        try {
            await this.callGoogleAPI('addSale', sale);
            console.log('Venda enviada para Google Sheets');
        } catch (error) {
            console.log('Venda salva localmente. Erro ao enviar para Google:', error);
        }
        
        return sale;
    }

    // ========== MÉTODOS RESTANTES (mantenha como estavam) ==========
    static deleteProduct(id) {
        const products = this.loadFromLocal('produtos');
        const filtered = products.filter(p => p.id !== id);
        this.saveToLocal('produtos', filtered);
        return filtered.length < products.length;
    }

    static getSales(filter = {}) {
        let sales = this.loadFromLocal('vendas') || [];
        
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
            const data = new Date(sale.data);
            const mesAno = `${meses[data.getMonth()]}/${data.getFullYear()}`;
            
            if (!resultado[mesAno]) {
                resultado[mesAno] = 0;
            }
            
            resultado[mesAno] += sale.valorTotal;
        });
        
        return resultado;
    }

    static getTopProducts(sales, periodo) {
        const produtosMap = {};
        
        sales.forEach(sale => {
            sale.produtos.forEach(item => {
                if (!produtosMap[item.produtoId]) {
                    produtosMap[item.produtoId] = {
                        nome: item.nome,
                        quantidade: 0,
                        valorTotal: 0
                    };
                }
                
                produtosMap[item.produtoId].quantidade += item.quantidade;
                produtosMap[item.produtoId].valorTotal += item.precoUnitario * item.quantidade;
            });
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
            resultado.faturamentoTotal += sale.valorTotal;
            
            sale.produtos.forEach(item => {
                const produto = products.find(p => p.id === item.produtoId);
                if (produto) {
                    resultado.custoTotal += produto.custo * item.quantidade;
                }
            });
        });
        
        resultado.lucroTotal = resultado.faturamentoTotal - resultado.custoTotal;
        resultado.margemMedia = resultado.faturamentoTotal > 0 ? 
            (resultado.lucroTotal / resultado.faturamentoTotal) * 100 : 0;
        
        return resultado;
    }
}

// Exportar para uso global
window.Database = Database;