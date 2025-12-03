// Variáveis globais
let produtos = [];
let vendas = [];
let carrinho = [];
let modoVendaAtiva = false;

document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    configurarEventos();
    
    // Verificar se há uma venda em andamento
    const vendaEmAndamento = sessionStorage.getItem('vendaEmAndamento');
    if (vendaEmAndamento) {
        carrinho = JSON.parse(vendaEmAndamento);
        iniciarNovaVenda();
    }
});

// Carregar dados iniciais
function carregarDados() {
    produtos = Database.getProducts();
    vendas = Database.getSales();
    
    if (!modoVendaAtiva) {
        atualizarEstatisticasVendas();
        carregarTabelaVendas();
    }
}

// Configurar eventos
function configurarEventos() {
    // Busca em tempo real
    document.getElementById('search-sales').addEventListener('input', function() {
        filtrarVendas(this.value);
    });
    
    document.getElementById('search-venda-products').addEventListener('input', function() {
        filtrarProdutosVenda(this.value);
    });
    
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Desconto
    document.getElementById('desconto').addEventListener('input', calcularTotal);
    
    // Formas de pagamento
    document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
        radio.addEventListener('change', calcularTotal);
    });
}

// Iniciar nova venda
function iniciarNovaVenda() {
    modoVendaAtiva = true;
    
    // Mostrar painel de venda e esconder lista
    document.getElementById('nova-venda-container').style.display = 'block';
    document.getElementById('lista-vendas-container').style.display = 'none';
    
    // Carregar produtos para venda
    carregarProdutosVenda();
    
    // Atualizar carrinho
    atualizarCarrinho();
    
    // Calcular total
    calcularTotal();
}

// Cancelar venda
function cancelarVenda() {
    if (carrinho.length > 0 && !confirm('Tem certeza que deseja cancelar esta venda? Os itens do carrinho serão perdidos.')) {
        return;
    }
    
    modoVendaAtiva = false;
    carrinho = [];
    
    // Limpar session storage
    sessionStorage.removeItem('vendaEmAndamento');
    
    // Mostrar lista e esconder venda
    document.getElementById('nova-venda-container').style.display = 'none';
    document.getElementById('lista-vendas-container').style.display = 'block';
    
    // Recarregar dados
    carregarDados();
    
    showNotification('Venda cancelada', 'info');
}

