import React, { useEffect, useState } from 'react';
import CandyMachine from './CandyMachine';
import logo from '../assets/imgs/stamp.png';
import hellcat from '../assets/imgs/hellcats.png';
import { useCandyMachine } from '../CandyMachineContext';
import { shortenAddress } from './CandyMachine/helpers';
import Progressbar from 'react-js-progressbar';

const Home = () => {
	const { walletAddress, setWalletAddress, candyMachine } = useCandyMachine();
    const [percent, setPercent] = useState(0);

	const checkIfWalletIsConnected = () => {
        const { solana } = window;
        if (solana?.isPhantom) {
            console.log('Phantom wallet found!');
            solana.connect({ onlyIfTrusted: true })
            .then(response => {
                setWalletAddress(response.publicKey.toString()); //Guess Thats how you obtain address in SOL
                console.log('Connected with Public Key:', response.publicKey.toString());
            })
            .catch(console.error);
        }
	};

	/*
	 * Let's define this method so our code doesn't break.
	 * We will write the logic for this next!
	 */
	const connectWallet = () => {
		const { solana } = window;

		if (solana) {
			solana.connect().then(response => {
                setWalletAddress(response.publicKey.toString()); //Guess Thats how you obtain address in SOL
                console.log('Connected with Public Key:', response.publicKey.toString());
            })
            .catch(console.error);
		}
	};

	useEffect(checkIfWalletIsConnected, [setWalletAddress]);
    useEffect(() => {
        if(candyMachine) setPercent(Math.floor(candyMachine.state.itemsRedeemed / candyMachine.state.itemsAvailable * 100));
    }, [candyMachine]);

	return (
		<div className='App min-h-screen'>
			<div className='py-2 bg-neutral-800'>
				<div className='flex justify-between items-center max-w-4xl mx-auto'>
					<div className='flex gap-3 items-center'>
						<img src={logo} className='w-10 h-10' alt='' />
						<div className='text-lg font-bold'>HELLCATS</div>
					</div>
					{ walletAddress ?
                        <div className='px-3 py-1 rounded-md border border-green-500 text-green-500'>${shortenAddress(walletAddress)}</div> :
                        <button onClick={connectWallet} className='px-3 py-1 rounded-md border'>Connect Wallet</button> 
                    }
				</div>
			</div>
            <div className='py-10'>
                <div className='max-w-4xl mx-auto rounded-xl bg-stone-800 px-20 py-12 outline outline-green-800'>
                    <div className='font-bold text-5xl pb-5'>HELLCATS CLUB</div>
                    <div className='flex gap-10'>
                        <div className='flex flex-col items-start gap-5 flex-1'>
                            <img src={hellcat} className='rounded-3xl' alt='' />
                        </div>
                        <div className='flex flex-col items-start flex-1'>
                            <div className='flex items-center gap-3 w-full pb-5'>
                                <div className='flex-1'>
                                    <Progressbar input={percent} textStyle={{ fill: 'white' }} />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <div className='bg-stone-700 rounded-lg px-4 py-2 flex flex-col'>
                                        <div>ITEMS:</div>
                                        <div className='text-3xl font-bold'>{candyMachine?.state.itemsAvailable || '---'} <span className='text-sm'>HELLCATS</span></div>
                                    </div>
                                    <div className='bg-stone-700 rounded-lg px-4 py-2 flex flex-col'>
                                        <div>MINTED:</div>
                                        <div className='text-3xl font-bold'>{candyMachine?.state.itemsRedeemed || '---'} <span className='text-sm'>HELLCATS</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className='text-gray-300 pb-3'>999 HELLCATS Raising $HELL on Solana.</div>
                            {
                                walletAddress ? 
                                <CandyMachine walletAddress={window.solana} /> :
                                <button onClick={connectWallet} className='px-3 py-1 rounded-md border'>Connect Wallet</button>
                            }
                        </div>
                    </div>
                </div>
            </div>
		</div>
	);
};

export default Home;
