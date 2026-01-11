# Flash Loan Project 💸

Projeto de Flash Loan desenvolvido com Hardhat e integração com o protocolo Aave V3. Este projeto demonstra a implementação de empréstimos flash (flash loans) em Ethereum, permitindo empréstimos instantâneos sem garantia.

## 📋 Sobre o Projeto

Este projeto implementa um contrato inteligente de Flash Loan utilizando:

- **Hardhat** - Framework de desenvolvimento Ethereum
- **Aave V3** - Protocolo DeFi para flash loans
- **Solidity** - Linguagem de programação para smart contracts
- **TypeScript** - Para testes e scripts
- **Ethers.js** - Biblioteca para interação com Ethereum

O contrato `FlashLoan.sol` estende `FlashLoanSimpleReceiverBase` do Aave e implementa a lógica necessária para executar operações de flash loan.

## 🚀 Como Começar

### Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 20 ou superior)
- **npm** ou **yarn**
- **Git**

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd flash-loan-project
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   
   Crie um arquivo `.env` na raiz do projeto:
   ```bash
   # Exemplo de configuração
   MAINNET_RPC_URL=sua_chave_mainnet
   ```

## 🧪 Executar Testes

Para rodar todos os testes do projeto:

```bash
npx hardhat test
```

Para rodar testes específicos:

```bash
# Apenas testes Solidity
npx hardhat test solidity

# Apenas testes Mocha
npx hardhat test mocha
```

## 📁 Estrutura do Projeto

```
flash-loan-project/
├── contracts/          # Smart contracts Solidity
│   ├── flashloan.sol  # Contrato principal de Flash Loan
│   └── Counter.sol    # Contrato exemplo
├── test/              # Testes do projeto
│   ├── flash__loan.test.js
│   └── sanity.test.js
├── scripts/           # Scripts de deployment e testes
├── ignition/          # Módulos Ignition para deployment
└── hardhat.config.js  # Configuração do Hardhat
```

## 🔧 Comandos Úteis

```bash
# Compilar contratos
npx hardhat compile

# Rodar testes
npx hardhat test

# Limpar cache e artefatos
npx hardhat clean

# Rodar node local
npx hardhat node

# Deploy (exemplo)
npx hardhat ignition deploy ignition/modules/Counter.ts
```

## 📚 Recursos Adicionais

- [Documentação Hardhat](https://hardhat.org/docs)
- [Aave V3 Docs](https://docs.aave.com/developers/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## ⚠️ Notas Importantes

- Este projeto é para fins educacionais
- Sempre teste em redes de teste antes de usar em mainnet
- Nunca compartilhe suas chaves privadas
- Os flash loans devem ser reembolsados na mesma transação

## 📄 Licença

MIT

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```
