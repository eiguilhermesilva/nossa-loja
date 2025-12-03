document.addEventListener('DOMContentLoaded', function() {
    carregarProdutos();
    carregarHistorico();
    carregarConfiguracoes();
    
    // Adicionar evento de busca em tempo real
    document.getElementById('search-product').addEventListener('input', function() {
        filtrarProdutos(this.value);
    });
});

// Carregar produtos da base de dados
function carregarProdutos() {
    const produtos = Database.getProducts();
    const productList = document.getElementById('product-list');
    
    if (produtos.length === 0) {
        productList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Nenhum produto cadastrado</p>
                <a href="../produtos/index.html" class="btn-link">Cadastrar primeiro produto</a>
            </div>
        `;
        return;
    }
    
    productList.innerHTML = '';
    
    produtos.forEach(produto => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.dataset.id = produto.id;
        
        // Definir ícone baseado na categoria
        let iconClass = 'makeup';
        let icon = 'fas fa-palette';
        
        if (produto.categoria === 'skincare') {
            iconClass = 'skincare';
            icon = 'fas fa-spa';
        } else if (produto.categoria === 'acessorios') {
            iconClass = 'accessory';
            icon = 'fas fa-gem';
        }
        
        productItem.innerHTML = `
            <div class="product-icon ${iconClass}">
                <i class="${icon}"></i>
            </div>
            <div class="product-info">
                <h4>${produto.nome}</h4>
                <p>Custo: R$ ${produto.custo ? produto.custo.toFixed(2) : '0,00'}</p>
                <small>Código: ${produto.codigo || 'N/A'}</small>
            </div>
        `;
        
        productItem.addEventListener('click', function() {
            selecionarProduto(produto);
        });
        
        productList.appendChild(productItem);
    });
}

// Filtrar produtos na lista
function filtrarProdutos(termo) {
    const produtos = Database.getProducts();
    const productItems = document.querySelectorAll('.product-item');
    
    if (!termo.trim()) {
        productItems.forEach(item => item.style.display = 'flex');
        return;
    }
    
    const termoLower = termo.toLowerCase();
    
    productItems.forEach(item => {
        const nome = item.querySelector('h4').textContent.toLowerCase();
        const codigo = item.querySelector('small').textContent.toLowerCase();
        
        if (nome.includes(termoLower) || codigo.includes(termoLower)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Buscar produtos (para o botão de busca)
function searchProducts() {
    const termo = document.getElementById('search-product').value;
    filtrarProdutos(termo);
}

// Selecionar produto para precificação
function selecionarProduto(produto) {
    // Remover seleção anterior
    document.querySelectorAll('.product-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Adicionar seleção ao item clicado
    const selectedItem = document.querySelector(`.product-item[data-id="${produto.id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Atualizar informações do produto selecionado
    const selectedInfo = document.getElementById('selected-product-info');
    selectedInfo.className = 'selected-product active';
    
    selectedInfo.innerHTML = `
        <h4>${produto.nome}</h4>
        <p><strong>Categoria:</strong> ${produto.categoria || 'Não informada'}</p>
        <p><strong>Estoque atual:</strong> ${produto.estoque || 0} unidades</p>
        <p><strong>Custo atual:</strong> R$ ${produto.custo ? produto.custo.toFixed(2) : '0,00'}</p>
    `;
    
    // Preencher os campos com os dados do produto
    document.getElementById('custo-produto').value = produto.custo || '';
    
    // Carregar configurações de precificação do produto, se existirem
    if (produto.precificacao) {
        document.getElementById('frete').value = produto.precificacao.frete || 0;
        document.getElementById('outros-custos').value = produto.precificacao.outrosCustos || 0;
        document.getElementById('margem').value = produto.precificacao.margem || localStorage.getItem('margem') || 40;
    } else {
        // Usar configurações padrão
        document.getElementById('frete').value = 0;
        document.getElementById('outros-custos').value = 0;
        document.getElementById('margem').value = localStorage.getItem('margem') || 40;
    }
    
    // Salvar o produto selecionado no localStorage para uso posterior
    sessionStorage.setItem('produtoSelecionado', JSON.stringify(produto));
}

// Carregar configurações salvas
function carregarConfiguracoes() {
    document.getElementById('taxa-cartao').value = localStorage.getItem('taxaCartao') || 3.5;
    document.getElementById('imposto').value = localStorage.getItem('imposto') || 6;
    document.getElementById('margem').value = localStorage.getItem('margem') || 40;
    document.getElementById('despesas-mensais').value = localStorage.getItem('despesasMensais') || 4000;
    document.getElementById('vendas-mensais').value = localStorage.getItem('vendasMensais') || 200;
}

// Calcular precificação
function calcularPrecificacao() {
    // Obter valores dos campos
    const custoProduto = parseFloat(document.getElementById('custo-produto').value) || 0;
    const frete = parseFloat(document.getElementById('frete').value) || 0;
    const outrosCustos = parseFloat(document.getElementById('outros-custos').value) || 0;
    const despesasMensais = parseFloat(document.getElementById('despesas-mensais').value) || 0;
    const vendasMensais = parseInt(document.getElementById('vendas-mensais').value) || 1;
    const taxaCartao = parseFloat(document.getElementById('taxa-cartao').value) || 0;
    const imposto = parseFloat(document.getElementById('imposto').value) || 0;
    const margem = parseFloat(document.getElementById('margem').value) || 0;
    
    // Validar entrada
    if (custoProduto <= 0) {
        showNotification('Por favor, insira um custo válido para o produto', 'error');
        return;
    }
    
    if (vendasMensais <= 0) {
        showNotification('Número de vendas mensais deve ser maior que zero', 'error');
        return;
    }
    
    // 1. Calcular Custo de Compra (CC)
    const CC = custoProduto + frete + outrosCustos;
    
    // 2. Calcular Custo Operacional (CO)
    const CO = despesasMensais / vendasMensais;
    
    // 3. Calcular CMV (Custo da Mercadoria Vendida)
    const CMV = CC + CO;
    
    // 4. Calcular taxas totais em decimal
    const taxasTotais = (taxaCartao + imposto + margem) / 100;
    
    // Verificar se as taxas não ultrapassam 100%
    if (taxasTotais >= 1) {
        showNotification('A soma das taxas e margem não pode ser 100% ou mais', 'error');
        return;
    }
    
    // 5. Calcular Markup
    const markup = 1 / (1 - taxasTotais);
    
    // 6. Calcular Preço de Venda (PV)
    const PV = CMV * markup;
    
    // 7. Calcular margem real
    const margemReal = ((PV - CMV) / PV) * 100;
    
    // Exibir resultados
    document.getElementById('resultado-cc').textContent = `R$ ${CC.toFixed(2)}`;
    document.getElementById('resultado-co').textContent = `R$ ${CO.toFixed(2)}`;
    document.getElementById('resultado-cmv').textContent = `R$ ${CMV.toFixed(2)}`;
    document.getElementById('resultado-markup').textContent = markup.toFixed(3);
    document.getElementById('resultado-pv').textContent = `R$ ${PV.toFixed(2)}`;
    document.getElementById('resultado-margem-real').textContent = `${margemReal.toFixed(1)}%`;
    
    // Mostrar o container de resultados
    document.getElementById('resultado-container').style.display = 'block';
    
    // Scroll suave para os resultados
    document.getElementById('resultado-container').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
    
    // Salvar cálculo no histórico
    salvarNoHistorico({
        data: new Date().toISOString(),
        produto: sessionStorage.getItem('produtoSelecionado') ? 
                 JSON.parse(sessionStorage.getItem('produtoSelecionado')).nome : 'Produto não selecionado',
        custo: CC,
        precoSugerido: PV,
        margem: margemReal,
        markup: markup,
        taxas: {
            cartao: taxaCartao,
            imposto: imposto,
            margemDesejada: margem
        }
    });
}

// Salvar no histórico
function salvarNoHistorico(calculo) {
    let historico = JSON.parse(localStorage.getItem('historicoPrecificacao')) || [];
    
    calculo.id = Date.now().toString();
    historico.unshift(calculo); // Adicionar no início
    
    // Manter apenas os últimos 50 cálculos
    if (historico.length > 50) {
        historico = historico.slice(0, 50);
    }
    
    localStorage.setItem('historicoPrecificacao', JSON.stringify(historico));
    
    // Atualizar tabela de histórico
    carregarHistorico();
}

// Carregar histórico
function carregarHistorico() {
    const historico = JSON.parse(localStorage.getItem('historicoPrecificacao')) || [];
    const tbody = document.getElementById('historico-body');
    
    tbody.innerHTML = '';
    
    if (historico.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhum cálculo de precificação realizado ainda</p>
                </td>
            </tr>
        `;
        return;
    }
    
    historico.forEach(item => {
        const data = new Date(item.data).toLocaleDateString('pt-BR');
        const hora = new Date(item.data).toLocaleTimeString('pt-BR');
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${data}<br><small>${hora}</small></td>
            <td>${item.produto}</td>
            <td>R$ ${item.custo.toFixed(2)}</td>
            <td>R$ ${item.precoSugerido.toFixed(2)}</td>
            <td>${item.margem.toFixed(1)}%</td>
            <td>
                <div class="historico-actions">
                    <button class="btn-reutilizar" onclick="reutilizarCalculo('${item.id}')">
                        <i class="fas fa-redo"></i> Reutilizar
                    </button>
                    <button class="btn-excluir" onclick="excluirDoHistorico('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Reutilizar cálculo do histórico
function reutilizarCalculo(id) {
    const historico = JSON.parse(localStorage.getItem('historicoPrecificacao')) || [];
    const calculo = historico.find(item => item.id === id);
    
    if (!calculo) {
        showNotification('Cálculo não encontrado no histórico', 'error');
        return;
    }
    
    // Preencher os campos com os dados do cálculo
    document.getElementById('taxa-cartao').value = calculo.taxas.cartao;
    document.getElementById('imposto').value = calculo.taxas.imposto;
    document.getElementById('margem').value = calculo.taxas.margemDesejada;
    
    // Mostrar notificação
    showNotification('Configurações do cálculo carregadas! Ajuste os custos e calcule novamente.', 'success');
    
    // Foco no campo de custo
    document.getElementById('custo-produto').focus();
}

// Excluir do histórico
function excluirDoHistorico(id) {
    if (!confirm('Tem certeza que deseja excluir este cálculo do histórico?')) {
        return;
    }
    
    let historico = JSON.parse(localStorage.getItem('historicoPrecificacao')) || [];
    historico = historico.filter(item => item.id !== id);
    
    localStorage.setItem('historicoPrecificacao', JSON.stringify(historico));
    carregarHistorico();
    
    showNotification('Cálculo excluído do histórico', 'success');
}

// Salvar precificação no produto
function salvarPrecificacao() {
    const produtoSelecionado = sessionStorage.getItem('produtoSelecionado');
    
    if (!produtoSelecionado) {
        showNotification('Por favor, selecione um produto primeiro', 'error');
        return;
    }
    
    const produto = JSON.parse(produtoSelecionado);
    const precoSugerido = parseFloat(document.getElementById('resultado-pv').textContent.replace('R$ ', '').replace(',', '.'));
    const markup = parseFloat(document.getElementById('resultado-markup').textContent);
    
    // Obter dados do cálculo atual
    const calculo = {
        frete: parseFloat(document.getElementById('frete').value) || 0,
        outrosCustos: parseFloat(document.getElementById('outros-custos').value) || 0,
        margem: parseFloat(document.getElementById('margem').value) || 0,
        precoSugerido: precoSugerido,
        markup: markup,
        dataCalculo: new Date().toISOString()
    };
    
    // Atualizar produto
    const produtoAtualizado = Database.updateProduct(produto.id, {
        precificacao: calculo,
        precoSugerido: precoSugerido,
        markup: markup,
        atualizadoEm: new Date().toISOString()
    });
    
    if (produtoAtualizado) {
        showNotification('Precificação salva no produto com sucesso!', 'success');
        
        // Atualizar o produto na session storage
        sessionStorage.setItem('produtoSelecionado', JSON.stringify(produtoAtualizado));
        
        // Atualizar a lista de produtos
        carregarProdutos();
    } else {
        showNotification('Erro ao salvar a precificação', 'error');
    }
}

// Compartilhar resultado
function compartilharResultado() {
    const produtoSelecionado = sessionStorage.getItem('produtoSelecionado');
    const produto = produtoSelecionado ? JSON.parse(produtoSelecionado).nome : 'Produto';
    
    const resultado = {
        produto: produto,
        custo: document.getElementById('resultado-cc').textContent,
        cmv: document.getElementById('resultado-cmv').textContent,
        precoSugerido: document.getElementById('resultado-pv').textContent,
        margem: document.getElementById('resultado-margem-real').textContent,
        data: new Date().toLocaleDateString('pt-BR')
    };
    
    const texto = `💰 Precificação - ${resultado.produto}\n\n` +
                  `📊 Custo Total: ${resultado.custo}\n` +
                  `📦 CMV: ${resultado.cmv}\n` +
                  `💰 Preço Sugerido: ${resultado.precoSugerido}\n` +
                  `📈 Margem Real: ${resultado.margem}\n` +
                  `📅 Data: ${resultado.data}\n\n` +
                  `Sistema BeautyStore`;
    
    // Copiar para a área de transferência
    navigator.clipboard.writeText(texto).then(() => {
        showNotification('Resultado copiado para a área de transferência!', 'success');
    }).catch(() => {
        // Fallback para navegadores mais antigos
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Resultado copiado para a área de transferência!', 'success');
    });
}

// Imprimir resultado
function imprimirResultado() {
    const conteudo = document.getElementById('resultado-container').innerHTML;
    const janelaImpressao = window.open('', '_blank');
    
    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Precificação - BeautyStore</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { color: #333; }
                .resultado { margin: 20px 0; }
                .valor { font-weight: bold; color: #2e7d32; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h2>💰 Precificação de Produto</h2>
            <div class="resultado">
                ${conteudo}
            </div>
            <p><small>Impresso em: ${new Date().toLocaleString('pt-BR')}</small></p>
            <button onclick="window.print()">Imprimir</button>
            <button onclick="window.close()">Fechar</button>
        </body>
        </html>
    `);
    
    janelaImpressao.document.close();
}