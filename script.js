// Configuração inicial e funções globais
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se há dados salvos localmente
    loadLocalData();
    
    // Configurar eventos dos modais
    setupModals();
    
    // Carregar dados do dashboard
    loadDashboardData();
    
    // Configurar eventos do menu
    setupMenu();
    
    // Configurar eventos de busca
    setupSearch();
});

// Função para carregar dados locais (simulação)
function loadLocalData() {
    // Verificar se há configurações salvas
    if (!localStorage.getItem('taxaCartao')) {
        // Configurações padrão
        localStorage.setItem('taxaCartao', '3.5');
        localStorage.setItem('imposto', '6');
        localStorage.setItem('margem', '40');
        localStorage.setItem('estoqueMinimo', '5');
    }
    
    // Carregar configurações no modal
    document.getElementById('taxa-cartao-config').value = localStorage.getItem('taxaCartao');
    document.getElementById('imposto-config').value = localStorage.getItem('imposto');
    document.getElementById('margem-config').value = localStorage.getItem('margem');
    document.getElementById('estoque-min-config').value = localStorage.getItem('estoqueMinimo');
}

// Configurar modais
function setupModals() {
    const configBtn = document.getElementById('config-btn');
    const configModal = document.getElementById('config-modal');
    const closeModal = document.querySelector('.close-modal');
    const saveConfigBtn = document.getElementById('save-config');
    
    // Abrir modal de configuração
    configBtn.addEventListener('click', function(e) {
        e.preventDefault();
        configModal.style.display = 'flex';
    });
    
    // Fechar modal
    closeModal.addEventListener('click', function() {
        configModal.style.display = 'none';
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', function(e) {
        if (e.target === configModal) {
            configModal.style.display = 'none';
        }
    });
    
    // Salvar configurações
    saveConfigBtn.addEventListener('click', function() {
        saveConfigurations();
        configModal.style.display = 'none';
        showNotification('Configurações salvas com sucesso!', 'success');
    });
}

// Salvar configurações
function saveConfigurations() {
    const taxaCartao = document.getElementById('taxa-cartao-config').value;
    const imposto = document.getElementById('imposto-config').value;
    const margem = document.getElementById('margem-config').value;
    const estoqueMin = document.getElementById('estoque-min-config').value;
    
    localStorage.setItem('taxaCartao', taxaCartao);
    localStorage.setItem('imposto', imposto);
    localStorage.setItem('margem', margem);
    localStorage.setItem('estoqueMinimo', estoqueMin);
}

// Carregar dados do dashboard
function loadDashboardData() {
    // Simulação de dados (substituir por dados reais do Google Sheets)
    const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
    const vendas = JSON.parse(localStorage.getItem('vendas')) || [];
    
    // Atualizar estatísticas
    document.getElementById('total-produtos').textContent = produtos.length;
    document.getElementById('total-vendas').textContent = vendas.length;
    
    // Calcular faturamento do mês atual
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    
    let faturamento = 0;
    vendas.forEach(venda => {
        const dataVenda = new Date(venda.data);
        if (dataVenda.getMonth() === mesAtual && dataVenda.getFullYear() === anoAtual) {
            faturamento += venda.valorTotal;
        }
    });
    
    document.getElementById('faturamento').textContent = `R$ ${faturamento.toFixed(2)}`;
    
    // Verificar produtos com estoque baixo
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    const baixoEstoque = produtos.filter(p => p.estoque <= estoqueMinimo).length;
    document.getElementById('baixo-estoque').textContent = baixoEstoque;
    
    // Carregar vendas recentes
    loadRecentSales();
    
    // Carregar alertas de estoque baixo
    loadLowStockAlerts();
}

// Carregar vendas recentes
function loadRecentSales() {
    const vendas = JSON.parse(localStorage.getItem('vendas')) || [];
    const tbody = document.getElementById('sales-table-body');
    tbody.innerHTML = '';
    
    // Ordenar por data mais recente
    vendas.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Pegar as 5 mais recentes
    const recentes = vendas.slice(0, 5);
    
    recentes.forEach(venda => {
        const tr = document.createElement('tr');
        
        const data = new Date(venda.data).toLocaleDateString('pt-BR');
        const produto = venda.produtos.map(p => p.nome).join(', ');
        const quantidade = venda.produtos.reduce((sum, p) => sum + p.quantidade, 0);
        const valor = `R$ ${venda.valorTotal.toFixed(2)}`;
        
        tr.innerHTML = `
            <td>${data}</td>
            <td>${produto}</td>
            <td>${quantidade}</td>
            <td>${valor}</td>
            <td><span class="status-badge status-${venda.status || 'concluida'}">${venda.status || 'Concluída'}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Carregar alertas de estoque baixo
function loadLowStockAlerts() {
    const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
    const estoqueMinimo = parseInt(localStorage.getItem('estoqueMinimo')) || 5;
    const container = document.getElementById('low-stock-items');
    
    container.innerHTML = '';
    
    const baixoEstoque = produtos.filter(p => p.estoque <= estoqueMinimo);
    
    if (baixoEstoque.length === 0) {
        container.innerHTML = '<p class="no-alerts">Nenhum produto com estoque baixo no momento.</p>';
        return;
    }
    
    baixoEstoque.forEach(produto => {
        const div = document.createElement('div');
        div.className = 'alert-item';
        
        div.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>${produto.nome}</strong>
                <p>Estoque atual: ${produto.estoque} unidades</p>
                <p>Mínimo recomendado: ${estoqueMinimo} unidades</p>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// Configurar menu
function setupMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Configurar busca
function setupSearch() {
    const searchInput = document.querySelector('.search-bar input');
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
        }
    });
}

// Realizar busca
function performSearch(term) {
    if (!term.trim()) return;
    
    // Aqui você pode implementar a lógica de busca
    // Por enquanto, apenas mostra uma notificação
    showNotification(`Buscando por: ${term}`, 'info');
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Estilos da notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Adicionar animações CSS para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .status-badge {
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .status-concluida {
        background: #e8f5e9;
        color: #2e7d32;
    }
    
    .status-pendente {
        background: #fff3e0;
        color: #ef6c00;
    }
    
    .status-cancelada {
        background: #ffebee;
        color: #c62828;
    }
    
    .no-alerts {
        color: #666;
        font-style: italic;
        text-align: center;
        padding: 20px;
    }
`;
document.head.appendChild(style);

// Função para formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Exportar funções para uso em outros módulos
window.showNotification = showNotification;
window.formatCurrency = formatCurrency;