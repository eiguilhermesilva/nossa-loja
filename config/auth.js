// Sistema de autenticação simples para o BeautyStore
// NOTA: Esta é uma autenticação básica para demonstração
// Em produção, use um sistema de autenticação mais seguro

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Verificar se há usuário logado
        this.checkLoginStatus();
        
        // Configurar eventos de login/logout
        this.setupAuthEvents();
    }

    // Verificar status de login
    checkLoginStatus() {
        const userData = localStorage.getItem('beautystore_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUIForLoggedInUser();
        } else {
           // this.showLoginModal(); // Remova as Barras e o comentário para ativar o login
        }
    }

    // Mostrar modal de login
    showLoginModal() {
        // Criar modal de login se não existir
        if (!document.getElementById('login-modal')) {
            this.createLoginModal();
        }
        
        document.getElementById('login-modal').style.display = 'flex';
    }

    // Criar modal de login
    createLoginModal() {
        const modal = document.createElement('div');
        modal.id = 'login-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content small-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-lock"></i> Acesso ao Sistema</h3>
                </div>
                <div class="modal-body">
                    <div class="login-container">
                        <div class="login-logo">
                            <i class="fas fa-palette"></i>
                            <h2>BeautyStore</h2>
                            <p>Sistema de Gerenciamento</p>
                        </div>
                        
                        <form id="login-form">
                            <div class="form-group">
                                <label for="login-username"><i class="fas fa-user"></i> Usuário</label>
                                <input type="text" id="login-username" placeholder="Digite seu usuário" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="login-password"><i class="fas fa-key"></i> Senha</label>
                                <input type="password" id="login-password" placeholder="Digite sua senha" required>
                            </div>
                            
                            <div class="form-options">
                                <label>
                                    <input type="checkbox" id="remember-me">
                                    Lembrar de mim
                                </label>
                            </div>
                            
                            <button type="submit" class="btn-login">
                                <i class="fas fa-sign-in-alt"></i> Entrar
                            </button>
                            
                            <div class="login-info">
                                <p><strong>Usuário de demonstração:</strong> admin</p>
                                <p><strong>Senha:</strong> 123456</p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Configurar evento do formulário
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        // Adicionar estilos
        this.addAuthStyles();
    }

    // Adicionar estilos para autenticação
    addAuthStyles() {
        const styles = `
            .login-container {
                text-align: center;
                padding: 20px;
            }
            
            .login-logo {
                margin-bottom: 30px;
            }
            
            .login-logo i {
                font-size: 3rem;
                color: #ff6b8b;
                margin-bottom: 15px;
            }
            
            .login-logo h2 {
                color: #333;
                margin: 0 0 5px 0;
            }
            
            .login-logo p {
                color: #666;
                margin: 0;
            }
            
            #login-form {
                margin-top: 20px;
            }
            
            #login-form .form-group {
                margin-bottom: 20px;
                text-align: left;
            }
            
            #login-form label {
                display: flex;
                align-items: center;
                gap: 10px;
                color: #555;
                font-weight: 500;
                margin-bottom: 8px;
            }
            
            #login-form input[type="text"],
            #login-form input[type="password"] {
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            #login-form input:focus {
                border-color: #ff6b8b;
                outline: none;
            }
            
            .form-options {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                font-size: 0.9rem;
                color: #666;
            }
            
            .form-options label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            
            .btn-login {
                background: linear-gradient(135deg, #ff6b8b, #6c63ff);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 15px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.3s ease;
            }
            
            .btn-login:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(255, 107, 139, 0.3);
            }
            
            .login-info {
                margin-top: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
                font-size: 0.9rem;
                color: #666;
            }
            
            .login-info p {
                margin: 5px 0;
            }
            
            .user-menu {
                position: relative;
            }
            
            .user-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                min-width: 200px;
                display: none;
                z-index: 1000;
            }
            
            .user-dropdown.show {
                display: block;
                animation: slideDown 0.3s ease;
            }
            
            .user-dropdown-item {
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                color: #666;
                text-decoration: none;
                transition: all 0.3s ease;
                border-bottom: 1px solid #eee;
            }
            
            .user-dropdown-item:last-child {
                border-bottom: none;
            }
            
            .user-dropdown-item:hover {
                background: #f8f9fa;
                color: #ff6b8b;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    // Login
    login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('remember-me').checked;
        
        // Validação simples (em produção, use autenticação segura)
        if (username === 'admin' && password === '123456') {
            this.currentUser = {
                id: 1,
                username: 'admin',
                name: 'Administrador',
                role: 'owner',
                email: 'admin@beautystore.com'
            };
            
            // Salvar sessão
            if (remember) {
                localStorage.setItem('beautystore_user', JSON.stringify(this.currentUser));
            } else {
                sessionStorage.setItem('beautystore_user', JSON.stringify(this.currentUser));
            }
            
            // Fechar modal e atualizar UI
            document.getElementById('login-modal').style.display = 'none';
            this.updateUIForLoggedInUser();
            
            showNotification('Login realizado com sucesso!', 'success');
        } else {
            showNotification('Usuário ou senha incorretos', 'error');
        }
    }

    // Logout
    logout() {
        // Limpar dados de sessão
        localStorage.removeItem('beautystore_user');
        sessionStorage.removeItem('beautystore_user');
        
        // Redirecionar para página inicial
        this.currentUser = null;
        window.location.href = 'index.html';
    }

    // Atualizar UI para usuário logado
    updateUIForLoggedInUser() {
        // Atualizar informações do usuário na sidebar
        const userInfo = document.querySelector('.user-info');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <div class="user-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="user-details">
                    <span class="user-name">${this.currentUser.name}</span>
                    <span class="user-role">${this.currentUser.role === 'owner' ? 'Proprietário' : 'Vendedor'}</span>
                </div>
                <div class="user-menu">
                    <button class="user-menu-btn" onclick="auth.toggleUserMenu()">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown" id="user-dropdown">
                        <a href="#" class="user-dropdown-item" onclick="auth.logout()">
                            <i class="fas fa-sign-out-alt"></i>
                            Sair
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Adicionar estilos para o menu do usuário
        this.addUserMenuStyles();
    }

    // Alternar menu do usuário
    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    // Configurar eventos de autenticação
    setupAuthEvents() {
        // Fechar menu do usuário ao clicar fora
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('user-dropdown');
            const menuBtn = document.querySelector('.user-menu-btn');
            
            if (dropdown && menuBtn && !dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    // Verificar se usuário está autenticado
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Obter usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Verificar permissões (exemplo básico)
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Permissões baseadas no papel (role)
        const permissions = {
            'owner': ['view', 'edit', 'delete', 'admin'],
            'seller': ['view', 'edit'],
            'viewer': ['view']
        };
        
        const userPermissions = permissions[this.currentUser.role] || [];
        return userPermissions.includes(permission);
    }
}

// Inicializar sistema de autenticação
const auth = new AuthSystem();

// Tornar disponível globalmente
window.auth = auth;

// Proteger páginas (exemplo básico)
function requireAuth() {
    if (!auth.isAuthenticated()) {
        auth.showLoginModal();
        return false;
    }
    return true;
}

// Usar em páginas protegidas (adicione isso no início dos scripts das páginas)
// if (!requireAuth()) {
//     // Redirecionar ou mostrar mensagem
// }