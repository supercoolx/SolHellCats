import React, { useEffect, useState } from 'react';
import CandyMachine from './CandyMachine';
import logo from '../assets/imgs/stamp.jpg';
import hellcat from '../assets/imgs/hellcats.png';
import { useCandyMachine } from '../CandyMachineContext';
import { shortenAddress } from './CandyMachine/helpers';

const Home = () => {
	const { walletAddress, setWalletAddress, candyMachine } = useCandyMachine();
    const [percent, setPercent] = useState();

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
		<div className='bg-stone-900 min-h-screen'>
			<div className='py-5 bg-black'>
				<div className='flex justify-between items-center max-w-4xl mx-auto'>
					<div className='flex gap-3 items-center'>
						<img src={logo} className='w-10 h-10' alt='' />
						<div className='text-lg font-bold'>HELLCATS</div>
					</div>
					{ walletAddress ?
                        <div className='px-3 py-1 rounded-md border'>${shortenAddress(walletAddress)}</div> :
                        <button onClick={connectWallet} className='px-3 py-1 rounded-md border'>Connect Wallet</button> 
                    }
				</div>
			</div>
			<div className='max-w-4xl mx-auto mt-10 rounded-xl bg-stone-800 px-28 py-16 flex gap-10'>
				<div className='flex flex-col items-start gap-5'>
					<div className='bg-stone-700 border rounded-md px-2 py-1 text-sm'>FEATURED LAUNCH</div>
					<div className='font-bold text-5xl'>HELLCATS CLUB:</div>
					<div className='flex gap-3'>
						<div className='bg-stone-700 w-32 rounded-lg p-4 flex flex-col gap-2'>
							<div className='text-sm'>ITEMS</div>
							<div className='text-sm'>{candyMachine?.state.itemsAvailable || '---'}</div>
						</div>
						<div className='bg-stone-700 w-32 rounded-lg p-4 flex flex-col gap-2'>
							<div className='text-sm'>PRICE</div>
							<div className='text-sm'>{candyMachine?.state.price || '---'} SOL</div>
						</div>
					</div>
					<div>999 HELLCATS Raising $HELL on Solana.</div>
                    {
                        walletAddress ? 
                        <CandyMachine walletAddress={window.solana} /> :
                        <button onClick={connectWallet} className='px-3 py-1 rounded-md border'>Connect Wallet</button>
                    }
				</div>
				<div className='flex flex-col items-start flex-1'>
					<img src={hellcat} className='rounded-3xl' alt='' />
					<div className='mt-3'>Token minted</div>
					<div className="w-full bg-gray-200 rounded-full mt-2 h-2.5 dark:bg-gray-700">
						<div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
					</div>
					<div className='text-right w-full'>
                        {
                            candyMachine ? 
                            `${percent}% 
                            ( ${candyMachine.state.itemsRedeemed} / ${candyMachine.state.itemsAvailable} )` :
                            '-- % ( --- / --- )'
                        }
                    </div>
				</div>
			</div>
		</div>
	);
};

export default Home;
