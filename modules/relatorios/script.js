// Variáveis globais
let produtos = [];
let vendas = [];
let movimentacoes = [];
let periodoSelecionado = 30; // dias
let chartInstances = {};

document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    configurarEventos();
    carregarRelatorios();
});

// Carregar dados
function carregarDados() {
    produtos = Database.getProducts();
    vendas = Database.getSales();
    movimentacoes = JSON.parse(localStorage.getItem('movimentacoesEstoque')) || [];
    
    // Carregar preferências do usuário
    const periodoSalvo = localStorage.getItem('relatorioPeriodo');
    if (periodoSalvo) {
        periodoSelecionado = parseInt(periodoSalvo);
        document.getElementById('report-period').value = periodoSalvo;
    }
}

// Configurar eventos
function configurarEventos() {
    // Alterar período
    document.getElementById('report-period').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('custom-period').style.display = 'flex';
        } else {
            document.getElementById('custom-period').style.display = 'none';
        }
    });
    
    // Alternar entre abas
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remover classe active de todos
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
            
            // Adicionar classe active ao selecionado
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Atualizar gráficos específicos da aba
            setTimeout(() => {
                if (tabId === 'products-report') {
                    atualizarGraficoProdutos();
                } else if (tabId === 'financial-report') {
                    atualizarGraficoCustos();
                    atualizarGraficoLucro();
                }
            }, 100);
        });
    });
    
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Toggles de relatórios automatizados
    document.getElementById('daily-report-toggle').addEventListener('change', salvarPreferenciasRelatorios);
    document.getElementById('weekly-report-toggle').addEventListener('change', salvarPreferenciasRelatorios);
    document.getElementById('stock-alert-toggle').addEventListener('change', salvarPreferenciasRelatorios);
    
    // Carregar preferências salvas
    carregarPreferenciasRelatorios();
}

// Aplicar filtro de período
function aplicarFiltroPeriodo() {
    const periodo = document.getElementById('report-period').value;
    
    if (periodo === 'custom') {
        const inicio = document.getElementById('start-date').value;
        const fim = document.getElementById('end-date').value;
        
        if (!inicio || !fim) {
            showNotification('Selecione as datas personalizadas', 'error');
            return;
        }
        
        periodoSelecionado = { inicio, fim };
    } else {
        periodoSelecionado = parseInt(periodo);
    }
    
    // Salvar preferência
    localStorage.setItem('relatorioPeriodo', periodo);
    
    // Atualizar todos os relatórios
    carregarRelatorios();
    
    showNotification('Período aplicado aos relatórios', 'success');
}

// Carregar preferências de relatórios
function carregarPreferenciasRelatorios() {
    const preferencias = JSON.parse(localStorage.getItem('preferenciasRelatorios')) || {
        daily: false,
        weekly: false,
        stockAlerts: true
    };
    
    document.getElementById('daily-report-toggle').checked = preferencias.daily;
    document.getElementById('weekly-report-toggle').checked = preferencias.weekly;
    document.getElementById('stock-alert-toggle').checked = preferencias.stockAlerts;
}

// Salvar preferências de relatórios
function salvarPreferenciasRelatorios() {
    const preferencias = {
        daily: document.getElementById('daily-report-toggle').checked,
        weekly: document.getElementById('weekly-report-toggle').checked,
        stockAlerts: document.getElementById('stock-alert-toggle').checked
    };
    
    localStorage.setItem('preferenciasRelatorios', JSON.stringify(preferencias));
    
    showNotification('Preferências salvas', 'success');
}

// Carregar relatórios
function carregarRelatorios() {
    // Calcular data de início baseada no período selecionado
    const dataFim = new Date();
    let dataInicio = new Date();
    
    if (typeof periodoSelecionado === 'number') {
        dataInicio.setDate(dataInicio.getDate() - periodoSelecionado);
    } else {
        dataInicio = new Date(periodoSelecionado.inicio);
        dataFim = new Date(periodoSelecionado.fim);
    }
    
    // Filtrar vendas do período
    const vendasPeriodo = vendas.filter(v => {
        const dataVenda = new Date(v.data);
        return dataVenda >= dataInicio && dataVenda <= dataFim && v.status === 'concluida';
    });
    
    // Atualizar KPIs
    atualizarKPIs(vendasPeriodo);
    
    // Atualizar gráficos
    atualizarGraficoFaturamento(vendasPeriodo);
    atualizarGraficoCategorias(vendasPeriodo);
    
    // Atualizar relatórios detalhados
    atualizarRelatorioVendas(vendasPeriodo);
    atualizarRelatorioProdutos(vendasPeriodo);
    atualizarRelatorioEstoque();
    atualizarRelatorioFinanceiro(vendasPeriodo);
    
    // Atualizar informações de período
    atualizarInfoPeriodo(dataInicio, dataFim);
}

