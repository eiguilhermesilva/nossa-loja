// Google Apps Script para BeautyStore - TOTALMENTE ATUALIZADO
// URL: https://script.google.com/macros/s/AKfycbySgdwz__W5fKqP48rjNlqaLsXcLG2sZW6isCXm-thrLzLuXzcP-c9_-ccBiGDKXog-nQ/exec

// ID DA SUA PLANILHA - JÁ CONFIGURADO!
const SPREADSHEET_ID = '1Nj0U6Fd7aa0rUnNrREH_ocMMw-jZZCacpfHhuM_LFYM';

// ========== FUNÇÕES PRINCIPAIS DO APPS SCRIPT ==========
function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    // Configura headers CORS
    const response = ContentService.createTextOutput();
    response.setMimeType(ContentService.MimeType.JSON);
    response.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        let params = e.parameter;
        const action = params.action;
        
        if (!action) {
            throw new Error('Parâmetro "action" é obrigatório');
        }
        
        console.log(`📱 Recebida ação: ${action}`);
        
        let result;
        
        switch(action) {
            case 'getProducts':
                result = handleGetProducts();
                break;
                
            case 'addProduct':
                const productData = params.data ? JSON.parse(params.data) : {};
                result = handleAddProduct(productData);
                break;
                
            case 'updateProduct':
                const updateData = params.data ? JSON.parse(params.data) : {};
                result = handleUpdateProduct(params.id, updateData);
                break;
                
            case 'getSales':
                result = handleGetSales();
                break;
                
            case 'addSale':
                const saleData = params.data ? JSON.parse(params.data) : {};
                result = handleAddSale(saleData);
                break;
                
            case 'test':
                result = { 
                    success: true, 
                    message: 'Backend funcionando!',
                    timestamp: new Date().toISOString(),
                    sheetId: SPREADSHEET_ID
                };
                break;
                
            default:
                throw new Error(`Ação não reconhecida: ${action}`);
        }
        
        response.setContent(JSON.stringify(result));
        console.log(`✅ Resposta para ${action}:`, result.success ? 'Sucesso' : 'Erro');
        
    } catch (error) {
        console.error('❌ Erro no backend:', error.toString());
        response.setContent(JSON.stringify({ 
            success: false, 
            error: error.toString(),
            message: 'Erro no servidor'
        }));
    }
    
    return response;
}

// ========== FUNÇÕES AUXILIARES ==========
function getOrCreateSheet(sheetName, headers) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
        console.log(`📄 Criando nova aba: ${sheetName}`);
        sheet = ss.insertSheet(sheetName);
        
        if (headers && headers.length > 0) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
            sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3');
        }
    }
    
    return sheet;
}

function generateProductCode(product) {
    if (product.codigo && product.codigo.trim() !== '') {
        return product.codigo;
    }
    
    let code = '';
    
    // Usa categoria
    if (product.categoria) {
        const catMap = {
            'maquiagem': 'MQ', 'skincare': 'SK', 'acessorios': 'AC',
            'fragrancias': 'FR', 'cabelos': 'CB'
        };
        code += (catMap[product.categoria.toLowerCase()] || 'PR') + '-';
    } else {
        code += 'PR-';
    }
    
    // Usa nome
    if (product.nome) {
        const words = product.nome.split(' ').filter(w => w.length > 0);
        if (words.length >= 2) {
            code += (words[0][0] + words[1][0]).toUpperCase();
        } else {
            code += product.nome.substring(0, 2).toUpperCase();
        }
    } else {
        code += 'PD';
    }
    
    // Adiciona timestamp
    const timestamp = new Date().getTime().toString();
    code += '-' + timestamp.slice(-4);
    
    return code;
}

// ========== HANDLERS PARA PRODUTOS ==========
function handleGetProducts() {
    try {
        const sheet = getOrCreateSheet('Produtos', [
            'id', 'nome', 'codigo', 'categoria', 'marca', 'custo', 
            'precoSugerido', 'estoque', 'estoqueMinimo', 'descricao', 
            'fornecedor', 'localizacao', 'createdAt', 'updatedAt'
        ]);
        
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return { success: true, data: [] };
        }
        
        const headers = data[0];
        const products = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const product = {};
            
            // Preenche o produto com os dados da linha
            headers.forEach((header, index) => {
                if (index < row.length) {
                    product[header] = row[index];
                } else {
                    product[header] = '';
                }
            });
            
            // Só inclui produtos com nome
            if (product.nome && product.nome.toString().trim() !== '') {
                products.push(product);
            }
        }
        
        return { 
            success: true, 
            data: products,
            count: products.length,
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.toString(),
            message: 'Erro ao buscar produtos'
        };
    }
}

