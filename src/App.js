import React, { useEffect, useState } from "react";
// import MetaMaskOnboarding from '@metamask/onboarding'
import { ethers } from "ethers";
import './App.css';
import abi from './utils/WavePortal.json'; // check the readme for more info
import config from './config.json'

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [isMetaMaskInstalled, updateIsMetaMaskInstalled] = useState(false)
  const [allWaves, setAllWaves] = useState([]);
  const [userBalance, updateUserBalance] = useState(0)
  const [loading, updateLoading] = useState(false)
  const [hash, updateHash] = useState([])
  const [text, setText] = useState('Share something...')
  const [errorState, updateErrorState] = useState(false)
  const [errCode, updateErrCode] = useState(false)
  
  const contractAddress = config.contractAddress;
  const contractABI = abi.abi;
   
   const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
      
      if (!ethereum) {
        updateIsMetaMaskInstalled(false)
      } else {
        updateIsMetaMaskInstalled(true)
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });
      const balance = await ethereum.request({method: 'eth_getBalance', params: [accounts[0], 'latest']})
      updateUserBalance(Number(balance)/1000000000000000000)
      
      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account)
      } else {
        setCurrentAccount('')
      }
    } catch (error) {
      console.log(error);
    }
  }
 
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  useEffect(() => {
    if(currentAccount) {
      getAllWaves()
    }
  }, [currentAccount, loading])

  useEffect(() => {
    if(errorState || errCode) {
      setTimeout(() => {
        updateErrorState(false)
        updateErrCode(false)
      }, [5000])
    }
  }, [errorState, errCode])

    const getAllWaves = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const waves = await wavePortalContract.getAllWaves();        
        let wavesCleaned = [];
        waves.forEach(wave => {
          wavesCleaned.push({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          });
        });

        setAllWaves(wavesCleaned);
      } else {
        updateIsMetaMaskInstalled(false)
      }
    } catch (error) {
      console.log('eror', error);
    }
  }

  useEffect(() => {
  let wavePortalContract;

  const onNewWave = (from, timestamp, message) => {
    setAllWaves(prevState => [
      ...prevState,
      {
        address: from,
        timestamp: new Date(timestamp * 1000),
        message: message,
      },
    ]);
  };

  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
    wavePortalContract.on('NewWave', onNewWave);
  }

  return () => {
    if (wavePortalContract) {
      wavePortalContract.off('NewWave', onNewWave);
    }
  };
}, []);

    const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask")
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setCurrentAccount(accounts[0]); 
    } catch (error) {
      console.log(error)
    }
  }

  const wave = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        setText('Share something...')
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const waveTxn = await wavePortalContract.wave(text, { gasLimit: 300000 });
        updateLoading(true)
        updateHash(hash.concat(waveTxn.hash))

        await waveTxn.wait();
        updateLoading(false)
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      if(error.code === 4001) {
        updateErrCode(true) 
        } else {
          updateErrorState(true)
        }
      updateLoading(false)
    }
}
  
  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">
        ✨ Hey friend!
        </div>
       <div className="bio">
          {currentAccount ? 'Now you can' : 'Connect your MetaMask wallet and'} send me a wave. You might win some fake $$. 👋 
        </div>
        <div className="bio">
          {currentAccount && 
            <>
              <p>Your wallet address: {currentAccount}</p>
              <p>Your wallet balance: {userBalance}</p>
            </>} 
        </div>

        {currentAccount && <input className="input" onChange={event => setText(event.target.value)} placeholder={text} />}
        {currentAccount && <button className="waveButton" onClick={wave}>
          Wave at Me
        </button>}
        {currentAccount && (
            <span className="bio">{loading && "mining transaction..."}</span>
        )}
               {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            {isMetaMaskInstalled ? 'Connect Wallet' : 'Install MetaMask'}
          </button>
          
        )}
        {allWaves.map((wave, index) => {
          return (
            <div key={index} style={{ backgroundColor: "OldLace", marginTop: "16px", padding: "8px" }}>
              <div>Address: {wave.address}</div>
              <div>Time: {wave.timestamp.toString()}</div>
              <div>Message: {wave.message}</div>
             
            </div>)
        })}
        {errorState && <p className="error">To prevent spamming, please wait 15 minutes and retry. You still might win some free $$.</p>}
        {errCode && <p className="error">You canceled the transaction</p>}
      </div>
    </div>
  );
}

export default App