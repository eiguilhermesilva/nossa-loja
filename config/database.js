// Configuração do Google Sheets como banco de dados
class Database {
    constructor() {
        // URLs das APIs do Google Sheets (simulação)
        this.sheetId = 'SEU_SHEET_ID_AQUI';
        this.apiKey = '1Nj0U6Fd7aa0rUnNrREH_ocMMw-jZZCacpfHhuM_LFYM';
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/`;
    }

    // Método para salvar dados localmente (usado enquanto não configura o Google Sheets)
    static saveToLocal(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    // Método para carregar dados localmente
    static loadFromLocal(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    // Método para adicionar um produto
    static addProduct(product) {
        const products = this.loadFromLocal('produtos');
        product.id = Date.now().toString(); // ID único baseado no timestamp
        product.createdAt = new Date().toISOString();
        products.push(product);
        this.saveToLocal('produtos', products);
        return product;
    }

    // Método para atualizar um produto
    static updateProduct(id, updates) {
        const products = this.loadFromLocal('produtos');
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveToLocal('produtos', products);
            return products[index];
        }
        return null;
    }

    // Método para remover um produto
    static deleteProduct(id) {
        const products = this.loadFromLocal('produtos');
        const filtered = products.filter(p => p.id !== id);
        this.saveToLocal('produtos', filtered);
        return filtered.length < products.length;
    }

    // Método para buscar produtos
    static getProducts(filter = {}) {
        let products = this.loadFromLocal('produtos');
        
        // Aplicar filtros
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
                p.descricao.toLowerCase().includes(searchTerm) ||
                p.codigo.toLowerCase().includes(searchTerm)
            );
        }
        
        return products;
    }

    // Método para registrar uma venda
    static addSale(sale) {
        const sales = this.loadFromLocal('vendas');
        sale.id = Date.now().toString();
        sale.data = new Date().toISOString();
        sale.status = sale.status || 'concluida';
        sales.push(sale);
        
        // Atualizar estoque dos produtos vendidos
        sale.produtos.forEach(item => {
            const products = this.loadFromLocal('produtos');
            const productIndex = products.findIndex(p => p.id === item.produtoId);
            if (productIndex !== -1) {
                products[productIndex].estoque -= item.quantidade;
                products[productIndex].ultimaVenda = new Date().toISOString();
            }
        });
        
        this.saveToLocal('produtos', products);
        this.saveToLocal('vendas', sales);
        
        return sale;
    }

    // Método para obter vendas
    static getSales(filter = {}) {
        let sales = this.loadFromLocal('vendas');
        
        if (filter.mes) {
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

    // Método para obter relatórios
    static getReports(type, periodo) {
        const sales = this.loadFromLocal('vendas');
        const products = this.loadFromLocal('produtos');
        
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

    // Método auxiliar: vendas por mês
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

    // Método auxiliar: produtos mais vendidos
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
        
        // Converter para array e ordenar por quantidade
        return Object.values(produtosMap)
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);
    }

    // Método auxiliar: lucratividade
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
