// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";

/*
========================================================
TODO — Projeto Flash Loan (Disciplina Blockchain)
========================================================

1. LÓGICA DE MOVIMENTAÇÕES (PENDENTE)
--------------------------------------------------------
- [ ] Finalizar a lógica de movimentação dos tokens durante o flash loan
- [ ] Aguardar resposta do professor para definir a abordagem:
      - [ ] Utilizar uma DEX real (Uniswap ou SushiSwap)
      - [ ] OU utilizar uma DEX mockada (contrato simulando swaps)
- [ ] Caso DEX real:
      - [ ] Integrar Uniswap ou SushiSwap
      - [ ] Implementar troca ERC-20 → ERC-20
      - [ ] Tratar taxas e slippage
- [ ] Caso DEX mock:
      - [ ] Criar contrato MockDex
      - [ ] Simular trocas entre tokens
      - [ ] Controlar taxas manualmente
- [ ] Garantir que o valor do flash loan + fee seja devolvido
- [ ] Validar saldo antes e depois da execução

--------------------------------------------------------

2. CRIPTOGRAFIA (OBRIGATÓRIO)
--------------------------------------------------------
- [ ] Implementar autenticação criptográfica para executar o flash loan
- [ ] Utilizar assinaturas digitais (ECDSA)
      - [ ] keccak256
      - [ ] ECDSA.recover
- [ ] Definir política de autorização:
      - [ ] Apenas o owner assina a autorização
      - [ ] Usuários executam o empréstimo com assinatura válida
- [ ] Prevenir replay attacks:
      - [ ] Implementar nonce por usuário OU deadline

--------------------------------------------------------

3. TESTES DO SMART CONTRACT
--------------------------------------------------------
- [ ] Testar execução autorizada
- [ ] Testar execução sem assinatura (revert)
- [ ] Testar replay attack
- [ ] Testar falha na devolução do flash loan
- [ ] Testar valores inválidos

--------------------------------------------------------

4. FRONTEND (PENDENTE)
--------------------------------------------------------
- [ ] Criar frontend simples (React / Next.js / Vite)
- [ ] Conectar carteira (MetaMask)
- [ ] Interface para:
      - [ ] Escolher token
      - [ ] Definir valor do flash loan
- [ ] Gerar assinatura criptográfica no frontend
      - [ ] signMessage OU EIP-712
- [ ] Chamar a função requestFlashLoan
- [ ] Exibir status da transação (sucesso / erro)

--------------------------------------------------------

5. DOCUMENTAÇÃO / ENTREGA
--------------------------------------------------------
- [ ] Explicar o conceito de flash loan
- [ ] Explicar uso do padrão ERC-20
- [ ] Explicar a aplicação de criptografia no projeto
- [ ] Justificar a escolha entre DEX real ou mock
- [ ] Descrever arquitetura geral
- [ ] Descrever os testes realizados

========================================================
*/

interface IDex {
    function buyWETH(uint256 daiAmount) external;

    function sellWETH(uint256 wethAmount) external;

    function buyDAI(uint256 wethAmount) external;

    function sellDAI(uint256 daiAmount) external;

    function getPrice() external view returns (uint256);

    function getDAIBalance() external view returns (uint256);

    function getWETHBalance() external view returns (uint256);
}


