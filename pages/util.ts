import { clusterApiUrl, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@project-serum/anchor";

export const checkIfWalletIsConnected = async (setWalletAddress: (addr: string) => void) => {
    try {
        const { solana } = window;
        if (solana) {
            if (solana.isPhantom) {
                console.log('Phantom wallet found!');
                const response = await solana.connect({ onlyIfTrusted: true });
                console.log(
                    'Connected with Public Key:',
                    response.publicKey.toString()
                );
                setWalletAddress(response.publicKey.toString());
            }
        } else {
            alert('Solana object not found! Get a Phantom Wallet 👻');
        }
    } catch (error) {
        console.error(error);
    }
};

export const shortAddress = (address: string) => {
    const prefix = address.slice(0, 4);
    const suffix = address.slice(address.length - 4, address.length);
    return `${prefix}...${suffix}`;
}

export const getProvider = () => {
    const network = clusterApiUrl('devnet');
    const connection = new Connection(network, "processed");
    return new AnchorProvider(
        connection, window.solana, { preflightCommitment: "processed" },
    );
}