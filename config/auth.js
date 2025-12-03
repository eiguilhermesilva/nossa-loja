// Sistema de autenticação SIMPLIFICADO (sem login)

class AuthSystem {
    constructor() {
        // Usuário fixo para testes
        this.currentUser = {
            id: 1,
            username: 'admin',
            name: 'Administrador',
            role: 'owner',
            email: 'admin@beautystore.com'
        };
        
        // Atualiza a UI imediatamente
        this.updateUIForLoggedInUser();
    }
    
    // Atualizar UI
    updateUIForLoggedInUser() {
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-details">
                    <span class="user-name">${this.currentUser.name}</span>
                    <span class="user-role">Proprietário</span>
                </div>
            `;
        }
    }
    
    // Métodos básicos (sempre retornam verdadeiro)
    isAuthenticated() { 
        return true; 
    }
    
    getCurrentUser() { 
        return this.currentUser; 
    }
    
    hasPermission(permission) { 
        return true; 
    }
    
    // Métodos vazios para não quebrar o código
    showLoginModal() { }
    login() { }
    logout() { 
        // Recarrega a página
        window.location.href = 'index.html';
    }
}

// Inicializar sistema
const auth = new AuthSystem();
window.auth = auth;

// Função de proteção (sempre permite)
function requireAuth() {
    return true;
}
