import { createContext, useContext, useState } from "react";

const context = createContext(null);

export const useCandyMachine = () => useContext(context);

const CandyMachineProvider = ({ children }) => {
    const [candyMachine, setCandyMachine] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);

    return (
        <context.Provider value={{
            candyMachine,
            walletAddress,
            setCandyMachine,
            setWalletAddress
        }}>
            {children}
        </context.Provider>
    )
}

export default CandyMachineProvider;