// Variáveis globais
let produtos = [];
let movimentacoes = [];
let paginaAtual = 1;
const itensPorPagina = 10;

document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    configurarEventos();
});

// Carregar dados iniciais
function carregarDados() {
    produtos = Database.getProducts();
    movimentacoes = JSON.parse(localStorage.getItem('movimentacoesEstoque')) || [];
    
    atualizarEstatisticas();
    carregarTabelaEstoque();
    carregarHistorico();
    preencherSelectProdutos();
}

// Configurar eventos
function configurarEventos() {
    // Busca em tempo real
    document.getElementById('search-stock').addEventListener('input', function() {
        filtrarEstoque(this.value);
    });
    
    // Formulário de movimentação
    document.getElementById('movement-form').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarMovimentacao();
    });
    
    // Alterar tipo de movimentação
    document.getElementById('movement-product').addEventListener('change', function() {
        atualizarInfoEstoqueAtual();
    });
    
    // Alterar tipo de movimentação
    document.getElementById('movement-type').addEventListener('change', function() {
        atualizarMotivosMovimentacao();
    });
    
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    const totalItens = produtos.length;
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    
    const estoqueBaixo = produtos.filter(p => p.estoque <= estoqueMinimo && p.estoque > 0).length;
    const semEstoque = produtos.filter(p => p.estoque === 0).length;
    
    // Calcular valor total em estoque
    const valorEstoque = produtos.reduce((total, produto) => {
        const custo = produto.custo || 0;
        const estoque = produto.estoque || 0;
        return total + (custo * estoque);
    }, 0);
    
    document.getElementById('total-items').textContent = totalItens;
    document.getElementById('low-stock').textContent = estoqueBaixo;
    document.getElementById('out-of-stock').textContent = semEstoque;
    document.getElementById('stock-value').textContent = `R$ ${valorEstoque.toFixed(2)}`;
}