// Carregar produtos para venda
function carregarProdutosVenda(filtro = '') {
    const grid = document.getElementById('venda-products-grid');
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    
    // Filtrar produtos
    let produtosFiltrados = produtos;
    if (filtro) {
        const filtroLower = filtro.toLowerCase();
        produtosFiltrados = produtos.filter(p => 
            p.nome.toLowerCase().includes(filtroLower) ||
            (p.codigo && p.codigo.toLowerCase().includes(filtroLower)) ||
            (p.categoria && p.categoria.toLowerCase().includes(filtroLower))
        );
    }
    
    // Limpar grid
    grid.innerHTML = '';
    
    if (produtosFiltrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <p>Nenhum produto encontrado</p>
            </div>
        `;
        return;
    }
    
    // Adicionar produtos
    produtosFiltrados.forEach(produto => {
        const card = document.createElement('div');
        card.className = `product-sale-card ${produto.estoque === 0 ? 'out-of-stock' : ''}`;
        card.dataset.id = produto.id;
        
        // Determinar ícone baseado na categoria
        const categoriaInfo = getCategoriaInfo(produto.categoria);
        
        // Preço de venda (usar preço sugerido ou calcular markup)
        let precoVenda = produto.precoSugerido || 0;
        if (!precoVenda && produto.custo) {
            const markup = produto.markup || 1.98; // Markup padrão
            precoVenda = produto.custo * markup;
        }
        
        // Status do estoque
        let estoqueClass = '';
        let estoqueText = `${produto.estoque} em estoque`;
        
        if (produto.estoque === 0) {
            estoqueClass = 'out';
            estoqueText = 'Esgotado';
        } else if (produto.estoque <= estoqueMinimo) {
            estoqueClass = 'low';
            estoqueText = `Apenas ${produto.estoque} unidades`;
        }
        
        card.innerHTML = `
            <div class="product-sale-icon ${categoriaInfo.classe}">
                <i class="${categoriaInfo.icone}"></i>
            </div>
            <h4>${produto.nome}</h4>
            <p>${categoriaInfo.nome}</p>
            <div class="product-price">R$ ${precoVenda.toFixed(2)}</div>
            <div class="product-stock ${estoqueClass}">${estoqueText}</div>
        `;
        
        if (produto.estoque > 0) {
            card.addEventListener('click', function() {
                adicionarAoCarrinho(produto, precoVenda);
            });
        }
        
        grid.appendChild(card);
    });
}

// Filtrar produtos para venda
function filtrarProdutosVenda(termo) {
    carregarProdutosVenda(termo);
}

// Informações da categoria (função auxiliar)
function getCategoriaInfo(categoria) {
    const categorias = {
        'maquiagem': { nome: 'Maquiagem', icone: 'fas fa-palette', classe: 'makeup' },
        'skincare': { nome: 'Skincare', icone: 'fas fa-spa', classe: 'skincare' },
        'acessorios': { nome: 'Acessórios', icone: 'fas fa-gem', classe: 'acessorios' },
        'fragrancias': { nome: 'Fragrâncias', icone: 'fas fa-wind', classe: 'fragrancias' },
        'cabelos': { nome: 'Cabelos', icone: 'fas fa-cut', classe: 'cabelos' }
    };
    
    return categorias[categoria] || { nome: 'Outros', icone: 'fas fa-box', classe: '' };
}

// Adicionar produto ao carrinho
function adicionarAoCarrinho(produto, precoUnitario) {
    // Verificar se produto já está no carrinho
    const itemExistente = carrinho.find(item => item.produtoId === produto.id);
    
    if (itemExistente) {
        // Verificar se há estoque suficiente
        if (itemExistente.quantidade >= produto.estoque) {
            showNotification('Estoque insuficiente para adicionar mais unidades', 'error');
            return;
        }
        
        // Aumentar quantidade
        itemExistente.quantidade++;
        itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
    } else {
        // Verificar se há estoque
        if (produto.estoque < 1) {
            showNotification('Produto sem estoque disponível', 'error');
            return;
        }
        
        // Adicionar novo item
        carrinho.push({
            produtoId: produto.id,
            nome: produto.nome,
            precoUnitario: precoUnitario,
            quantidade: 1,
            subtotal: precoUnitario,
            categoria: produto.categoria
        });
    }
    
    // Atualizar interface
    atualizarCarrinho();
    
    // Salvar no session storage
    sessionStorage.setItem('vendaEmAndamento', JSON.stringify(carrinho));
    
    showNotification(`${produto.nome} adicionado ao carrinho`, 'success');
}

// Atualizar carrinho
function atualizarCarrinho() {
    const container = document.getElementById('cart-items');
    const countElement = document.getElementById('cart-count');
    
    // Atualizar contador
    const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
    countElement.textContent = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
    
    // Limpar container
    container.innerHTML = '';
    
    if (carrinho.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
                <small>Adicione produtos clicando neles</small>
            </div>
        `;
        return;
    }
    
    // Adicionar itens
    carrinho.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        
        // Ícone baseado na categoria
        const categoriaInfo = getCategoriaInfo(item.categoria);
        
        div.innerHTML = `
            <div class="cart-item-image ${categoriaInfo.classe}">
                <i class="${categoriaInfo.icone}"></i>
            </div>
            <div class="cart-item-details">
                <h4>${item.nome}</h4>
                <div class="cart-item-price">R$ ${item.precoUnitario.toFixed(2)} cada</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button onclick="alterarQuantidade(${index}, -1)">-</button>
                    <input type="number" value="${item.quantidade}" min="1" 
                           onchange="alterarQuantidadeInput(${index}, this.value)">
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="cart-item-total">R$ ${item.subtotal.toFixed(2)}</div>
                <button class="remove-item" onclick="removerDoCarrinho(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    // Calcular total
    calcularTotal();
}

// Alterar quantidade com botões
function alterarQuantidade(index, delta) {
    const item = carrinho[index];
    const produto = produtos.find(p => p.id === item.produtoId);
    
    const novaQuantidade = item.quantidade + delta;
    
    if (novaQuantidade < 1) {
        removerDoCarrinho(index);
        return;
    }
    
    if (novaQuantidade > produto.estoque) {
        showNotification(`Estoque insuficiente. Disponível: ${produto.estoque} unidades`, 'error');
        return;
    }
    
    item.quantidade = novaQuantidade;
    item.subtotal = novaQuantidade * item.precoUnitario;
    
    atualizarCarrinho();
    sessionStorage.setItem('vendaEmAndamento', JSON.stringify(carrinho));
}

// Alterar quantidade com input
function alterarQuantidadeInput(index, valor) {
    const quantidade = parseInt(valor);
    
    if (isNaN(quantidade) || quantidade < 1) {
        return;
    }
    
    const item = carrinho[index];
    const produto = produtos.find(p => p.id === item.produtoId);
    
    if (quantidade > produto.estoque) {
        showNotification(`Estoque insuficiente. Disponível: ${produto.estoque} unidades`, 'error');
        return;
    }
    
    item.quantidade = quantidade;
    item.subtotal = quantidade * item.precoUnitario;
    
    atualizarCarrinho();
    sessionStorage.setItem('vendaEmAndamento', JSON.stringify(carrinho));
}

// Remover do carrinho
function removerDoCarrinho(index) {
    const item = carrinho[index];
    carrinho.splice(index, 1);
    
    atualizarCarrinho();
    sessionStorage.setItem('vendaEmAndamento', JSON.stringify(carrinho));
    
    showNotification(`${item.nome} removido do carrinho`, 'info');
}

// Calcular total da venda
function calcularTotal() {
    // Calcular subtotal
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    
    // Aplicar desconto
    const descontoPercent = parseFloat(document.getElementById('desconto').value) || 0;
    const descontoValor = subtotal * (descontoPercent / 100);
    
    // Calcular taxas (3.5% para cartão, 0 para outros)
    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;
    const taxaPercent = (pagamento.includes('cartao')) ? 3.5 : 0;
    const taxas = (subtotal - descontoValor) * (taxaPercent / 100);
    
    // Calcular total
    const total = subtotal - descontoValor + taxas;
    
    // Atualizar interface
    document.getElementById('subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('taxas').textContent = `R$ ${taxas.toFixed(2)}`;
    document.getElementById('total-venda').textContent = `R$ ${total.toFixed(2)}`;
}

// Finalizar venda
function finalizarVenda() {
    if (carrinho.length === 0) {
        showNotification('Adicione produtos ao carrinho antes de finalizar', 'error');
        return;
    }
    
    const pagamento = document.querySelector('input[name="pagamento"]:checked').value;
    const descontoPercent = parseFloat(document.getElementById('desconto').value) || 0;
    
    // Calcular totais
    const subtotal = carrinho.reduce((total, item) => total + item.subtotal, 0);
    const descontoValor = subtotal * (descontoPercent / 100);
    const taxaPercent = (pagamento.includes('cartao')) ? 3.5 : 0;
    const taxas = (subtotal - descontoValor) * (taxaPercent / 100);
    const total = subtotal - descontoValor + taxas;
    
    // Criar objeto de venda
    const venda = {
        produtos: carrinho.map(item => ({
            produtoId: item.produtoId,
            nome: item.nome,
            precoUnitario: item.precoUnitario,
            quantidade: item.quantidade,
            subtotal: item.subtotal
        })),
        subtotal: subtotal,
        desconto: descontoValor,
        descontoPercent: descontoPercent,
        taxas: taxas,
        valorTotal: total,
        formaPagamento: pagamento,
        status: 'concluida',
        data: new Date().toISOString()
    };
    
    // Registrar venda
    const vendaRegistrada = Database.addSale(venda);
    
    if (vendaRegistrada) {
        // Registrar movimentação de estoque
        carrinho.forEach(item => {
            const movimentacao = {
                id: Date.now().toString() + item.produtoId,
                data: new Date().toISOString(),
                produtoId: item.produtoId,
                produtoNome: item.nome,
                tipo: 'venda',
                quantidade: item.quantidade,
                saldoAnterior: produtos.find(p => p.id === item.produtoId).estoque + item.quantidade,
                saldoAtual: produtos.find(p => p.id === item.produtoId).estoque,
                motivo: 'Venda',
                observacoes: `Venda #${vendaRegistrada.id}`,
                responsavel: 'Vendedor'
            };
            
            // Adicionar ao histórico de movimentações
            let movimentacoes = JSON.parse(localStorage.getItem('movimentacoesEstoque')) || [];
            movimentacoes.unshift(movimentacao);
            localStorage.setItem('movimentacoesEstoque', JSON.stringify(movimentacoes));
        });
        
        // Limpar carrinho e session storage
        carrinho = [];
        sessionStorage.removeItem('vendaEmAndamento');
        
        // Gerar recibo
        gerarRecibo(vendaRegistrada);
        
        // Voltar para lista de vendas
        modoVendaAtiva = false;
        document.getElementById('nova-venda-container').style.display = 'none';
        document.getElementById('lista-vendas-container').style.display = 'block';
        
        // Recarregar dados
        carregarDados();
        
        showNotification('Venda finalizada com sucesso!', 'success');
    } else {
        showNotification('Erro ao registrar venda', 'error');
    }
}

