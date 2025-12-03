document.addEventListener('DOMContentLoaded', function() {
    carregarProdutos();
    configurarEventos();
    
    // Fechar modais quando clicar fora
    window.addEventListener('click', function(e) {
        const productModal = document.getElementById('product-modal');
        const confirmModal = document.getElementById('confirm-modal');
        
        if (e.target === productModal) {
            fecharModal();
        }
        
        if (e.target === confirmModal) {
            fecharConfirmModal();
        }
    });
});

// Configurar eventos
function configurarEventos() {
    // Busca em tempo real
    document.getElementById('search-products').addEventListener('input', function() {
        filtrarProdutos(this.value);
    });
    
    // Alternar entre visualizações
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view;
            alternarVisualizacao(view);
        });
    });
    
    // Fechar modais com botão X
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Formulário de produto
    document.getElementById('product-form').addEventListener('submit', function(e) {
        e.preventDefault();
        salvarProduto();
    });
    
    // Gerar código automático
    document.getElementById('product-name').addEventListener('blur', function() {
        gerarCodigoProduto();
    });
}

// Carregar produtos
function carregarProdutos(filtros = {}) {
    const produtos = Database.getProducts(filtros);
    exibirProdutosCards(produtos);
    exibirProdutosTabela(produtos);
}

// Exibir produtos em cards
function exibirProdutosCards(produtos) {
    const grid = document.getElementById('products-grid');
    
    if (produtos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <h3>Nenhum produto encontrado</h3>
                <p>Cadastre seu primeiro produto clicando no botão "Novo Produto"</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    produtos.forEach(produto => {
        const card = criarCardProduto(produto);
        grid.appendChild(card);
    });
}

// Criar card de produto
function criarCardProduto(produto) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = produto.id;
    
    // Determinar ícone e cor baseado na categoria
    const categoriaInfo = getCategoriaInfo(produto.categoria);
    
    // Determinar status do estoque
    const estoqueMinimo = produto.estoqueMinimo || parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    let statusEstoque = 'normal';
    let statusClass = 'stock-normal';
    let statusText = 'Normal';
    
    if (produto.estoque === 0) {
        statusEstoque = 'zero';
        statusClass = 'stock-zero';
        statusText = 'Sem estoque';
    } else if (produto.estoque <= estoqueMinimo) {
        statusEstoque = 'baixo';
        statusClass = 'stock-low';
        statusText = 'Baixo';
    }
    
    card.innerHTML = `
        <div class="product-header">
            <div class="product-icon ${categoriaInfo.classe}">
                <i class="${categoriaInfo.icone}"></i>
            </div>
            <div class="product-title">
                <h3>${produto.nome}</h3>
                <p>${produto.marca || 'Sem marca'} • ${categoriaInfo.nome}</p>
            </div>
        </div>
        <div class="product-body">
            <div class="product-info">
                <div class="info-item">
                    <span class="info-label">Código</span>
                    <span class="info-value">${produto.codigo || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Estoque</span>
                    <span class="info-value ${statusClass}">${produto.estoque} un</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Custo</span>
                    <span class="info-value">R$ ${produto.custo ? produto.custo.toFixed(2) : '0,00'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Preço Sug.</span>
                    <span class="info-value">R$ ${produto.precoSugerido ? produto.precoSugerido.toFixed(2) : '0,00'}</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-action btn-edit" onclick="editarProduto('${produto.id}')">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-action btn-delete" onclick="confirmarExclusao('${produto.id}')">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Exibir produtos em tabela
function exibirProdutosTabela(produtos) {
    const tbody = document.getElementById('products-table-body');
    
    if (produtos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhum produto cadastrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    produtos.forEach(produto => {
        const tr = document.createElement('tr');
        
        // Determinar status do estoque
        const estoqueMinimo = produto.estoqueMinimo || parseInt(localStorage.getItem('estoqueMinimo')) || 5;
        let statusEstoque = '<span class="status-badge status-active">Ativo</span>';
        
        if (produto.estoque === 0) {
            statusEstoque = '<span class="status-badge status-inactive">Sem Estoque</span>';
        } else if (produto.estoque <= estoqueMinimo) {
            statusEstoque = '<span class="status-badge" style="background: #fff3e0; color: #ef6c00;">Estoque Baixo</span>';
        }
        
        tr.innerHTML = `
            <td>${produto.codigo || 'N/A'}</td>
            <td>
                <strong>${produto.nome}</strong><br>
                <small>${produto.marca || 'Sem marca'}</small>
            </td>
            <td>${getCategoriaInfo(produto.categoria).nome}</td>
            <td>${produto.estoque}</td>
            <td>R$ ${produto.custo ? produto.custo.toFixed(2) : '0,00'}</td>
            <td>R$ ${produto.precoSugerido ? produto.precoSugerido.toFixed(2) : '0,00'}</td>
            <td>${statusEstoque}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-action btn-edit" onclick="editarProduto('${produto.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="confirmarExclusao('${produto.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Informações da categoria
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

// Filtrar produtos
function filtrarProdutos(termo) {
    const produtos = Database.getProducts();
    const termoLower = termo.toLowerCase();
    
    const filtrados = produtos.filter(produto => 
        produto.nome.toLowerCase().includes(termoLower) ||
        (produto.codigo && produto.codigo.toLowerCase().includes(termoLower)) ||
        (produto.marca && produto.marca.toLowerCase().includes(termoLower)) ||
        (produto.descricao && produto.descricao.toLowerCase().includes(termoLower))
    );
    
    exibirProdutosCards(filtrados);
    exibirProdutosTabela(filtrados);
}

// Alternar visualização
function alternarVisualizacao(view) {
    const grid = document.getElementById('products-grid');
    const table = document.getElementById('products-table');
    const buttons = document.querySelectorAll('.btn-view');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (view === 'grid') {
        grid.style.display = 'grid';
        table.style.display = 'none';
    } else {
        grid.style.display = 'none';
        table.style.display = 'table';
    }
}

// Mostrar/ocultar filtros
function toggleFilter() {
    const filters = document.getElementById('filters-container');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
}

// Aplicar filtros
function aplicarFiltros() {
    const categoria = document.getElementById('filter-categoria').value;
    const estoque = document.getElementById('filter-estoque').value;
    const ordem = document.getElementById('filter-ordem').value;
    
    let produtos = Database.getProducts();
    
    // Filtrar por categoria
    if (categoria) {
        produtos = produtos.filter(p => p.categoria === categoria);
    }
    
    // Filtrar por estoque
    if (estoque) {
        const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
        
        if (estoque === 'baixo') {
            produtos = produtos.filter(p => p.estoque <= estoqueMinimo && p.estoque > 0);
        } else if (estoque === 'sem') {
            produtos = produtos.filter(p => p.estoque === 0);
        } else if (estoque === 'normal') {
            produtos = produtos.filter(p => p.estoque > estoqueMinimo);
        }
    }
    
    // Ordenar
    produtos.sort((a, b) => {
        switch(ordem) {
            case 'nome-desc':
                return b.nome.localeCompare(a.nome);
            case 'estoque':
                return a.estoque - b.estoque;
            case 'estoque-desc':
                return b.estoque - a.estoque;
            case 'custo':
                return (a.custo || 0) - (b.custo || 0);
            case 'custo-desc':
                return (b.custo || 0) - (a.custo || 0);
            default: // 'nome'
                return a.nome.localeCompare(b.nome);
        }
    });
    
    exibirProdutosCards(produtos);
    exibirProdutosTabela(produtos);
    
    showNotification(`${produtos.length} produto(s) encontrado(s)`, 'success');
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filter-categoria').value = '';
    document.getElementById('filter-estoque').value = '';
    document.getElementById('filter-ordem').value = 'nome';
    
    carregarProdutos();
    showNotification('Filtros limpos', 'info');
}

// Abrir modal de cadastro
function abrirModalCadastro(produtoId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    
    if (produtoId) {
        // Modo edição
        title.textContent = 'Editar Produto';
        preencherFormulario(produtoId);
    } else {
        // Modo cadastro
        title.textContent = 'Novo Produto';
        form.reset();
        gerarCodigoProduto();
        
        // Limpar campos específicos
        document.getElementById('product-suggested-price').value = '';
    }
    
    modal.style.display = 'flex';
}

// Preencher formulário para edição
function preencherFormulario(produtoId) {
    const produtos = Database.getProducts();
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) {
        showNotification('Produto não encontrado', 'error');
        return;
    }
    
    document.getElementById('product-name').value = produto.nome || '';
    document.getElementById('product-code').value = produto.codigo || '';
    document.getElementById('product-category').value = produto.categoria || '';
    document.getElementById('product-brand').value = produto.marca || '';
    document.getElementById('product-stock').value = produto.estoque || 0;
    document.getElementById('product-min-stock').value = produto.estoqueMinimo || 5;
    document.getElementById('product-cost').value = produto.custo || '';
    document.getElementById('product-suggested-price').value = produto.precoSugerido || '';
    document.getElementById('product-description').value = produto.descricao || '';
    document.getElementById('product-supplier').value = produto.fornecedor || '';
    
    // Salvar ID do produto para atualização
    form.dataset.editId = produtoId;
}

// Gerar código do produto
function gerarCodigoProduto() {
    const nome = document.getElementById('product-name').value;
    const categoria = document.getElementById('product-category').value;
    
    if (!nome.trim()) return;
    
    // Gerar código baseado nas iniciais
    const iniciais = nome.split(' ').map(p => p[0]).join('').toUpperCase();
    const catCode = categoria ? categoria.substring(0, 3).toUpperCase() : 'GEN';
    const timestamp = Date.now().toString().slice(-4);
    
    const codigo = `${catCode}-${iniciais}-${timestamp}`;
    document.getElementById('product-code').value = codigo;
}

// Salvar produto
function salvarProduto() {
    const form = document.getElementById('product-form');
    const isEdit = form.dataset.editId;
    
    const produto = {
        nome: document.getElementById('product-name').value,
        codigo: document.getElementById('product-code').value,
        categoria: document.getElementById('product-category').value,
        marca: document.getElementById('product-brand').value,
        estoque: parseInt(document.getElementById('product-stock').value) || 0,
        estoqueMinimo: parseInt(document.getElementById('product-min-stock').value) || 5,
        custo: parseFloat(document.getElementById('product-cost').value) || 0,
        precoSugerido: parseFloat(document.getElementById('product-suggested-price').value) || 0,
        descricao: document.getElementById('product-description').value,
        fornecedor: document.getElementById('product-supplier').value,
        createdAt: isEdit ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Validação básica
    if (!produto.nome || !produto.categoria || produto.custo <= 0) {
        showNotification('Preencha todos os campos obrigatórios (*)', 'error');
        return;
    }
    
    let resultado;
    
    if (isEdit) {
        // Atualizar produto existente
        resultado = Database.updateProduct(isEdit, produto);
        showNotification('Produto atualizado com sucesso!', 'success');
    } else {
        // Adicionar novo produto
        resultado = Database.addProduct(produto);
        showNotification('Produto cadastrado com sucesso!', 'success');
    }
    
    if (resultado) {
        fecharModal();
        carregarProdutos();
        
        // Salvar produto na session storage para uso no módulo de precificação
        sessionStorage.setItem('produtoSelecionado', JSON.stringify(resultado));
    }
}

// Fechar modal
function fecharModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    
    modal.style.display = 'none';
    form.reset();
    delete form.dataset.editId;
}

// Editar produto
function editarProduto(id) {
    abrirModalCadastro(id);
}

// Confirmar exclusão
function confirmarExclusao(id) {
    const modal = document.getElementById('confirm-modal');
    const message = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-action');
    
    message.textContent = 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.';
    
    confirmBtn.onclick = function() {
        excluirProduto(id);
    };
    
    modal.style.display = 'flex';
}

// Excluir produto
function excluirProduto(id) {
    const sucesso = Database.deleteProduct(id);
    
    if (sucesso) {
        showNotification('Produto excluído com sucesso!', 'success');
        carregarProdutos();
    } else {
        showNotification('Erro ao excluir produto', 'error');
    }
    
    fecharConfirmModal();
}

// Fechar modal de confirmação
function fecharConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// Ir para precificação
function irParaPrecificacao() {
    const nome = document.getElementById('product-name').value;
    const custo = document.getElementById('product-cost').value;
    
    if (!nome || !custo) {
        showNotification('Preencha pelo menos o nome e custo do produto', 'error');
        return;
    }
    
    // Salvar dados temporários
    const produtoTemp = {
        nome: nome,
        custo: parseFloat(custo),
        categoria: document.getElementById('product-category').value,
        estoque: parseInt(document.getElementById('product-stock').value) || 0
    };
    
    sessionStorage.setItem('produtoTemp', JSON.stringify(produtoTemp));
    
    // Redirecionar para precificação
    window.location.href = '../precificacao/index.html';
}

// Exportar produtos
function exportarProdutos() {
    const produtos = Database.getProducts();
    
    if (produtos.length === 0) {
        showNotification('Nenhum produto para exportar', 'warning');
        return;
    }
    
    // Criar CSV
    let csv = 'Código;Nome;Marca;Categoria;Estoque;Custo;Preço Sugerido;Fornecedor\n';
    
    produtos.forEach(produto => {
        csv += `${produto.codigo || ''};`;
        csv += `${produto.nome || ''};`;
        csv += `${produto.marca || ''};`;
        csv += `${getCategoriaInfo(produto.categoria).nome || ''};`;
        csv += `${produto.estoque || 0};`;
        csv += `${produto.custo ? produto.custo.toFixed(2) : '0,00'};`;
        csv += `${produto.precoSugerido ? produto.precoSugerido.toFixed(2) : '0,00'};`;
        csv += `${produto.fornecedor || ''}\n`;
    });
    
    // Criar blob e download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Exportação iniciada!', 'success');
}