function handleAddProduct(product) {
    try {
        const sheet = getOrCreateSheet('Produtos', [
            'id', 'nome', 'codigo', 'categoria', 'marca', 'custo', 
            'precoSugerido', 'estoque', 'estoqueMinimo', 'descricao', 
            'fornecedor', 'localizacao', 'createdAt', 'updatedAt'
        ]);
        
        // Garante dados obrigatórios
        if (!product.id) {
            product.id = 'PROD-' + new Date().getTime();
        }
        
        if (!product.codigo) {
            product.codigo = generateProductCode(product);
        }
        
        if (!product.createdAt) {
            product.createdAt = new Date().toISOString();
        }
        
        product.updatedAt = new Date().toISOString();
        
        // Define valores padrão
        product.estoque = product.estoque || 0;
        product.estoqueMinimo = product.estoqueMinimo || 5;
        product.custo = product.custo || 0;
        product.precoSugerido = product.precoSugerido || 0;
        
        // Obtém cabeçalhos
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Cria array na ordem dos cabeçalhos
        const newRow = headers.map(header => {
            const value = product[header];
            
            // Converte arrays/objetos para string JSON
            if (value && typeof value === 'object') {
                try {
                    return JSON.stringify(value);
                } catch (e) {
                    return String(value);
                }
            }
            
            return value !== undefined ? value : '';
        });
        
        // Adiciona na planilha
        sheet.appendRow(newRow);
        
        // Formata a nova linha
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 1, 1, headers.length)
             .setBorder(true, true, true, true, true, true);
        
        console.log(`✅ Produto adicionado: ${product.codigo} - ${product.nome}`);
        
        return { 
            success: true, 
            data: product,
            message: 'Produto salvo com sucesso no Google Sheets',
            row: lastRow
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.toString(),
            message: 'Erro ao salvar produto'
        };
    }
}

function handleUpdateProduct(id, updates) {
    try {
        const sheet = getOrCreateSheet('Produtos', [
            'id', 'nome', 'codigo', 'categoria', 'marca', 'custo', 
            'precoSugerido', 'estoque', 'estoqueMinimo', 'descricao', 
            'fornecedor', 'localizacao', 'createdAt', 'updatedAt'
        ]);
        
        const data = sheet.getDataRange().getValues();
        const headers = data[0];
        const idIndex = headers.indexOf('id');
        
        if (idIndex === -1) {
            return { 
                success: false, 
                error: 'Coluna "id" não encontrada na planilha'
            };
        }
        
        // Encontra a linha do produto
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIndex] === id) {
                rowIndex = i + 1; // +1 porque planilhas começam em 1
                break;
            }
        }
        
        if (rowIndex === -1) {
            return { 
                success: false, 
                error: `Produto com ID ${id} não encontrado`
            };
        }
        
        // Atualiza os campos
        updates.updatedAt = new Date().toISOString();
        
        Object.keys(updates).forEach(key => {
            const colIndex = headers.indexOf(key);
            if (colIndex !== -1) {
                const value = updates[key];
                
                // Converte objetos/arrays para JSON string
                if (value && typeof value === 'object') {
                    try {
                        sheet.getRange(rowIndex, colIndex + 1).setValue(JSON.stringify(value));
                    } catch (e) {
                        sheet.getRange(rowIndex, colIndex + 1).setValue(String(value));
                    }
                } else {
                    sheet.getRange(rowIndex, colIndex + 1).setValue(value);
                }
            }
        });
        
        console.log(`✅ Produto atualizado: ${id} na linha ${rowIndex}`);
        
        return { 
            success: true, 
            data: { id, ...updates },
            message: 'Produto atualizado com sucesso'
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.toString(),
            message: 'Erro ao atualizar produto'
        };
    }
}

