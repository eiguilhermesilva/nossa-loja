// Google Apps Script para servir como backend do BeautyStore
// Cole este código no Google Apps Script (script.google.com)

const SPREADSHEET_ID = 'SUA_PLANILHA_ID_AQUI';

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    try {
        const action = e.parameter.action;
        let response;
        
        switch(action) {
            case 'getProducts':
                response = getProducts();
                break;
            case 'addProduct':
                response = addProduct(e.parameter.data);
                break;
            case 'updateProduct':
                response = updateProduct(e.parameter.id, e.parameter.data);
                break;
            case 'deleteProduct':
                response = deleteProduct(e.parameter.id);
                break;
            case 'getSales':
                response = getSales();
                break;
            case 'addSale':
                response = addSale(e.parameter.data);
                break;
            case 'getReports':
                response = getReports(e.parameter.type, e.parameter.period);
                break;
            default:
                response = { error: 'Ação não reconhecida' };
        }
        
        return ContentService
            .createTextOutput(JSON.stringify(response))
            .setMimeType(ContentService.MimeType.JSON);
            
    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// Funções para produtos
function getProducts() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Produtos');
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0];
    const products = data.slice(1).map(row => {
        let product = {};
        headers.forEach((header, index) => {
            product[header] = row[index];
        });
        return product;
    });
    
    return { success: true, data: products };
}

function addProduct(productData) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Produtos');
    
    const product = JSON.parse(productData);
    product.id = Date.now().toString();
    product.createdAt = new Date().toISOString();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => product[header] || '');
    
    sheet.appendRow(newRow);
    
    return { success: true, data: product };
}

// Funções para vendas
function getSales() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Vendas');
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0];
    const sales = data.slice(1).map(row => {
        let sale = {};
        headers.forEach((header, index) => {
            sale[header] = row[index];
        });
        return sale;
    });
    
    return { success: true, data: sales };
}

function addSale(saleData) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Vendas');
    
    const sale = JSON.parse(saleData);
    sale.id = Date.now().toString();
    sale.data = new Date().toISOString();
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => sale[header] || '');
    
    sheet.appendRow(newRow);
    
    // Atualizar estoque
    updateStockFromSale(sale);
    
    return { success: true, data: sale };
}

function updateStockFromSale(sale) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const productsSheet = ss.getSheetByName('Produtos');
    const productsData = productsSheet.getDataRange().getValues();
    const headers = productsData[0];
    
    sale.produtos.forEach(item => {
        for (let i = 1; i < productsData.length; i++) {
            const row = productsData[i];
            const productId = row[headers.indexOf('id')];
            
            if (productId === item.produtoId) {
                const stockIndex = headers.indexOf('estoque');
                const currentStock = parseInt(row[stockIndex]) || 0;
                const newStock = currentStock - item.quantidade;
                
                productsSheet.getRange(i + 1, stockIndex + 1).setValue(newStock);
                break;
            }
        }
    });
}

// Funções para relatórios
function getReports(type, period) {
    // Implementar lógica de relatórios
    return { success: true, data: [] };
}

// Deploy como Web App
// 1. Publicar > Implantar como aplicativo web
// 2. Executar como: Eu mesmo
// 3. Quem tem acesso: Qualquer pessoa, mesmo anônimo
// 4. Copiar a URL fornecida