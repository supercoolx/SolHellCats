import React, { useEffect, useState } from 'react';
import './App.css';
import CandyMachine from './CandyMachine';

const App = () => {
	const [walletAddress, setWalletAddress] = useState(null);

	const checkIfWalletIsConnected = async () => {
		try {
			const { solana } = window;
			if (solana?.isPhantom) {
				console.log('Phantom wallet found!');
				const response = await solana.connect({ onlyIfTrusted: true });
				setWalletAddress(response.publicKey.toString()); //Guess Thats how you obtain address in SOL
				console.log('Connected with Public Key:', response.publicKey.toString());
			}
		} catch (error) {
			console.error(error);
		}
	};

	/*
	 * Let's define this method so our code doesn't break.
	 * We will write the logic for this next!
	 */
	const connectWallet = async () => {
		const { solana } = window;

		if (solana) {
			const response = await solana.connect();
			console.log("Connected with Public Key: ", response.publicKey.toString());
			setWalletAddress(response.publicKey.toString())
		}
	};

	/*
	 * We want to render this UI when the user hasn't connected
	 * their wallet to our app yet.
	 */
	const renderNotConnectedContainer = () => (
		<button className="cta-button connect-wallet-button" onClick={connectWallet}>Connect to Wallet</button>
	);

	useEffect(() => {
		checkIfWalletIsConnected().catch(err => console.error(err));
	}, []);

	return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					{!walletAddress && renderNotConnectedContainer()}
				</div>

				{walletAddress && <CandyMachine walletAddress={window.solana} />}
			</div>
		</div>
	);
};

export default App;
