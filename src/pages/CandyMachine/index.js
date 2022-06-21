import React, { useEffect, useState } from 'react';
import { Token } from '@solana/spl-token';
import { MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { sendTransactions } from './connection';
import './CandyMachine.css';
import { Buffer } from 'buffer';
import {
	candyMachineProgram,
	TOKEN_METADATA_PROGRAM_ID,
	SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
	getAtaForMint,
	getNetworkExpire,
	getNetworkToken,
	CIVIC
} from './helpers';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useCandyMachine } from '../../CandyMachineContext';
import ReCAPTCHA from 'react-google-recaptcha';

//To get all the require methods/classes for connecting to the solana blockchian 

const opts = { preflightCommitment: 'processed' };

const CandyMachine = ({ walletAddress }) => {
	const {candyMachine, setCandyMachine} = useCandyMachine();
	const [count, setCount] = useState(1);

	const changeCount = (e) => setCount(e.target.value);
	const clickMint = async () => mintToken(count);

	const getProvider = () => {
		const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
		const connection = new web3.Connection(rpcHost);

		//create a new SOlana proivder object
		const provider = new Provider(
			connection,
			window.solana,
			opts
		);
		return provider;
	};

	const getCandyMachineState = async () => {
		const provider = getProvider();

		//Get metadata about your deployed candy machine 
		const idl = await Program.fetchIdl(candyMachineProgram, provider);

		// Create a program that you can call
		const program = new Program(idl, candyMachineProgram, provider);

		// Fetch the metadata from your candy machine
		const candyMachine = await program.account.candyMachine.fetch(process.env.REACT_APP_CANDY_MACHINE_ID);

		// Parse out all our metadata and log it out
		const price = candyMachine.data.price.toNumber() / LAMPORTS_PER_SOL;
		const itemsAvailable = candyMachine.data.itemsAvailable.toNumber();
		const itemsRedeemed = candyMachine.itemsRedeemed.toNumber();
		const itemsRemaining = itemsAvailable - itemsRedeemed;
		const goLiveData = candyMachine.data.goLiveDate.toNumber();
		const presale =
			candyMachine.data.whitelistMintSettings &&
			candyMachine.data.whitelistMintSettings.presale &&
			(!candyMachine.data.goLiveDate || candyMachine.data.goLiveDate.toNumber() > new Date().getTime() / 1000);

		// We will be using this later in our UI so let's generate this now
		const goLiveDateTimeString = new Date(goLiveData * 1000).toGMTString();

		setCandyMachine({
			id: process.env.REACT_APP_CANDY_MACHINE_ID,
			program,
			state: {
				price,
				itemsAvailable,
				itemsRedeemed,
				itemsRemaining,
				goLiveData,
				goLiveDateTimeString,
				isSoldOut: itemsRemaining === 0,
				isActive:
					(presale ||
						candyMachine.data.goLiveDate.toNumber() < new Date().getTime() / 1000) &&
					(candyMachine.endSettings
						? candyMachine.endSettings.endSettingType.date
							? candyMachine.endSettings.number.toNumber() > new Date().getTime() / 1000
							: itemsRedeemed < candyMachine.endSettings.number.toNumber()
						: true),
				isPresale: presale,
				goLiveDate: candyMachine.data.goLiveDate,
				treasury: candyMachine.wallet,
				tokenMint: candyMachine.tokenMint,
				gatekeeper: candyMachine.data.gatekeeper,
				endSettings: candyMachine.data.endSettings,
				whitelistMintSettings: candyMachine.data.whitelistMintSettings,
				hiddenSettings: candyMachine.data.hiddenSettings
			}
		});
	};

	const getCandyMachineCreator = async (candyMachine) => {
		const candyMachineID = new web3.PublicKey(candyMachine);
		return await web3.PublicKey.findProgramAddress(
			[Buffer.from('candy_machine'), candyMachineID.toBuffer()],
			candyMachineProgram,
		);
	};

	const getMetadata = async (mint) => {
		return (
			await web3.PublicKey.findProgramAddress(
				[
					Buffer.from('metadata'),
					TOKEN_METADATA_PROGRAM_ID.toBuffer(),
					mint.toBuffer(),
				],
				TOKEN_METADATA_PROGRAM_ID
			)
		)[0];
	};

	const getMasterEdition = async (mint) => {
		return (
			await web3.PublicKey.findProgramAddress(
				[
					Buffer.from('metadata'),
					TOKEN_METADATA_PROGRAM_ID.toBuffer(),
					mint.toBuffer(),
					Buffer.from('edition'),
				],
				TOKEN_METADATA_PROGRAM_ID
			)
		)[0];
	};

	const createAssociatedTokenAccountInstruction = (
		associatedTokenAddress,
		payer,
		walletAddress,
		splTokenMintAddress
	) => {
		const keys = [
			{ pubkey: payer, isSigner: true, isWritable: true },
			{ pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
			{ pubkey: walletAddress, isSigner: false, isWritable: false },
			{ pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
			{
				pubkey: web3.SystemProgram.programId,
				isSigner: false,
				isWritable: false,
			},
			{ pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
			{
				pubkey: web3.SYSVAR_RENT_PUBKEY,
				isSigner: false,
				isWritable: false,
			},
		];
		return new web3.TransactionInstruction({
			keys,
			programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
			data: Buffer.from([]),
		});
	};

	const mintToken = async (c) => {
		const signersMatrix = [];
		const instructionsMatrix = [];

		for (let index = 0; index < c; index++) {
			const mint = web3.Keypair.generate();

			const userTokenAccountAddress = (
				await getAtaForMint(mint.publicKey, walletAddress.publicKey)
			)[0];

			const userPayingAccountAddress = candyMachine.state.tokenMint
				? (await getAtaForMint(candyMachine.state.tokenMint, walletAddress.publicKey))[0]
				: walletAddress.publicKey;

			const candyMachineAddress = candyMachine.id;
			const remainingAccounts = [];
			const signers = [mint];
			const cleanupInstructions = [];
			const instructions = [
				web3.SystemProgram.createAccount({
					fromPubkey: walletAddress.publicKey,
					newAccountPubkey: mint.publicKey,
					space: MintLayout.span,
					lamports:
						await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
							MintLayout.span,
						),
					programId: TOKEN_PROGRAM_ID,
				}),
				Token.createInitMintInstruction(
					TOKEN_PROGRAM_ID,
					mint.publicKey,
					0,
					walletAddress.publicKey,
					walletAddress.publicKey,
				),
				createAssociatedTokenAccountInstruction(
					userTokenAccountAddress,
					walletAddress.publicKey,
					walletAddress.publicKey,
					mint.publicKey,
				),
				Token.createMintToInstruction(
					TOKEN_PROGRAM_ID,
					mint.publicKey,
					userTokenAccountAddress,
					walletAddress.publicKey,
					[],
					1,
				),
			];

			if (candyMachine.state.gatekeeper) {
				remainingAccounts.push({
					pubkey: (
						await getNetworkToken(
							walletAddress.publicKey,
							candyMachine.state.gatekeeper.gatekeeperNetwork,
						)
					)[0],
					isWritable: true,
					isSigner: false,
				});
				if (candyMachine.state.gatekeeper.expireOnUse) {
					remainingAccounts.push({
						pubkey: CIVIC,
						isWritable: false,
						isSigner: false,
					});
					remainingAccounts.push({
						pubkey: (
							await getNetworkExpire(
								candyMachine.state.gatekeeper.gatekeeperNetwork,
							)
						)[0],
						isWritable: false,
						isSigner: false,
					});
				}
			}
			if (candyMachine.state.whitelistMintSettings) {
				const mint = new web3.PublicKey(
					candyMachine.state.whitelistMintSettings.mint,
				);

				const whitelistToken = (await getAtaForMint(mint, walletAddress.publicKey))[0];
				remainingAccounts.push({
					pubkey: whitelistToken,
					isWritable: true,
					isSigner: false,
				});

				if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
					const whitelistBurnAuthority = web3.Keypair.generate();

					remainingAccounts.push({
						pubkey: mint,
						isWritable: true,
						isSigner: false,
					});
					remainingAccounts.push({
						pubkey: whitelistBurnAuthority.publicKey,
						isWritable: false,
						isSigner: true,
					});
					signers.push(whitelistBurnAuthority);
					const exists =
						await candyMachine.program.provider.connection.getAccountInfo(
							whitelistToken,
						);
					if (exists) {
						instructions.push(
							Token.createApproveInstruction(
								TOKEN_PROGRAM_ID,
								whitelistToken,
								whitelistBurnAuthority.publicKey,
								walletAddress.publicKey,
								[],
								1,
							),
						);
						cleanupInstructions.push(
							Token.createRevokeInstruction(
								TOKEN_PROGRAM_ID,
								whitelistToken,
								walletAddress.publicKey,
								[],
							),
						);
					}
				}
			}

			if (candyMachine.state.tokenMint) {
				const transferAuthority = web3.Keypair.generate();

				signers.push(transferAuthority);
				remainingAccounts.push({
					pubkey: userPayingAccountAddress,
					isWritable: true,
					isSigner: false,
				});
				remainingAccounts.push({
					pubkey: transferAuthority.publicKey,
					isWritable: false,
					isSigner: true,
				});

				instructions.push(
					Token.createApproveInstruction(
						TOKEN_PROGRAM_ID,
						userPayingAccountAddress,
						transferAuthority.publicKey,
						walletAddress.publicKey,
						[],
						candyMachine.state.price.toNumber(),
					),
				);
				cleanupInstructions.push(
					Token.createRevokeInstruction(
						TOKEN_PROGRAM_ID,
						userPayingAccountAddress,
						walletAddress.publicKey,
						[],
					),
				);
			}
			const metadataAddress = await getMetadata(mint.publicKey);
			const masterEdition = await getMasterEdition(mint.publicKey);

			const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
				candyMachineAddress,
			);

			instructions.push(
				await candyMachine.program.instruction.mintNft(creatorBump, {
					accounts: {
						candyMachine: candyMachineAddress,
						candyMachineCreator,
						payer: walletAddress.publicKey,
						wallet: candyMachine.state.treasury,
						mint: mint.publicKey,
						metadata: metadataAddress,
						masterEdition,
						mintAuthority: walletAddress.publicKey,
						updateAuthority: walletAddress.publicKey,
						tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
						tokenProgram: TOKEN_PROGRAM_ID,
						systemProgram: web3.SystemProgram.programId,
						rent: web3.SYSVAR_RENT_PUBKEY,
						clock: web3.SYSVAR_CLOCK_PUBKEY,
						recentBlockhashes: web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
						instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
					},
					remainingAccounts:
						remainingAccounts.length > 0 ? remainingAccounts : undefined,
				}),
			);
			
			signersMatrix.push(signers);
			signersMatrix.push([]);
			instructionsMatrix.push(instructions);
			instructionsMatrix.push(cleanupInstructions);
		}

		try {
			return (
				await sendTransactions(
					candyMachine.program.provider.connection,
					candyMachine.program.provider.wallet,
					instructionsMatrix,
					signersMatrix,
				)
			).txs.map(t => t.txid);
		} catch (e) {
			console.log(e);
		}
		return [];
	};


	useEffect(() => {
		getCandyMachineState();
	}, []);

	return (
		//Only how this if machineStats is available 
		candyMachine ?
			<div className="w-full flex flex-col gap-3">
				<ReCAPTCHA sitekey={process.env.GOOGLE_RECAPTCHA_KEY} onChange={console.log} />
				<div className='flex gap-3 justify-between items-center'>
					<div>Amount:</div>
					<input type="number" className='rounded-md outline-none text-black px-2 w-20' value={count} onChange={changeCount} />
					{candyMachine.state.itemsRedeemed === candyMachine.state.itemsAvailable ? 
						<div className="px-3 py-1 border-red-500 text-red-500 rounded-md border">SOLD OUT CRITTERS!</div> : 
						<button className='px-3 py-1 rounded-md border' onClick={clickMint}>Mint NFT</button>
					}
				</div>
			</div> :
			<div>Loading...</div>
	)

}
export default CandyMachine;