// Gerar recibo
function gerarRecibo(venda) {
    const data = new Date(venda.data);
    const numeroVenda = venda.id.slice(-6);
    
    let conteudo = `
        =================================
              BEAUTYSTORE - RECIBO
        =================================
        
        Número: ${numeroVenda}
        Data: ${data.toLocaleDateString('pt-BR')}
        Hora: ${data.toLocaleTimeString('pt-BR')}
        
        =================================
        ITENS:
        
    `;
    
    venda.produtos.forEach((item, index) => {
        conteudo += `
        ${index + 1}. ${item.nome}
           ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}
        `;
    });
    
    conteudo += `
        =================================
        SUBTOTAL:      R$ ${venda.subtotal.toFixed(2)}
        DESCONTO:      R$ ${venda.desconto.toFixed(2)} (${venda.descontoPercent}%)
        TAXAS:         R$ ${venda.taxas.toFixed(2)}
        TOTAL:         R$ ${venda.valorTotal.toFixed(2)}
        
        FORMA DE PAGAMENTO: ${formatarPagamento(venda.formaPagamento)}
        
        =================================
        Obrigado pela preferência!
        Volte sempre! 💄
        =================================
    `;
    
    // Mostrar recibo em nova janela
    const janelaRecibo = window.open('', '_blank');
    janelaRecibo.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recibo #${numeroVenda}</title>
            <style>
                body { 
                    font-family: 'Courier New', monospace; 
                    margin: 20px;
                    line-height: 1.4;
                }
                @media print {
                    body { font-size: 12px; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <pre>${conteudo}</pre>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()">Imprimir Recibo</button>
                <button onclick="window.close()">Fechar</button>
            </div>
        </body>
        </html>
    `);
    janelaRecibo.document.close();
}

// Formatar forma de pagamento
function formatarPagamento(forma) {
    const formas = {
        'dinheiro': 'Dinheiro',
        'cartao_credito': 'Cartão de Crédito',
        'cartao_debito': 'Cartão de Débito',
        'pix': 'PIX'
    };
    
    return formas[forma] || forma;
}

// Atualizar estatísticas de vendas
function atualizarEstatisticasVendas() {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    
    // Vendas do mês atual
    const vendasMes = vendas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda.getMonth() === mesAtual && 
               dataVenda.getFullYear() === anoAtual &&
               v.status === 'concluida';
    });
    
    // Vendas totais
    const vendasConcluidas = vendas.filter(v => v.status === 'concluida');
    
    // Cálculos
    const totalVendas = vendasConcluidas.length;
    const faturamentoTotal = vendasConcluidas.reduce((total, v) => total + v.valorTotal, 0);
    const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;
    
    // Melhor dia
    let melhorDia = '-';
    if (vendasMes.length > 0) {
        const vendasPorDia = {};
        vendasMes.forEach(v => {
            const dia = new Date(v.data).getDate();
            vendasPorDia[dia] = (vendasPorDia[dia] || 0) + v.valorTotal;
        });
        
        const melhor = Object.entries(vendasPorDia).reduce((a, b) => a[1] > b[1] ? a : b);
        melhorDia = `${melhor[0]}/${agora.getMonth() + 1}`;
    }
    
    // Atualizar interface
    document.getElementById('total-sales').textContent = totalVendas;
    document.getElementById('total-revenue').textContent = `R$ ${faturamentoTotal.toFixed(2)}`;
    document.getElementById('avg-ticket').textContent = `R$ ${ticketMedio.toFixed(2)}`;
    document.getElementById('best-day').textContent = melhorDia;
}

// Carregar tabela de vendas
function carregarTabelaVendas(filtros = {}) {
    const tbody = document.getElementById('sales-table-body');
    
    // Aplicar filtros
    let vendasFiltradas = [...vendas];
    
    // Filtrar por período
    if (filtros.periodo) {
        const agora = new Date();
        let inicio, fim;
        
        switch(filtros.periodo) {
            case 'hoje':
                inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
                fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
                break;
            case 'semana':
                const diaSemana = agora.getDay();
                const diff = agora.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
                inicio = new Date(agora.getFullYear(), agora.getMonth(), diff);
                fim = new Date(agora.getFullYear(), agora.getMonth(), diff + 6, 23, 59, 59);
                break;
            case 'mes':
                inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
                fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'trimestre':
                const trimestre = Math.floor(agora.getMonth() / 3);
                inicio = new Date(agora.getFullYear(), trimestre * 3, 1);
                fim = new Date(agora.getFullYear(), (trimestre + 1) * 3, 0, 23, 59, 59);
                break;
            case 'ano':
                inicio = new Date(agora.getFullYear(), 0, 1);
                fim = new Date(agora.getFullYear(), 11, 31, 23, 59, 59);
                break;
        }
        
        if (inicio && fim) {
            vendasFiltradas = vendasFiltradas.filter(v => {
                const dataVenda = new Date(v.data);
                return dataVenda >= inicio && dataVenda <= fim;
            });
        }
    }
    
    // Filtrar por status
    if (filtros.status) {
        vendasFiltradas = vendasFiltradas.filter(v => v.status === filtros.status);
    }
    
    // Filtrar por forma de pagamento
    if (filtros.pagamento) {
        vendasFiltradas = vendasFiltradas.filter(v => v.formaPagamento === filtros.pagamento);
    }
    
    // Ordenar por data (mais recente primeiro)
    vendasFiltradas.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Limitar a 50 registros
    vendasFiltradas = vendasFiltradas.slice(0, 50);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (vendasFiltradas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhuma venda encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Preencher tabela
    vendasFiltradas.forEach(venda => {
        const tr = document.createElement('tr');
        const data = new Date(venda.data);
        
        // Status
        let statusClass = '';
        let statusText = '';
        
        switch(venda.status) {
            case 'concluida':
                statusClass = 'status-concluida';
                statusText = 'Concluída';
                break;
            case 'cancelada':
                statusClass = 'status-cancelada';
                statusText = 'Cancelada';
                break;
            case 'pendente':
                statusClass = 'status-pendente';
                statusText = 'Pendente';
                break;
        }
        
        // Produtos (resumo)
        const produtosResumo = venda.produtos.map(p => p.nome).join(', ').substring(0, 30) + '...';
        const totalItens = venda.produtos.reduce((total, p) => total + p.quantidade, 0);
        
        tr.innerHTML = `
            <td>#${venda.id.slice(-6)}</td>
            <td>
                ${data.toLocaleDateString('pt-BR')}<br>
                <small>${data.toLocaleTimeString('pt-BR')}</small>
            </td>
            <td>${produtosResumo}</td>
            <td>${totalItens}</td>
            <td>R$ ${venda.valorTotal.toFixed(2)}</td>
            <td>${formatarPagamento(venda.formaPagamento)}</td>
            <td><span class="sale-status ${statusClass}">${statusText}</span></td>
            <td>
                <div class="sale-actions">
                    <button class="btn-view" onclick="verDetalhesVenda('${venda.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${venda.status === 'concluida' ? `
                    <button class="btn-cancel-sale" onclick="solicitarCancelamento('${venda.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-reprint" onclick="reimprimirRecibo('${venda.id}')">
                        <i class="fas fa-print"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Filtrar vendas
function filtrarVendas(termo) {
    const termoLower = termo.toLowerCase();
    const vendasFiltradas = vendas.filter(v => 
        v.id.toLowerCase().includes(termoLower) ||
        v.produtos.some(p => p.nome.toLowerCase().includes(termoLower))
    );
    
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '';
    
    // Mesma lógica de exibição da função carregarTabelaVendas...
    // (Implementação similar, omitida por brevidade)
}

// Aplicar filtros de vendas
function aplicarFiltrosVendas() {
    const periodo = document.getElementById('filter-period').value;
    const status = document.getElementById('filter-status').value;
    const pagamento = document.getElementById('filter-payment').value;
    
    carregarTabelaVendas({
        periodo: periodo,
        status: status,
        pagamento: pagamento
    });
}

// Ver detalhes da venda
function verDetalhesVenda(vendaId) {
    const venda = vendas.find(v => v.id === vendaId);
    
    if (!venda) {
        showNotification('Venda não encontrada', 'error');
        return;
    }
    
    const data = new Date(venda.data);
    const modal = document.getElementById('sale-details-modal');
    const content = document.getElementById('sale-details-content');
    
    let produtosHTML = '';
    venda.produtos.forEach((produto, index) => {
        const categoriaInfo = getCategoriaInfo(produto.categoria);
        
        produtosHTML += `
            <div class="sale-product-item">
                <div class="sale-product-image ${categoriaInfo.classe}">
                    <i class="${categoriaInfo.icone}"></i>
                </div>
                <div class="sale-product-details">
                    <h5>${produto.nome}</h5>
                    <div class="sale-product-price">
                        ${produto.quantidade} x R$ ${produto.precoUnitario.toFixed(2)} = R$ ${produto.subtotal.toFixed(2)}
                    </div>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = `
        <div class="sale-header">
            <div class="sale-header-item">
                <span class="sale-header-label">Número da Venda</span>
                <span class="sale-header-value">#${venda.id.slice(-6)}</span>
            </div>
            <div class="sale-header-item">
                <span class="sale-header-label">Data e Hora</span>
                <span class="sale-header-value">${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR')}</span>
            </div>
            <div class="sale-header-item">
                <span class="sale-header-label">Forma de Pagamento</span>
                <span class="sale-header-value">${formatarPagamento(venda.formaPagamento)}</span>
            </div>
            <div class="sale-header-item">
                <span class="sale-header-label">Status</span>
                <span class="sale-header-value">
                    <span class="sale-status ${venda.status === 'concluida' ? 'status-concluida' : venda.status === 'cancelada' ? 'status-cancelada' : 'status-pendente'}">
                        ${venda.status === 'concluida' ? 'Concluída' : venda.status === 'cancelada' ? 'Cancelada' : 'Pendente'}
                    </span>
                </span>
            </div>
        </div>
        
        <div class="sale-products">
            <h4>Produtos Vendidos</h4>
            ${produtosHTML}
        </div>
        
        <div class="sale-summary">
            <h4>Resumo Financeiro</h4>
            <div class="sale-summary-item">
                <span>Subtotal:</span>
                <span>R$ ${venda.subtotal.toFixed(2)}</span>
            </div>
            <div class="sale-summary-item">
                <span>Desconto (${venda.descontoPercent}%):</span>
                <span>- R$ ${venda.desconto.toFixed(2)}</span>
            </div>
            <div class="sale-summary-item">
                <span>Taxas:</span>
                <span>R$ ${venda.taxas.toFixed(2)}</span>
            </div>
            <div class="sale-summary-item total">
                <span>TOTAL:</span>
                <span>R$ ${venda.valorTotal.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// Solicitar cancelamento de venda
function solicitarCancelamento(vendaId) {
    const venda = vendas.find(v => v.id === vendaId);
    
    if (!venda || venda.status !== 'concluida') {
        showNotification('Esta venda não pode ser cancelada', 'error');
        return;
    }
    
    const modal = document.getElementById('cancel-modal');
    const message = document.getElementById('cancel-message');
    const confirmBtn = document.getElementById('confirm-cancel');
    
    message.textContent = `Tem certeza que deseja cancelar a venda #${vendaId.slice(-6)}?`;
    
    confirmBtn.onclick = function() {
        cancelarVendaConfirmado(vendaId);
    };
    
    modal.style.display = 'flex';
}

// Cancelar venda confirmado
function cancelarVendaConfirmado(vendaId) {
    const motivo = document.getElementById('cancel-reason').value;
    
    if (!motivo.trim()) {
        showNotification('Por favor, informe o motivo do cancelamento', 'error');
        return;
    }
    
    // Atualizar status da venda
    let vendasAtualizadas = vendas.map(v => {
        if (v.id === vendaId) {
            return {
                ...v,
                status: 'cancelada',
                motivoCancelamento: motivo,
                dataCancelamento: new Date().toISOString()
            };
        }
        return v;
    });
    
    // Atualizar no banco de dados (local storage)
    localStorage.setItem('vendas', JSON.stringify(vendasAtualizadas));
    
    // Reverter estoque dos produtos
    const venda = vendas.find(v => v.id === vendaId);
    venda.produtos.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        if (produto) {
            Database.updateProduct(item.produtoId, {
                estoque: produto.estoque + item.quantidade,
                ultimaMovimentacao: new Date().toISOString()
            });
        }
    });
    
    // Fechar modal e recarregar dados
    fecharCancelModal();
    carregarDados();
    
    showNotification('Venda cancelada com sucesso', 'success');
}

// Fechar modal de cancelamento
function fecharCancelModal() {
    document.getElementById('cancel-modal').style.display = 'none';
    document.getElementById('cancel-reason').value = '';
}

// Reimprimir recibo
function reimprimirRecibo(vendaId) {
    const venda = vendas.find(v => v.id === vendaId);
    
    if (venda) {
        gerarRecibo(venda);
    }
}

// Exportar vendas
function exportarVendas() {
    if (vendas.length === 0) {
        showNotification('Nenhuma venda para exportar', 'warning');
        return;
    }
    
    let csv = 'ID;Data;Produtos;Quantidade Total;Subtotal;Desconto;Taxas;Total;Pagamento;Status\n';
    
    vendas.forEach(venda => {
        const data = new Date(venda.data);
        const produtosLista = venda.produtos.map(p => p.nome).join(', ');
        const totalItens = venda.produtos.reduce((total, p) => total + p.quantidade, 0);
        
        csv += `${venda.id.slice(-6)};`;
        csv += `${data.toLocaleString('pt-BR')};`;
        csv += `"${produtosLista}";`;
        csv += `${totalItens};`;
        csv += `${venda.subtotal.toFixed(2)};`;
        csv += `${venda.desconto.toFixed(2)};`;
        csv += `${venda.taxas.toFixed(2)};`;
        csv += `${venda.valorTotal.toFixed(2)};`;
        csv += `${formatarPagamento(venda.formaPagamento)};`;
        csv += `${venda.status}\n`;
    });
    
    // Criar blob e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Exportação iniciada!', 'success');
}

// Imprimir vendas
function imprimirVendas() {
    window.print();
}

// Abrir relatórios
function abrirRelatorios() {
    window.location.href = '../relatorios/index.html';
}