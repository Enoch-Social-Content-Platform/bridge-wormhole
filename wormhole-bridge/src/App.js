import './App.css';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  attestFromSolana,
  createWrappedOnEth,
  parseSequenceFromLogSolana,
  getSignedVAA,
  getEmitterAddressSolana,
  transferFromSolana,
  redeemOnEth
} from "@certusone/wormhole-sdk";

import { Connection} from "@solana/web3.js"

function App() {


  const [wallet, setWallet] = useState([]);
  const [provider, setProvider] = useState({});
  const [signer, setSigner] = useState({});

  const [r_sig, setr_sig] = useState("");
  const [s_sig, sets_sig] = useState("");
  const [v, setv] = useState(0);

  const SOLANA_HOST = "http://solana-devnet:8899";
  const SOL_BRIDGE_ADDRESS = "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5";
  const SOL_TOKEN_BRIDGE_ADDRESS = "DZnkkTmCiFWfYTfT41X3Rd1kDgozqzxWaHqsw6W4x2oe";
  const connection = new Connection(SOLANA_HOST, "confirmed") ;
  const payerAddress = "0x259989150c6302D5A7AeEc4DA49ABfe1464C58fE";
  const mintAddress = "0x259989150c6302D5A7AeEc4DA49ABfe1464C58fE";
  const WORMHOLE_RPC_HOST = "https://wormhole-v2-testnet-api.certus.one";
  const CHAIN_ID_SOLANA = 1;
  const ETH_TOKEN_BRIDGE_ADDRESS = "0xF890982f9310df57d00f659cf4fd87e65adEd8d7";

  const fromAddress = "0x259989150c6302D5A7AeEc4DA49ABfe1464C58fE";
  const amount = 100;
  const targetAddress
  const CHAIN_ID_ETH = 2;
  const originAddress;
  const originChain;

  const solanaToETH = async () => {
    const transaction = await attestFromSolana(
      connection,
      SOL_BRIDGE_ADDRESS,
      SOL_TOKEN_BRIDGE_ADDRESS,
      payerAddress,
      mintAddress
    );

    const signed = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txid);
    
    const info = await connection.getTransaction(txid);
    const sequence = parseSequenceFromLogSolana(info);
    const emitterAddress = await getEmitterAddressSolana(SOL_TOKEN_BRIDGE_ADDRESS);
    
    const { signedVAA } = await getSignedVAA(
    WORMHOLE_RPC_HOST,
    CHAIN_ID_SOLANA,
    emitterAddress,
    sequence
    );
    // Create the wrapped token on Ethereum
    await createWrappedOnEth(ETH_TOKEN_BRIDGE_ADDRESS, signer, signedVAA);

  }

  const transferSolanaToETH = async () => {
    const transaction = await transferFromSolana(
      connection,
      SOL_BRIDGE_ADDRESS,
      SOL_TOKEN_BRIDGE_ADDRESS,
      payerAddress,
      fromAddress,
      mintAddress,
      amount,
      targetAddress,
      CHAIN_ID_ETH,
      originAddress,
      originChain
    );
    const signed = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txid);
    // Get the sequence number and emitter address required to fetch the signedVAA of our message
    const info = await connection.getTransaction(txid);
    const sequence = parseSequenceFromLogSolana(info);
    const emitterAddress = await getEmitterAddressSolana(SOL_TOKEN_BRIDGE_ADDRESS);
    // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
    const { signedVAA } = await getSignedVAA(
      WORMHOLE_RPC_HOST,
      CHAIN_ID_SOLANA,
      emitterAddress,
      sequence
    );
    // Redeem on Ethereum
    await redeemOnEth(ETH_TOKEN_BRIDGE_ADDRESS, signer, signedVAA);
  }

  async function requestAccount() {


    console.log('Requesting account...');

    if (window.ethereum) {
      console.log('detected');

      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWallet(accounts);
        console.log('accounts', accounts);

        // Trying message sign

        let data = JSON.stringify({
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
              { name: "salt", type: "bytes32" },
            ],
            mail: [
              { name: "content", type: "string" },
            ]
          },
          primaryType: "mail",
          domain: {
            name: "Carbon XYZ",
            version: "1.0.0",
            chainId: 80001,
            verifyingContract: "0x7b22F17c719ff622328c821c810c95063021B1ba",
            salt: "0xf2d857f4a3edcb9b78b4d503bfe733db1e3f6cdc2b7971ee739626c97e86a558"
          },
          message: {
            content: "I understand and acknowledge the terms & conditions of the platform for using the Carbon ecosystem products & services!"
          }

        });

        const signerHere = window.ethereum.selectedAddress;
        let signature = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [signerHere, data],
          from: signerHere
        })
        localStorage.setItem("carbonT&CSignature", signature);

        console.log(signature);
        signature = signature.substring(2);
        console.log(signature);

        setr_sig("0x" + signature.substring(0, 64));
        sets_sig("0x" + signature.substring(64, 128));
        setv(parseInt(signature.substring(128, 130), 16));

        console.log("r: ", r_sig)
        console.log("s: ", s_sig)
        console.log("v: ", v)

      } catch (error) {
        // console.log('Error connecting...');
        console.log(error);

        if (error.code === -32603) {
          changeNetwork();
        }
      }

    } else {
      alert('Meta Mask not detected');

    }
  }

  // Create a provider to interact with a smart contract
  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {

      try {

        await requestAccount();

        let p = new ethers.providers.Web3Provider(window.ethereum);

        setProvider(p);
        providerVar = p;
        // console.log("Wallet", wallet);
        console.log("Provider", p);

        let s = p.getSigner();
        console.log('signer', s);
        console.log(await s.getAddress());
        setSigner(s);
        signerVar = signer;

      } catch (error) {
        console.log(error);
      }
    }
  }

  const changeNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: "0x13881" }],
      });
      console.log("You switched to the right network!");
    } catch (error) {
      if (error.code === 4902) {
        // console.log("Please add the Polygon network to MetaMask!");
        addNetwork();
      }

      console.log("Cannot switch to the network.");
    }
  }

  const addNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x13881',
            chainName: 'Mumbai Testnet',
            rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
            blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
            nativeCurrency: {
              symbol: 'MATIC',
              decimals: 18
            }
          }
        ]
      });
      console.log('Network Added.');

    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="App">
      <header className="App-header">

        <button onClick={connectWallet}>Connect Wallet</button>
        <h3>Wallet Address: {wallet}</h3>

        <button onClick={solanaToETH}>Attest From Solana</button>

      </header>

    </div>
  );
}

export default App;