// ========== HANDLERS PARA VENDAS ==========
function handleGetSales() {
    try {
        const sheet = getOrCreateSheet('Vendas', [
            'id', 'data', 'produtos', 'subtotal', 'desconto', 
            'descontoPercent', 'taxas', 'valorTotal', 'formaPagamento', 'status'
        ]);
        
        const data = sheet.getDataRange().getValues();
        
        if (data.length <= 1) {
            return { success: true, data: [] };
        }
        
        const headers = data[0];
        const sales = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const sale = {};
            
            headers.forEach((header, index) => {
                if (index < row.length) {
                    const value = row[index];
                    
                    // Converte JSON strings para objetos
                    if (header === 'produtos' && value && typeof value === 'string') {
                        try {
                            sale[header] = JSON.parse(value);
                        } catch (e) {
                            sale[header] = value;
                        }
                    } else {
                        sale[header] = value;
                    }
                } else {
                    sale[header] = '';
                }
            });
            
            // Só inclui vendas com ID
            if (sale.id && sale.id.toString().trim() !== '') {
                sales.push(sale);
            }
        }
        
        return { 
            success: true, 
            data: sales,
            count: sales.length,
            lastUpdated: new Date().toISOString()
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.toString(),
            message: 'Erro ao buscar vendas'
        };
    }
}

function handleAddSale(sale) {
    try {
        const sheet = getOrCreateSheet('Vendas', [
            'id', 'data', 'produtos', 'subtotal', 'desconto', 
            'descontoPercent', 'taxas', 'valorTotal', 'formaPagamento', 'status'
        ]);
        
        // Garante dados obrigatórios
        if (!sale.id) {
            sale.id = 'VEND-' + new Date().getTime();
        }
        
        if (!sale.data) {
            sale.data = new Date().toISOString();
        }
        
        if (!sale.status) {
            sale.status = 'concluida';
        }
        
        // Calcula totais se necessário
        if (!sale.subtotal && sale.produtos) {
            sale.subtotal = sale.produtos.reduce((total, item) => {
                return total + (item.precoUnitario || 0) * (item.quantidade || 0);
            }, 0);
        }
        
        if (!sale.valorTotal) {
            const desconto = sale.desconto || 0;
            const taxas = sale.taxas || 0;
            sale.valorTotal = (sale.subtotal || 0) - desconto + taxas;
        }
        
        // Obtém cabeçalhos
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        
        // Prepara dados para salvar
        const saleToSave = { ...sale };
        
        // Converte produtos para JSON string
        if (saleToSave.produtos && Array.isArray(saleToSave.produtos)) {
            saleToSave.produtos = JSON.stringify(saleToSave.produtos);
        }
        
        // Cria array na ordem dos cabeçalhos
        const newRow = headers.map(header => {
            const value = saleToSave[header];
            return value !== undefined ? value : '';
        });
        
        // Adiciona na planilha
        sheet.appendRow(newRow);
        
        // Formata a nova linha
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 1, 1, headers.length)
             .setBorder(true, true, true, true, true, true);
        
        console.log(`✅ Venda registrada: ${sale.id} - R$ ${sale.valorTotal}`);
        
        return { 
            success: true, 
            data: sale,
            message: 'Venda registrada com sucesso no Google Sheets',
            row: lastRow
        };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.toString(),
            message: 'Erro ao registrar venda'
        };
    }
}

// ========== FUNÇÃO DE TESTE ==========
function testBackend() {
    console.log('🧪 Testando backend...');
    
    try {
        // Testa abas
        const produtosSheet = getOrCreateSheet('Produtos', []);
        const vendasSheet = getOrCreateSheet('Vendas', []);
        
        // Testa adicionar produto
        const testProduct = {
            nome: 'Produto Teste ' + new Date().getTime(),
            categoria: 'maquiagem',
            custo: 10.50,
            estoque: 20
        };
        
        const addResult = handleAddProduct(testProduct);
        console.log('Teste produto:', addResult.success ? '✅ OK' : '❌ FALHOU');
        
        // Testa buscar produtos
        const getResult = handleGetProducts();
        console.log('Buscar produtos:', getResult.success ? '✅ OK' : '❌ FALHOU');
        
        return {
            success: true,
            message: 'Backend testado com sucesso!',
            produtosCount: getResult.data ? getResult.data.length : 0,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Teste falhou:', error);
        return {
            success: false,
            error: error.toString(),
            message: 'Teste do backend falhou'
        };
    }
}