// Atualizar informações de período
function atualizarInfoPeriodo(inicio, fim) {
    const formatarData = (data) => data.toLocaleDateString('pt-BR');
    const periodoTexto = `${formatarData(inicio)} a ${formatarData(fim)}`;
    
    document.querySelectorAll('.kpi-period').forEach(el => {
        el.textContent = periodoTexto;
    });
}

// Atualizar KPIs
function atualizarKPIs(vendasPeriodo) {
    // Faturamento
    const faturamento = vendasPeriodo.reduce((total, v) => total + v.valorTotal, 0);
    document.getElementById('kpi-revenue').textContent = `R$ ${faturamento.toFixed(2)}`;
    
    // Quantidade de vendas
    document.getElementById('kpi-sales').textContent = vendasPeriodo.length;
    
    // Produtos vendidos
    const produtosVendidos = vendasPeriodo.reduce((total, v) => {
        return total + v.produtos.reduce((sum, p) => sum + p.quantidade, 0);
    }, 0);
    document.getElementById('kpi-products-sold').textContent = produtosVendidos;
    
    // Ticket médio
    const ticketMedio = vendasPeriodo.length > 0 ? faturamento / vendasPeriodo.length : 0;
    document.getElementById('kpi-avg-ticket').textContent = `R$ ${ticketMedio.toFixed(2)}`;
    
    // Calcular tendências (simplificado)
    calcularTendencias(faturamento, vendasPeriodo.length, produtosVendidos, ticketMedio);
}

// Calcular tendências (simulado)
function calcularTendencias(faturamentoAtual, vendasAtual, produtosAtual, ticketAtual) {
    // Aqui você implementaria a lógica para comparar com período anterior
    // Por enquanto, vamos usar valores simulados
    
    const elementosTrend = document.querySelectorAll('.kpi-trend');
    elementosTrend.forEach((el, index) => {
        if (index === 3) { // Ticket médio
            el.textContent = '-2.1%';
            el.className = 'kpi-trend negative';
        } else {
            el.textContent = index === 0 ? '+12.5%' : index === 1 ? '+8.2%' : '+15.3%';
            el.className = 'kpi-trend positive';
        }
    });
}

// Atualizar gráfico de faturamento
function atualizarGraficoFaturamento(vendasPeriodo) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (chartInstances.revenue) {
        chartInstances.revenue.destroy();
    }
    
    // Agrupar vendas por dia
    const vendasPorDia = {};
    vendasPeriodo.forEach(venda => {
        const data = new Date(venda.data).toLocaleDateString('pt-BR');
        if (!vendasPorDia[data]) {
            vendasPorDia[data] = 0;
        }
        vendasPorDia[data] += venda.valorTotal;
    });
    
    // Preparar dados
    const labels = Object.keys(vendasPorDia).sort();
    const data = labels.map(data => vendasPorDia[data]);
    
    // Criar gráfico
    chartInstances.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento (R$)',
                data: data,
                borderColor: '#9c27b0',
                backgroundColor: 'rgba(156, 39, 176, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Atualizar gráfico de categorias
