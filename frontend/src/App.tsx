import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Importar ABI do FlashLoanAMM
import FlashLoanABI from './frontend/src/contracts/FlashLoan.json';

const RPC_URL = 'http://127.0.0.1:8545';
const FLASH_LOAN_ADDRESS = '0x64f5219563e28EeBAAd91Ca8D31fa3b36621FD4f'; 
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

interface FlashLoanParams {
  token: string;
  amount: string;
}

function App() {
  const [account, setAccount] = useState<string>('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  
  const [selectedToken, setSelectedToken] = useState<string>(DAI_ADDRESS);
  const [loanAmount, setLoanAmount] = useState<string>('');
  const [maxSlippage, setMaxSlippage] = useState<string>('100');
  const [loading, setLoading] = useState<boolean>(false);
  const [txStatus, setTxStatus] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [nonce, setNonce] = useState<number>(0);

  useEffect(() => {
    // Removida a reconexão automática
    // Agora só conecta quando o usuário clicar no botão
  }, []);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Por favor, instale o MetaMask!');
        return;
      }

      // Força a MetaMask a mostrar o popup de seleção de contas
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      
      const flashLoanContract = new ethers.Contract(
        FLASH_LOAN_ADDRESS,
        FlashLoanABI,
        web3Signer
      );

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setContract(flashLoanContract);
      setTxStatus('Carteira conectada com sucesso!');
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      setTxStatus('Erro ao conectar carteira');
    }
  };

  const generateSignature = async () => {
    if (!signer || !loanAmount) {
      alert('Conecte sua carteira e insira o valor do empréstimo');
      return;
    }

    try {
      setLoading(true);
      
      // Incrementar nonce para prevenir replay attacks
      const currentNonce = nonce + 1;
      setNonce(currentNonce);

      // Criar a mensagem para assinatura seguindo o padrão EIP-712
      const domain = {
        name: 'FlashLoanAMM',
        version: '1',
        chainId: await signer.provider!.getNetwork().then(net => net.chainId),
        verifyingContract: FLASH_LOAN_ADDRESS
      };

      const types = {
        FlashLoanRequest: [
          { name: 'user', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      const value = {
        user: account,
        token: selectedToken,
        amount: ethers.parseEther(loanAmount),
        nonce: currentNonce
      };

      // Assinar a mensagem usando EIP-712
      const sig = await signer.signTypedData(domain, types, value);
      setSignature(sig);
      setTxStatus('Assinatura gerada com sucesso!');
      
      return sig;
    } catch (error) {
      console.error('Erro ao gerar assinatura:', error);
      setTxStatus('Erro ao gerar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const executeFlashLoan = async () => {
    if (!contract || !signer || !loanAmount || !signature) {
      alert('Por favor, conecte a carteira, insira o valor e gere a assinatura');
      return;
    }

    try {
      setLoading(true);
      setTxStatus('Executando flash loan...');

      const amount = ethers.parseEther(loanAmount);
      const slippageBps = parseInt(maxSlippage); 


      console.log("Signature:", signature);

      // Chamar a função requestFlashLoan com a assinatura
      const tx = await contract.requestFlashLoan(
        selectedToken,    // 1. _token
        amount,           // 2. _amount
        slippageBps,      // 3. _maxSlippageBps ← ADICIONADO!
        nonce,            // 4. _nonce
        signature         // 5. _signature
      );

      setTxStatus('Transação enviada. Aguardando confirmação...');
      
      const receipt = await tx.wait();
      
      setTxStatus(`Flash Loan executado com sucesso! Hash: ${receipt.hash}`);
      console.log('Transaction receipt:', receipt);
    } catch (error: any) {
      console.error('Erro ao executar flash loan:', error);
      setTxStatus(`Erro: ${error.message || 'Falha ao executar flash loan'}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      // Limpar o estado local
      setAccount('');
      setProvider(null);
      setSigner(null);
      setContract(null);
      setSignature('');
      setNonce(0);
      setTxStatus('Carteira desconectada');
      
      // Recarregar a página para resetar completamente
      window.location.reload();
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <img src="/insa-logo.png" alt="INSA Lyon" className="insa-logo" />
        </div>
        <div className="header-center">
          <h1>Flash Loan Site</h1>
          <p>Sistema de Flash Loan com Blockchain e Criptografia</p>
        </div>
        <div className="header-right">
          <div className="token-icons">
            <div className="token-icon dai-icon">DAI</div>
            <div className="token-icon weth-icon">WETH</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {!account ? (
          <div className="connect-section">
            <h2>Conecte sua Carteira</h2>
            <button 
              onClick={connectWallet} 
              className="connect-button"
            >
              Conectar MetaMask
            </button>
          </div>
        ) : (
          <div className="flash-loan-interface">
            <div className="account-info">
              <div className="account-details">
                <h3>Conta Conectada</h3>
                <p className="account-address">
                  {account.substring(0, 6)}...{account.substring(38)}
                </p>
              </div>
              <button 
                onClick={disconnectWallet} 
                className="disconnect-button"
                title="Desconectar Carteira"
              >
                🚪 Sair
              </button>
            </div>

            <div className="loan-form">
              <h2>Configurar Flash Loan</h2>
              
              <div className="form-group">
                <label>Token:</label>
                <select 
                  value={selectedToken} 
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="token-select"
                >
                  <option value={DAI_ADDRESS}>DAI</option>
                  <option value={WETH_ADDRESS}>WETH</option>
                </select>
              </div>

              <div className="form-group">
                <label>Valor (em unidades do token):</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="Ex: 1000"
                  className="amount-input"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Nonce (proteção contra replay):</label>
                <input
                  type="number"
                  value={nonce}
                  readOnly
                  className="nonce-input"
                />
              </div>

              <div className="button-group">
                <button
                  onClick={generateSignature}
                  disabled={loading || !loanAmount}
                  className="sign-button"
                >
                  {loading ? 'Gerando...' : 'Gerar Assinatura'}
                </button>

                <button
                  onClick={executeFlashLoan}
                  disabled={loading || !signature}
                  className="execute-button"
                >
                  {loading ? 'Executando...' : 'Executar Flash Loan'}
                </button>
              </div>

              {signature && (
                <div className="signature-display">
                  <h4>Assinatura Gerada:</h4>
                  <p className="signature-text">
                    {signature.substring(0, 20)}...{signature.substring(signature.length - 20)}
                  </p>
                </div>
              )}
            </div>

            {txStatus && (
              <div className={`status-message ${txStatus.includes('sucesso') ? 'success' : txStatus.includes('Erro') ? 'error' : 'info'}`}>
                <h3>Status:</h3>
                <p>{txStatus}</p>
              </div>
            )}

            <div className="info-section">
              <h3>Como Funciona</h3>
              <ul>
                <li><strong>Flash Loan:</strong> Empréstimo instantâneo sem garantia que deve ser devolvido na mesma transação</li>
                <li><strong>Criptografia:</strong> Usa assinatura digital ECDSA (EIP-712) para autorizar operações</li>
                <li><strong>Arbitragem:</strong> O contrato executa arbitragem entre DEXs para lucro</li>
                <li><strong>Segurança:</strong> Sistema de nonce previne replay attacks</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Desenvolvido para INSA Lyon - Disciplina de Blockchain</p>
        <p>Flash Loan com Criptografia • Aave V3 • Ethereum</p>
      </footer>
    </div>
  );
}

export default App;
