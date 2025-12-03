# 💄 BeautyStore - Sistema de Gerenciamento para Loja de Maquiagem

Sistema completo de gerenciamento para pequenas lojas de maquiagem e skincare, com precificação, estoque, vendas e relatórios.

## ✨ Funcionalidades Principais

### 📊 Dashboard
- Visão geral do negócio
- Estatísticas em tempo real
- Ações rápidas
- Vendas recentes
- Alertas de estoque baixo

### 🧮 Precificação de Produtos
- Cálculo automático de preços baseado em custos
- Considera frete, taxas e impostos
- Margem de lucro configurável
- Histórico de cálculos
- Sugestão de preço de venda

### 📦 Gestão de Produtos
- Cadastro completo de produtos
- Categorização (maquiagem, skincare, acessórios, etc.)
- Controle de estoque
- Fotos e descrições
- Código de barras automático

### 🏪 Controle de Estoque
- Entradas e saídas
- Ajustes de inventário
- Transferências entre locais
- Histórico de movimentações
- Alertas de reposição

### 💰 Sistema de Vendas
- PDV (Ponto de Venda) completo
- Múltiplas formas de pagamento
- Carrinho de compras
- Descontos e promoções
- Emissão de recibos
- Histórico de vendas

### 📈 Relatórios e Análises
- Faturamento por período
- Produtos mais vendidos
- Análise de estoque
- Relatórios financeiros
- Gráficos interativos
- Exportação de dados

## 🚀 Como Configurar

### 1. Hospedagem no Github
1. Crie uma conta no [GitHub](https://github.com)
2. Crie um novo repositório
3. Faça upload de todos os arquivos
4. Ative o GitHub Pages nas configurações do repositório

### 2. Configuração do Google Sheets (Banco de Dados)
1. Acesse [Google Sheets](https://sheets.google.com)
2. Crie uma nova planilha com as seguintes abas:
   - `Produtos` - Cadastro de produtos
   - `Vendas` - Histórico de vendas
   - `Estoque` - Movimentações de estoque
   - `Configuracoes` - Configurações do sistema

3. Compartilhe a planilha como "Qualquer pessoa com o link pode visualizar"

### 3. Configuração do Sistema
1. Abra o arquivo `config/database.js`
2. Substitua `SEU_SHEET_ID_AQUI` pelo ID da sua planilha
3. (Opcional) Configure autenticação se necessário

## 📁 Estrutura de Arquivos