function atualizarGraficoCategorias(vendasPeriodo) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (chartInstances.category) {
        chartInstances.category.destroy();
    }
    
    // Agrupar vendas por categoria
    const vendasPorCategoria = {};
    const coresCategorias = {
        'maquiagem': '#e91e63',
        'skincare': '#009688',
        'acessorios': '#9c27b0',
        'fragrancias': '#ff9800',
        'cabelos': '#3f51b5',
        'outros': '#795548'
    };
    
    vendasPeriodo.forEach(venda => {
        venda.produtos.forEach(produto => {
            const categoria = produto.categoria || 'outros';
            if (!vendasPorCategoria[categoria]) {
                vendasPorCategoria[categoria] = 0;
            }
            vendasPorCategoria[categoria] += produto.subtotal;
        });
    });
    
    // Preparar dados
    const categorias = Object.keys(vendasPorCategoria);
    const valores = categorias.map(cat => vendasPorCategoria[cat]);
    const cores = categorias.map(cat => coresCategorias[cat] || '#795548');
    
    // Nomes amigáveis para categorias
    const nomesCategorias = {
        'maquiagem': 'Maquiagem',
        'skincare': 'Skincare',
        'acessorios': 'Acessórios',
        'fragrancias': 'Fragrâncias',
        'cabelos': 'Cabelos',
        'outros': 'Outros'
    };
    
    const labels = categorias.map(cat => nomesCategorias[cat] || cat);
    
    chartInstances.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Atualizar relatório de vendas