contract FlashLoan is FlashLoanSimpleReceiverBase {

    address private immutable daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private immutable wethAddress = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address payable owner;
    IDex private dexA;
    IDex private dexB;
    IERC20 private dai;
    IERC20 private weth;

    mapping(address => bool) public authorizedSigners;

    // Outro constructor pra nao da erro nos testes
    constructor(address _addressProvider, address dex1Address, address dex2Address)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider))
    {
        owner = payable(msg.sender);
        dexA = IDex(dex1Address);
        dexB = IDex(dex2Address);
        dai = IERC20(daiAddress);
        weth = IERC20(wethAddress);

        authorizedSigners[owner] = true;
    }

    /**
        This function is called after your contract has received the flash loaned amount
     */
    //TODO implement dynamic ExecuteOperation
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {

        // DAI --> WETH --> DAI
        if (asset == address(dai)){
            uint256 daiAmount = amount;
            dai.approve(address(dexA), daiAmount);
            dai.approve(address(dexB), daiAmount);


            // Amount of WETH per DAI
            uint256 dexAPrice = dexA.getPrice();
            uint256 dexBPrice = dexB.getPrice();

            uint256 wethReceived;


            if (dexAPrice > dexBPrice) {
                // WETH is cheaper on DEXA, buy it from DEXA and sell it to DEXB

                dexA.buyWETH(daiAmount);
                wethReceived = (daiAmount * dexAPrice) / 1e18;

                weth.approve(address(dexB), wethReceived);

                // Sell WETH for DAI on Dex B
                dexB.sellWETH(wethReceived);
            }else {
                // WETH is cheaper on DEXB, buy it from DEXB and sell it to DEXA
                dexB.buyWETH(daiAmount);
                wethReceived = (daiAmount * dexBPrice) / 1e18;

                weth.approve(address(dexA), wethReceived);

                dexA.sellWETH(wethReceived);
            }
            uint256 newDAIBalance = dai.balanceOf(address(this));

            // Ensure it was profitable
            uint256 totalDebt = daiAmount + premium;
            require(newDAIBalance >= totalDebt, "Arbitrage not profitable");

            IERC20(asset).approve(address(POOL), totalDebt);

        // WETH --> DAI --> WETH
        }else if (asset == address(weth)){
            uint256 wethAmount = amount;
            weth.approve(address(dexA), wethAmount);
            weth.approve(address(dexB), wethAmount);


    //        uint256 userDAIAmount = getBalance(daiAddress);
    //        uint256 userWETHAmount = getBalance(wethAddress);

            // Amount of WETH per DAI
            uint256 dexAPrice = dexA.getPrice();
            uint256 dexBPrice = dexB.getPrice();

            uint256 daiReceived;


            if (dexAPrice < dexBPrice) {
                // DAI is cheaper on DEXA, buy it from DEXA and sell it to DEXB

                dexA.buyDAI(wethAmount);
                daiReceived = (wethAmount * 1e18) / dexAPrice;

                dai.approve(address(dexB), daiReceived);

                // Sell DAI for WETH on Dex B
                dexB.sellDAI(daiReceived);
            }else {
                // DAI is cheaper on DEXB, buy it from DEXB and sell it to DEXA
                dexB.buyDAI(wethAmount);
                daiReceived = (wethAmount * 1e18) / dexBPrice;

                dai.approve(address(dexA), daiReceived);

                dexA.sellDAI(daiReceived);
            }

            uint256 newWETHBalance = weth.balanceOf(address(this));

            // Ensure it was profitable
            uint256 totalDebt = wethAmount + premium;
            require(newWETHBalance >= totalDebt, "Arbitrage not profitable");

            IERC20(asset).approve(address(POOL), totalDebt);
        }


        return true;
    }

    function addSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = true;
    }

    function requestFlashLoan(address _token, uint256 _amount, uint256 _nonce, bytes memory _signature) public {
        // Verificar a assinatura ANTES de executar o flash loan
        bytes32 messageHash = keccak256(abi.encodePacked(
            _token,
            _amount, 
            _nonce,
            address(this)
        ));
        bytes32 ethSignedHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(ethSignedHash, _signature);

        require(authorizedSigners[signer], "Unauthorized signer");

        // Executar o flash loan após verificação
        address receiverAddress = address(this);
        address asset = _token;
        uint256 amount = _amount;
        bytes memory params = "";
        uint16 referralCode = 0;

        POOL.flashLoanSimple(
            receiverAddress,
            asset,
            amount,
            params,
            referralCode
        );
    }

    function getEthSignedMessageHash(bytes32 _messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash));
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function getBalance(address _tokenAddress) public view returns (uint256) {
        return IERC20(_tokenAddress).balanceOf(address(this));
    }

    function withdraw(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    receive() external payable {}
}