// Carregar tabela de estoque
function carregarTabelaEstoque(filtro = '') {
    const tbody = document.getElementById('stock-table-body');
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    
    // Filtrar produtos se necessário
    let produtosFiltrados = produtos;
    if (filtro) {
        const filtroLower = filtro.toLowerCase();
        produtosFiltrados = produtos.filter(p => 
            p.nome.toLowerCase().includes(filtroLower) ||
            (p.codigo && p.codigo.toLowerCase().includes(filtroLower)) ||
            (p.categoria && p.categoria.toLowerCase().includes(filtroLower))
        );
    }
    
    // Paginação
    const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const produtosPagina = produtosFiltrados.slice(inicio, fim);
    
    // Atualizar informações de página
    document.getElementById('page-info').textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (produtosPagina.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhum produto encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Preencher tabela
    produtosPagina.forEach(produto => {
        const tr = document.createElement('tr');
        
        // Determinar status do estoque
        let statusClass = 'status-normal';
        let statusText = 'Normal';
        
        if (produto.estoque === 0) {
            statusClass = 'status-out';
            statusText = 'Sem Estoque';
        } else if (produto.estoque <= estoqueMinimo) {
            statusClass = 'status-low';
            statusText = 'Baixo';
        }
        
        // Formatar data da última movimentação
        let ultimaMov = 'N/A';
        if (produto.ultimaMovimentacao) {
            const data = new Date(produto.ultimaMovimentacao);
            ultimaMov = data.toLocaleDateString('pt-BR');
        }
        
        tr.innerHTML = `
            <td>${produto.codigo || 'N/A'}</td>
            <td>
                <strong>${produto.nome}</strong><br>
                <small>${produto.marca || 'Sem marca'}</small>
            </td>
            <td>${formatarCategoria(produto.categoria)}</td>
            <td><strong>${produto.estoque}</strong></td>
            <td>${estoqueMinimo}</td>
            <td><span class="stock-status ${statusClass}">${statusText}</span></td>
            <td>${produto.localizacao || 'Principal'}</td>
            <td>${ultimaMov}</td>
            <td>
                <div class="stock-actions">
                    <button class="btn-stock-action btn-adjust" onclick="ajustarEstoque('${produto.id}')">
                        <i class="fas fa-adjust"></i> Ajustar
                    </button>
                    <button class="btn-stock-action btn-move" onclick="moverProduto('${produto.id}')">
                        <i class="fas fa-exchange-alt"></i> Mover
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Formatar categoria
function formatarCategoria(categoria) {
    const categorias = {
        'maquiagem': 'Maquiagem',
        'skincare': 'Skincare',
        'acessorios': 'Acessórios',
        'fragrancias': 'Fragrâncias',
        'cabelos': 'Cabelos'
    };
    
    return categorias[categoria] || categoria || 'Outros';
}

// Filtrar estoque
function filtrarEstoque(termo) {
    carregarTabelaEstoque(termo);
}

// Mudar página
function mudarPagina(direcao) {
    const totalProdutos = produtos.length;
    const totalPaginas = Math.ceil(totalProdutos / itensPorPagina);
    
    paginaAtual += direcao;
    
    if (paginaAtual < 1) paginaAtual = 1;
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    
    carregarTabelaEstoque();
}

// Abrir modal de movimentação
function abrirModalMovimentacao(tipo) {
    const modal = document.getElementById('movement-modal');
    const title = document.getElementById('movement-title');
    const form = document.getElementById('movement-form');
    const typeInput = document.getElementById('movement-type');
    
    // Definir título e tipo
    const titulos = {
        'entrada': 'Registrar Entrada',
        'saida': 'Registrar Saída',
        'ajuste': 'Ajustar Estoque',
        'transferencia': 'Transferir Produto'
    };
    
    title.textContent = titulos[tipo] || 'Movimentação';
    typeInput.value = tipo;
    
    // Resetar formulário
    form.reset();
    
    // Atualizar motivos
    atualizarMotivosMovimentacao();
    
    // Mostrar/ocultar campos baseado no tipo
    const locationGroup = document.getElementById('location-group');
    
    if (tipo === 'transferencia') {
        locationGroup.style.display = 'block';
    } else {
        locationGroup.style.display = 'none';
    }
    
    // Exibir modal
    modal.style.display = 'flex';
    
    // Preencher select de produtos
    preencherSelectProdutos();
}

// Preencher select de produtos
function preencherSelectProdutos() {
    const select = document.getElementById('movement-product');
    select.innerHTML = '<option value="">Selecione um produto...</option>';
    
    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} (Estoque: ${produto.estoque})`;
        select.appendChild(option);
    });
}

// Atualizar motivos de movimentação
function atualizarMotivosMovimentacao() {
    const tipo = document.getElementById('movement-type').value;
    const select = document.getElementById('movement-reason');
    
    let motivos = [];
    
    switch(tipo) {
        case 'entrada':
            motivos = [
                'Compra de fornecedor',
                'Devolução de cliente',
                'Transferência entre lojas',
                'Produção própria',
                'Amostra grátis',
                'Outro'
            ];
            break;
            
        case 'saida':
            motivos = [
                'Venda',
                'Devolução ao fornecedor',
                'Perda/Quebra',
                'Amostra para cliente',
                'Uso interno',
                'Outro'
            ];
            break;
            
        case 'ajuste':
            motivos = [
                'Contagem física divergente',
                'Correção de erro',
                'Validade vencida',
                'Danificado',
                'Outro'
            ];
            break;
            
        case 'transferencia':
            motivos = [
                'Reorganização do estoque',
                'Transferência para vitrine',
                'Preparação para feira',
                'Outro'
            ];
            break;
            
        default:
            motivos = ['Selecione um motivo...'];
    }
    
    select.innerHTML = '';
    motivos.forEach(motivo => {
        const option = document.createElement('option');
        option.value = motivo;
        option.textContent = motivo;
        select.appendChild(option);
    });
}

// Atualizar informações do estoque atual
function atualizarInfoEstoqueAtual() {
    const produtoId = document.getElementById('movement-product').value;
    const container = document.getElementById('current-stock-info');
    
    if (!produtoId) {
        container.innerHTML = '<p>Selecione um produto para ver o estoque atual</p>';
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    
    if (produto) {
        container.innerHTML = `
            <p><strong>Produto:</strong> ${produto.nome}</p>
            <p><strong>Estoque Atual:</strong> ${produto.estoque} unidades</p>
            <p><strong>Localização:</strong> ${produto.localizacao || 'Principal'}</p>
        `;
    }
}

// Registrar movimentação
function registrarMovimentacao() {
    const produtoId = document.getElementById('movement-product').value;
    const tipo = document.getElementById('movement-type').value;
    const quantidade = parseInt(document.getElementById('movement-quantity').value);
    const motivo = document.getElementById('movement-reason').value;
    const observacoes = document.getElementById('movement-notes').value;
    const localizacao = document.getElementById('movement-location').value;
    
    // Validações
    if (!produtoId || !quantidade || quantidade <= 0 || !motivo) {
        showNotification('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) {
        showNotification('Produto não encontrado', 'error');
        return;
    }
    
    // Verificar se há estoque suficiente para saída
    if (tipo === 'saida' && quantidade > produto.estoque) {
        showNotification('Quantidade indisponível em estoque', 'error');
        return;
    }
    
    // Calcular novo estoque
    let novoEstoque = produto.estoque;
    
    switch(tipo) {
        case 'entrada':
            novoEstoque += quantidade;
            break;
        case 'saida':
            novoEstoque -= quantidade;
            break;
        case 'ajuste':
            novoEstoque = quantidade;
            break;
        case 'transferencia':
            // Para transferência, não altera quantidade, apenas localização
            break;
    }
    
    // Criar registro de movimentação
    const movimentacao = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        produtoId: produtoId,
        produtoNome: produto.nome,
        tipo: tipo,
        quantidade: quantidade,
        saldoAnterior: produto.estoque,
        saldoAtual: tipo === 'transferencia' ? produto.estoque : novoEstoque,
        motivo: motivo,
        observacoes: observacoes,
        localizacao: localizacao,
        responsavel: 'Administrador'
    };
    
    // Adicionar ao histórico
    movimentacoes.unshift(movimentacao);
    localStorage.setItem('movimentacoesEstoque', JSON.stringify(movimentacoes));
    
    // Atualizar produto
    const atualizacoes = {
        estoque: tipo === 'transferencia' ? produto.estoque : novoEstoque,
        ultimaMovimentacao: new Date().toISOString()
    };
    
    if (tipo === 'transferencia') {
        atualizacoes.localizacao = localizacao;
    }
    
    Database.updateProduct(produtoId, atualizacoes);
    
    // Atualizar dados locais
    carregarDados();
    
    // Fechar modal e mostrar notificação
    fecharMovementModal();
    showNotification('Movimentação registrada com sucesso!', 'success');
}

// Fechar modal de movimentação
function fecharMovementModal() {
    document.getElementById('movement-modal').style.display = 'none';
    document.getElementById('movement-form').reset();
}

// Ajustar estoque
function ajustarEstoque(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (produto) {
        abrirModalMovimentacao('ajuste');
        document.getElementById('movement-product').value = produtoId;
        document.getElementById('movement-quantity').value = produto.estoque;
        atualizarInfoEstoqueAtual();
    }
}

// Mover produto
function moverProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (produto) {
        abrirModalMovimentacao('transferencia');
        document.getElementById('movement-product').value = produtoId;
        document.getElementById('movement-location').value = produto.localizacao || 'prateleira_a';
        atualizarInfoEstoqueAtual();
    }
}

// Carregar histórico de movimentações
function carregarHistorico(filtros = {}) {
    const tbody = document.getElementById('movements-table-body');
    
    // Aplicar filtros
    let historicoFiltrado = [...movimentacoes];
    
    if (filtros.tipo) {
        historicoFiltrado = historicoFiltrado.filter(m => m.tipo === filtros.tipo);
    }
    
    if (filtros.dataInicio && filtros.dataFim) {
        historicoFiltrado = historicoFiltrado.filter(m => {
            const dataMov = new Date(m.data);
            const inicio = new Date(filtros.dataInicio);
            const fim = new Date(filtros.dataFim);
            fim.setHours(23, 59, 59);
            
            return dataMov >= inicio && dataMov <= fim;
        });
    }
    
    // Limitar a 50 registros
    historicoFiltrado = historicoFiltrado.slice(0, 50);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (historicoFiltrado.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-history" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    <p>Nenhuma movimentação registrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Preencher tabela
    historicoFiltrado.forEach(mov => {
        const tr = document.createElement('tr');
        const data = new Date(mov.data);
        
        // Determinar classe do tipo
        let tipoClass = '';
        let tipoTexto = '';
        
        switch(mov.tipo) {
            case 'entrada':
                tipoClass = 'type-entrada';
                tipoTexto = 'Entrada';
                break;
            case 'saida':
                tipoClass = 'type-saida';
                tipoTexto = 'Saída';
                break;
            case 'ajuste':
                tipoClass = 'type-ajuste';
                tipoTexto = 'Ajuste';
                break;
            case 'venda':
                tipoClass = 'type-venda';
                tipoTexto = 'Venda';
                break;
            default:
                tipoClass = '';
                tipoTexto = mov.tipo;
        }
        
        tr.innerHTML = `
            <td>${data.toLocaleDateString('pt-BR')}<br><small>${data.toLocaleTimeString('pt-BR')}</small></td>
            <td><span class="movement-type ${tipoClass}">${tipoTexto}</span></td>
            <td>${mov.produtoNome}</td>
            <td>${mov.quantidade}</td>
            <td>${mov.saldoAnterior}</td>
            <td><strong>${mov.saldoAtual}</strong></td>
            <td>${mov.responsavel}</td>
            <td>${mov.motivo}<br><small>${mov.observacoes || ''}</small></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Filtrar histórico
function filtrarHistorico() {
    const tipo = document.getElementById('filter-type').value;
    const dataInicio = document.getElementById('filter-date-start').value;
    const dataFim = document.getElementById('filter-date-end').value;
    
    carregarHistorico({
        tipo: tipo,
        dataInicio: dataInicio,
        dataFim: dataFim
    });
}

// Iniciar contagem de estoque
function iniciarContagem() {
    const modal = document.getElementById('inventory-modal');
    const lista = document.getElementById('inventory-list');
    
    // Limpar lista
    lista.innerHTML = '';
    
    // Adicionar produtos à lista de contagem
    produtos.forEach((produto, index) => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.innerHTML = `
            <div class="inventory-item-info">
                <h4>${produto.nome}</h4>
                <p>Código: ${produto.codigo || 'N/A'} | Estoque atual: ${produto.estoque}</p>
            </div>
            <div class="inventory-input">
                <input type="number" id="inventory-count-${produto.id}" 
                       min="0" value="${produto.estoque}" 
                       data-estoque-atual="${produto.estoque}"
                       onchange="atualizarStatusContagem()">
                <span>unidades</span>
            </div>
        `;
        lista.appendChild(div);
    });
    
    // Resetar status
    document.getElementById('counted-items').textContent = '0';
    document.getElementById('differences-count').textContent = '0';
    document.getElementById('inventory-status').textContent = 'Em andamento';
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// Atualizar status da contagem
function atualizarStatusContagem() {
    let contados = 0;
    let diferencas = 0;
    
    produtos.forEach(produto => {
        const input = document.getElementById(`inventory-count-${produto.id}`);
        if (input) {
            const valor = parseInt(input.value);
            const estoqueAtual = parseInt(input.dataset.estoqueAtual);
            
            if (!isNaN(valor)) {
                contados++;
                if (valor !== estoqueAtual) {
                    diferencas++;
                }
            }
        }
    });
    
    document.getElementById('counted-items').textContent = contados;
    document.getElementById('differences-count').textContent = diferencas;
    
    if (contados === produtos.length) {
        document.getElementById('inventory-status').textContent = 'Completo';
    }
}

// Cancelar contagem
function cancelarContagem() {
    document.getElementById('inventory-modal').style.display = 'none';
    showNotification('Contagem cancelada', 'info');
}

// Finalizar contagem
function finalizarContagem() {
    const ajustes = [];
    
    produtos.forEach(produto => {
        const input = document.getElementById(`inventory-count-${produto.id}`);
        if (input) {
            const contagem = parseInt(input.value);
            const estoqueAtual = parseInt(input.dataset.estoqueAtual);
            
            if (!isNaN(contagem) && contagem !== estoqueAtual) {
                ajustes.push({
                    produtoId: produto.id,
                    produtoNome: produto.nome,
                    estoqueAtual: estoqueAtual,
                    contagemFisica: contagem,
                    diferenca: contagem - estoqueAtual
                });
                
                // Atualizar produto
                Database.updateProduct(produto.id, {
                    estoque: contagem,
                    ultimaMovimentacao: new Date().toISOString()
                });
                
                // Registrar movimentação de ajuste
                const movimentacao = {
                    id: Date.now().toString() + produto.id,
                    data: new Date().toISOString(),
                    produtoId: produto.id,
                    produtoNome: produto.nome,
                    tipo: 'ajuste',
                    quantidade: contagem,
                    saldoAnterior: estoqueAtual,
                    saldoAtual: contagem,
                    motivo: 'Contagem física',
                    observacoes: `Contagem: ${contagem} | Sistema: ${estoqueAtual}`,
                    responsavel: 'Administrador'
                };
                
                movimentacoes.unshift(movimentacao);
            }
        }
    });
    
    // Salvar histórico
    localStorage.setItem('movimentacoesEstoque', JSON.stringify(movimentacoes));
    
    // Atualizar dados
    carregarDados();
    
    // Fechar modal
    document.getElementById('inventory-modal').style.display = 'none';
    
    // Mostrar resumo
    if (ajustes.length > 0) {
        showNotification(`${ajustes.length} produto(s) ajustado(s) na contagem`, 'success');
        
        // Opcional: Mostrar detalhes dos ajustes
        console.log('Ajustes realizados:', ajustes);
    } else {
        showNotification('Contagem realizada - Nenhuma diferença encontrada', 'info');
    }
}

// Gerar relatório de estoque
function gerarRelatorioEstoque() {
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    
    // Criar conteúdo do relatório
    let conteudo = `
        RELATÓRIO DE ESTOQUE - BeautyStore
        Data: ${new Date().toLocaleDateString('pt-BR')}
        Hora: ${new Date().toLocaleTimeString('pt-BR')}
        ============================================
        
        RESUMO:
        Total de Produtos: ${produtos.length}
        Estoque Baixo: ${produtos.filter(p => p.estoque <= estoqueMinimo && p.estoque > 0).length}
        Sem Estoque: ${produtos.filter(p => p.estoque === 0).length}
        
        ============================================
        
        PRODUTOS EM ESTOQUE:
        
    `;
    
    // Adicionar produtos
    produtos.forEach((produto, index) => {
        let status = 'Normal';
        if (produto.estoque === 0) status = 'SEM ESTOQUE';
        else if (produto.estoque <= estoqueMinimo) status = 'BAIXO';
        
        conteudo += `
        ${index + 1}. ${produto.nome}
           Código: ${produto.codigo || 'N/A'}
           Categoria: ${formatarCategoria(produto.categoria)}
           Estoque: ${produto.estoque} (Mín: ${estoqueMinimo})
           Status: ${status}
           Custo: R$ ${produto.custo ? produto.custo.toFixed(2) : '0,00'}
           Localização: ${produto.localizacao || 'Principal'}
           --------------------------------------------
        `;
    });
    
    // Calcular valor total
    const valorTotal = produtos.reduce((total, p) => total + (p.custo || 0) * (p.estoque || 0), 0);
    conteudo += `
        ============================================
        VALOR TOTAL EM ESTOQUE: R$ ${valorTotal.toFixed(2)}
    `;
    
    // Criar blob e download
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_estoque_${new Date().toISOString().slice(0,10)}.txt`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Relatório gerado com sucesso!', 'success');
}

// Imprimir estoque
function imprimirEstoque() {
    window.print();
}

// Recarregar estoque
function carregarEstoque() {
    carregarDados();
    showNotification('Estoque atualizado!', 'success');
}