function atualizarRelatorioVendas(vendasPeriodo) {
    const tbody = document.getElementById('sales-report-body');
    const analysisDiv = document.getElementById('sales-trend-analysis');
    
    if (!tbody || !analysisDiv) return;
    
    // Agrupar por dia para o relatório
    const vendasPorDia = {};
    const produtosPorDia = {};
    
    vendasPeriodo.forEach(venda => {
        const data = new Date(venda.data).toLocaleDateString('pt-BR');
        
        if (!vendasPorDia[data]) {
            vendasPorDia[data] = 0;
            produtosPorDia[data] = 0;
        }
        
        vendasPorDia[data] += venda.valorTotal;
        produtosPorDia[data] += venda.produtos.reduce((sum, p) => sum + p.quantidade, 0);
    });
    
    // Ordenar datas
    const datas = Object.keys(vendasPorDia).sort();
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Preencher tabela
    datas.forEach(data => {
        const vendasDia = Object.values(vendasPorDia).filter((_, i) => datas[i] === data)[0];
        const produtosDia = Object.values(produtosPorDia).filter((_, i) => datas[i] === data)[0];
        const numeroVendas = vendasPeriodo.filter(v => 
            new Date(v.data).toLocaleDateString('pt-BR') === data
        ).length;
        
        const ticketMedio = numeroVendas > 0 ? vendasDia / numeroVendas : 0;
        
        // Calcular margem média (simplificado)
        const margemMedia = calcularMargemMedia(data);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${data}</td>
            <td>${numeroVendas}</td>
            <td>R$ ${vendasDia.toFixed(2)}</td>
            <td>R$ ${ticketMedio.toFixed(2)}</td>
            <td>${produtosDia}</td>
            <td>${margemMedia}%</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Atualizar análise de tendência
    atualizarAnaliseTendencia(vendasPorDia, analysisDiv);
}

// Calcular margem média (simplificado)
function calcularMargemMedia(data) {
    // Esta é uma implementação simplificada
    // Em um sistema real, você calcularia baseado no custo dos produtos
    return (Math.random() * 20 + 30).toFixed(1); // Retorna entre 30% e 50%
}

// Atualizar análise de tendência
function atualizarAnaliseTendencia(vendasPorDia, container) {
    const datas = Object.keys(vendasPorDia).sort();
    const valores = datas.map(data => vendasPorDia[data]);
    
    if (valores.length < 2) {
        container.innerHTML = '<p>Dados insuficientes para análise de tendência</p>';
        return;
    }
    
    // Calcular média
    const media = valores.reduce((a, b) => a + b, 0) / valores.length;
    
    // Calcular crescimento (último vs primeiro)
    const crescimento = valores[valores.length - 1] - valores[0];
    const percentualCrescimento = valores[0] > 0 ? (crescimento / valores[0]) * 100 : 0;
    
    // Encontrar melhor e pior dia
    const melhorValor = Math.max(...valores);
    const melhorDia = datas[valores.indexOf(melhorValor)];
    const piorValor = Math.min(...valores);
    const piorDia = datas[valores.indexOf(piorValor)];
    
    container.innerHTML = `
        <div class="trend-item">
            <h5>📈 Crescimento no Período</h5>
            <p>${percentualCrescimento >= 0 ? '+' : ''}${percentualCrescimento.toFixed(1)}%</p>
        </div>
        <div class="trend-item">
            <h5>💰 Faturamento Médio Diário</h5>
            <p>R$ ${media.toFixed(2)}</p>
        </div>
        <div class="trend-item">
            <h5>⭐ Melhor Dia</h5>
            <p>${melhorDia}: R$ ${melhorValor.toFixed(2)}</p>
        </div>
        <div class="trend-item">
            <h5>📉 Pior Dia</h5>
            <p>${piorDia}: R$ ${piorValor.toFixed(2)}</p>
        </div>
    `;
}

// Atualizar relatório de produtos
function atualizarRelatorioProdutos(vendasPeriodo) {
    const container = document.getElementById('top-products-list');
    if (!container) return;
    
    // Agrupar produtos vendidos
    const produtosVendidos = {};
    
    vendasPeriodo.forEach(venda => {
        venda.produtos.forEach(item => {
            if (!produtosVendidos[item.produtoId]) {
                produtosVendidos[item.produtoId] = {
                    nome: item.nome,
                    quantidade: 0,
                    faturamento: 0,
                    categoria: item.categoria
                };
            }
            
            produtosVendidos[item.produtoId].quantidade += item.quantidade;
            produtosVendidos[item.produtoId].faturamento += item.subtotal;
        });
    });
    
    // Converter para array e ordenar por quantidade
    const produtosArray = Object.values(produtosVendidos);
    produtosArray.sort((a, b) => b.quantidade - a.quantidade);
    
    // Pegar top 10
    const topProdutos = produtosArray.slice(0, 10);
    
    // Limpar container
    container.innerHTML = '';
    
    // Preencher lista
    topProdutos.forEach((produto, index) => {
        const div = document.createElement('div');
        div.className = 'product-rank-item';
        
        div.innerHTML = `
            <div class="rank-number top-${index + 1}">${index + 1}</div>
            <div class="product-rank-info">
                <h4>${produto.nome}</h4>
                <p>${formatarCategoria(produto.categoria)}</p>
            </div>
            <div class="product-rank-stats">
                <span class="quantity">${produto.quantidade} un</span>
                <span class="revenue">R$ ${produto.faturamento.toFixed(2)}</span>
            </div>
        `;
        
        container.appendChild(div);
    });
    
    // Atualizar gráfico de produtos
    atualizarGraficoProdutos(topProdutos);
}

// Atualizar gráfico de produtos
function atualizarGraficoProdutos(topProdutos) {
    const ctx = document.getElementById('products-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (chartInstances.products) {
        chartInstances.products.destroy();
    }
    
    // Preparar dados
    const labels = topProdutos.map(p => p.nome.substring(0, 20) + (p.nome.length > 20 ? '...' : ''));
    const quantidades = topProdutos.map(p => p.quantidade);
    const faturamentos = topProdutos.map(p => p.faturamento);
    
    // Cores para o gráfico
    const cores = [
        '#ff9800', '#9c27b0', '#2196f3', '#4caf50', 
        '#e91e63', '#009688', '#3f51b5', '#795548',
        '#ff5722', '#607d8b'
    ];
    
    chartInstances.products = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade Vendida',
                    data: quantidades,
                    backgroundColor: cores,
                    borderColor: cores.map(cor => cor.replace('0.8', '1')),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Faturamento (R$)',
                    data: faturamentos,
                    backgroundColor: 'rgba(156, 39, 176, 0.2)',
                    borderColor: '#9c27b0',
                    borderWidth: 2,
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Faturamento (R$)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Quantidade: ${context.raw}`;
                            } else {
                                return `Faturamento: R$ ${context.raw.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        }
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

// Atualizar relatório de estoque
function atualizarRelatorioEstoque() {
    // Valor total em estoque
    const valorEstoque = produtos.reduce((total, produto) => {
        const custo = produto.custo || 0;
        const estoque = produto.estoque || 0;
        return total + (custo * estoque);
    }, 0);
    
    // Estoque baixo
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    const estoqueBaixo = produtos.filter(p => p.estoque <= estoqueMinimo && p.estoque > 0).length;
    const semEstoque = produtos.filter(p => p.estoque === 0).length;
    
    // Giro de estoque (simplificado)
    const giroEstoque = calcularGiroEstoque();
    
    // Atualizar métricas
    document.getElementById('stock-value').textContent = `R$ ${valorEstoque.toFixed(2)}`;
    document.getElementById('low-stock-count').textContent = estoqueBaixo;
    document.getElementById('out-of-stock-count').textContent = semEstoque;
    document.getElementById('stock-turnover').textContent = giroEstoque.toFixed(1);
    
    // Atualizar tabela de reposição
    atualizarTabelaReposicao();
}

// Calcular giro de estoque (simplificado)
function calcularGiroEstoque() {
    // Em um sistema real, isso seria calculado com base nas vendas
    // Aqui usamos um valor simulado
    const ultimos30Dias = new Date();
    ultimos30Dias.setDate(ultimos30Dias.getDate() - 30);
    
    const vendas30Dias = vendas.filter(v => 
        new Date(v.data) >= ultimos30Dias && v.status === 'concluida'
    ).length;
    
    // Giro = Vendas / Valor Médio em Estoque
    const valorMedioEstoque = produtos.reduce((total, p) => total + (p.custo || 0) * (p.estoque || 0), 0) / 2;
    
    if (valorMedioEstoque > 0) {
        return vendas30Dias / valorMedioEstoque;
    }
    
    return 0;
}

// Atualizar tabela de reposição
function atualizarTabelaReposicao() {
    const tbody = document.getElementById('reorder-table-body');
    if (!tbody) return;
    
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    
    // Produtos que precisam de reposição
    const produtosReposicao = produtos
        .filter(p => p.estoque <= estoqueMinimo)
        .sort((a, b) => a.estoque - b.estoque);
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    if (produtosReposicao.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #666;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px; display: block; color: #4caf50;"></i>
                    <p>Nenhum produto precisa de reposição no momento</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Preencher tabela
    produtosReposicao.forEach(produto => {
        // Calcular vendas dos últimos 30 dias
        const ultimos30Dias = new Date();
        ultimos30Dias.setDate(ultimos30Dias.getDate() - 30);
        
        const vendasProduto = vendas.reduce((total, venda) => {
            if (new Date(venda.data) >= ultimos30Dias && venda.status === 'concluida') {
                const itemVenda = venda.produtos.find(p => p.produtoId === produto.id);
                if (itemVenda) {
                    return total + itemVenda.quantidade;
                }
            }
            return total;
        }, 0);
        
        // Calcular dias restantes (estimativa)
        const consumoDiario = vendasProduto / 30;
        const diasRestantes = consumoDiario > 0 ? Math.floor(produto.estoque / consumoDiario) : 0;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${produto.nome}</strong><br>
                <small>${produto.codigo || 'Sem código'}</small>
            </td>
            <td><span class="${produto.estoque === 0 ? 'status-out' : 'status-low'}">${produto.estoque}</span></td>
            <td>${estoqueMinimo}</td>
            <td>${vendasProduto}</td>
            <td>${diasRestantes} dias</td>
            <td>
                <button class="stock-action" onclick="reporEstoque('${produto.id}')">
                    <i class="fas fa-sync-alt"></i> Repor
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Repor estoque
function reporEstoque(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
        // Redirecionar para o módulo de estoque com o produto selecionado
        sessionStorage.setItem('produtoParaReposicao', produtoId);
        window.location.href = '../estoque/index.html';
    }
}

// Atualizar relatório financeiro
function atualizarRelatorioFinanceiro(vendasPeriodo) {
    // Receitas
    const receitasVendas = vendasPeriodo.reduce((total, v) => total + v.valorTotal, 0);
    const totalReceitas = receitasVendas; // Somente vendas por enquanto
    
    // Custos (simplificado - custo das mercadorias vendidas)
    const custosMercadorias = calcularCustoMercadorias(vendasPeriodo);
    const totalCustos = custosMercadorias;
    
    // Lucro
    const lucroLiquido = totalReceitas - totalCustos;
    const margemLucro = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;
    
    // ROI (simplificado)
    const investimentoTotal = calcularInvestimentoTotal();
    const roi = investimentoTotal > 0 ? (lucroLiquido / investimentoTotal) * 100 : 0;
    
    // Atualizar métricas
    document.getElementById('total-revenue').textContent = `R$ ${totalReceitas.toFixed(2)}`;
    document.getElementById('sales-revenue').textContent = `R$ ${receitasVendas.toFixed(2)}`;
    document.getElementById('total-costs').textContent = `R$ ${totalCustos.toFixed(2)}`;
    document.getElementById('product-costs').textContent = `R$ ${custosMercadorias.toFixed(2)}`;
    document.getElementById('net-profit').textContent = `R$ ${lucroLiquido.toFixed(2)}`;
    document.getElementById('profit-margin').textContent = `${margemLucro.toFixed(1)}%`;
    document.getElementById('roi-percentage').textContent = `${roi.toFixed(1)}%`;
    
    // Atualizar gráficos
    atualizarGraficoCustos(custosMercadorias);
    atualizarGraficoLucro(vendasPeriodo);
}

// Calcular custo das mercadorias vendidas
function calcularCustoMercadorias(vendasPeriodo) {
    let custoTotal = 0;
    
    vendasPeriodo.forEach(venda => {
        venda.produtos.forEach(item => {
            const produto = produtos.find(p => p.id === item.produtoId);
            if (produto && produto.custo) {
                custoTotal += produto.custo * item.quantidade;
            }
        });
    });
    
    return custoTotal;
}

// Calcular investimento total (simplificado)
function calcularInvestimentoTotal() {
    // Soma do custo de todo o estoque atual
    return produtos.reduce((total, produto) => {
        return total + ((produto.custo || 0) * (produto.estoque || 0));
    }, 0);
}

// Atualizar gráfico de custos
function atualizarGraficoCustos(custoMercadorias) {
    const ctx = document.getElementById('costs-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (chartInstances.costs) {
        chartInstances.costs.destroy();
    }
    
    // Para simplificar, vamos considerar apenas o custo das mercadorias
    // Em um sistema real, você teria outros custos (operacionais, etc.)
    const outrosCustos = custoMercadorias * 0.3; // 30% para outros custos
    
    chartInstances.costs = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Custo das Mercadorias', 'Outros Custos'],
            datasets: [{
                data: [custoMercadorias, outrosCustos],
                backgroundColor: ['#f44336', '#ff9800'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Atualizar gráfico de lucro
function atualizarGraficoLucro(vendasPeriodo) {
    const ctx = document.getElementById('profit-chart');
    if (!ctx) return;
    
    // Destruir gráfico existente
    if (chartInstances.profit) {
        chartInstances.profit.destroy();
    }
    
    // Agrupar lucro por semana (simplificado)
    const lucroPorSemana = {};
    
    vendasPeriodo.forEach(venda => {
        const data = new Date(venda.data);
        const semana = `Semana ${Math.ceil(data.getDate() / 7)}`;
        
        if (!lucroPorSemana[semana]) {
            lucroPorSemana[semana] = {
                receita: 0,
                custo: 0,
                lucro: 0
            };
        }
        
        lucroPorSemana[semana].receita += venda.valorTotal;
        
        // Calcular custo desta venda
        const custoVenda = venda.produtos.reduce((total, item) => {
            const produto = produtos.find(p => p.id === item.produtoId);
            return total + ((produto?.custo || 0) * item.quantidade);
        }, 0);
        
        lucroPorSemana[semana].custo += custoVenda;
        lucroPorSemana[semana].lucro = lucroPorSemana[semana].receita - lucroPorSemana[semana].custo;
    });
    
    const semanas = Object.keys(lucroPorSemana).sort();
    const receitas = semanas.map(sem => lucroPorSemana[sem].receita);
    const custos = semanas.map(sem => lucroPorSemana[sem].custo);
    const lucros = semanas.map(sem => lucroPorSemana[sem].lucro);
    
    chartInstances.profit = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: semanas,
            datasets: [
                {
                    label: 'Receita',
                    data: receitas,
                    backgroundColor: 'rgba(76, 175, 80, 0.6)',
                    borderColor: '#4caf50',
                    borderWidth: 1
                },
                {
                    label: 'Custo',
                    data: custos,
                    backgroundColor: 'rgba(244, 67, 54, 0.6)',
                    borderColor: '#f44336',
                    borderWidth: 1
                },
                {
                    label: 'Lucro',
                    data: lucros,
                    backgroundColor: 'rgba(33, 150, 243, 0.6)',
                    borderColor: '#2196f3',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Exportar relatório de vendas
function exportarRelatorioVendas() {
    const tbody = document.getElementById('sales-report-body');
    const linhas = tbody.querySelectorAll('tr');
    
    if (linhas.length === 0) {
        showNotification('Nenhum dado para exportar', 'warning');
        return;
    }
    
    let csv = 'Data;Vendas;Faturamento;Ticket Médio;Produtos Vendidos;Margem Média\n';
    
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        const linhaCSV = Array.from(colunas).map(col => col.textContent).join(';');
        csv += linhaCSV + '\n';
    });
    
    downloadCSV(csv, 'relatorio_vendas.csv');
}

// Exportar relatório de produtos
function exportarRelatorioProdutos() {
    const produtosLista = document.querySelectorAll('.product-rank-item');
    
    if (produtosLista.length === 0) {
        showNotification('Nenhum dado para exportar', 'warning');
        return;
    }
    
    let csv = 'Posição;Produto;Categoria;Quantidade Vendida;Faturamento\n';
    
    produtosLista.forEach((item, index) => {
        const nome = item.querySelector('.product-rank-info h4').textContent;
        const categoria = item.querySelector('.product-rank-info p').textContent;
        const quantidade = item.querySelector('.quantity').textContent;
        const faturamento = item.querySelector('.revenue').textContent;
        
        csv += `${index + 1};"${nome}";${categoria};${quantidade};${faturamento}\n`;
    });
    
    downloadCSV(csv, 'produtos_mais_vendidos.csv');
}

// Exportar todos os relatórios
function exportarTodosRelatorios() {
    // Criar um arquivo ZIP com todos os relatórios
    // Para simplificar, vamos criar um arquivo CSV combinado
    
    const data = new Date().toISOString().slice(0, 10);
    let csv = `RELATÓRIOS COMPLETOS - BEAUTYSTORE\nData: ${data}\n\n`;
    
    // Adicionar KPIs
    csv += 'KPIs PRINCIPAIS\n';
    csv += `Faturamento: ${document.getElementById('kpi-revenue').textContent}\n`;
    csv += `Vendas: ${document.getElementById('kpi-sales').textContent}\n`;
    csv += `Produtos Vendidos: ${document.getElementById('kpi-products-sold').textContent}\n`;
    csv += `Ticket Médio: ${document.getElementById('kpi-avg-ticket').textContent}\n\n`;
    
    // Adicionar análise de estoque
    csv += 'ANÁLISE DE ESTOQUE\n';
    csv += `Valor em Estoque: ${document.getElementById('stock-value').textContent}\n`;
    csv += `Produtos com Estoque Baixo: ${document.getElementById('low-stock-count').textContent}\n`;
    csv += `Produtos sem Estoque: ${document.getElementById('out-of-stock-count').textContent}\n\n`;
    
    // Adicionar análise financeira
    csv += 'ANÁLISE FINANCEIRA\n';
    csv += `Receitas Totais: ${document.getElementById('total-revenue').textContent}\n`;
    csv += `Custos Totais: ${document.getElementById('total-costs').textContent}\n`;
    csv += `Margem de Lucro: ${document.getElementById('profit-margin').textContent}\n\n`;
    
    downloadCSV(csv, `relatorio_completo_${data}.txt`);
    
    showNotification('Relatório completo exportado!', 'success');
}

// Download CSV
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Imprimir relatório de vendas
function imprimirRelatorioVendas() {
    const conteudo = document.getElementById('sales-report').innerHTML;
    const janela = window.open('', '_blank');
    
    janela.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Vendas - BeautyStore</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
                th { background: #f5f5f5; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>📊 Relatório de Vendas</h1>
            <p>Período: ${document.querySelector('.kpi-period').textContent}</p>
            ${conteudo}
            <div style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()">Imprimir</button>
                <button onclick="window.close()">Fechar</button>
            </div>
        </body>
        </html>
    `);
    
    janela.document.close();
}

// Gerar PDF
function gerarPDF() {
    // Em um sistema real, você usaria uma biblioteca como jsPDF
    // Aqui vamos simular com um alerta
    showNotification('Funcionalidade de PDF em desenvolvimento. Use a opção de exportação.', 'info');
}

// Atualizar relatórios
function atualizarRelatorios() {
    carregarDados();
    carregarRelatorios();
    showNotification('Relatórios atualizados!', 'success');
}