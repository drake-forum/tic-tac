import React, { useEffect, useState } from 'react';
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, web3 } from '@project-serum/anchor';

import idl from './idl.json';
import { useRouter } from "next/router";
import styles from "./index.module.css";

const { SystemProgram } = web3;
const programID = new PublicKey(idl.metadata.address);

const checkIfWalletIsConnected = async (setWalletAddress: (addr: string) => void) => {
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

const shortAddress = (address: string) => {
    const prefix = address.slice(0, 4);
    const suffix = address.slice(address.length - 4, address.length);
    return `${prefix}...${suffix}`;
}

const getProvider = () => {
    const { solana } = window;
    const network = clusterApiUrl('devnet');
    const connection = new Connection(network, "processed");
    const wallet = window.solana ?? Keypair.generate();
    return new AnchorProvider(
        connection, wallet, { preflightCommitment: "processed" },
    );
}

const Home = () => {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const router = useRouter()
    const defaultPubkey = PublicKey.default.toBase58()
    let gameParam = router.query.game as string
    console.log("game query: ", gameParam)
    const [ game, setGame ] = useState<string>(gameParam ?? "");
    console.log("game: ", game)
    const [ walletAddress, setWalletAddress ] = useState<string>("");
    const [ firstPlayer, setFirstPlayer ] = useState<string>("");
    const [ secondPlayer, setSecondPlayer ] = useState<string>("");
    const [ xPlayer, setXPlayer ] = useState<string>("");
    const [ winner, setWinner ] = useState<string>("");
    const [ state, setState ] = useState<number[]>([ -1, -1, -1, -1, -1, -1, -1, -1, -1 ])
    const [ loading, setLoading ] = useState<boolean>(false)

    const connectWallet = async () => {
        const { solana } = window;
        if (solana) {
            const response = await solana.connect();
            console.log('Connected with Public Key:', response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
        }
    };

    const startGame = async () => {
        try {
            const provider = getProvider();
            const program = new Program<any>(idl, programID, provider);
            const game = web3.Keypair.generate();
            console.log("starting game...")
            setLoading(true)
            await program.methods.startGame()
                .accounts({
                    game: game.publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([ game ]).rpc()
            let gamePublicKey = game.publicKey.toBase58();
            console.log("Started game", gamePublicKey)
            setGame(gamePublicKey)
            router.query.game = gamePublicKey
            await router.push(router)
        } catch (error) {
            console.log("Error starting a game:", error)
        }
    };

    const renderConnectedContainer = () => {
        return (
            <div className="connected-container">
                <div>
                    <button className="cta-button connect-wallet-button" onClick={startGame}>
                        Start Game
                    </button>
                </div>
            </div>
        )
    }

    useEffect(() => {
        if (walletAddress) {
            console.log('Wallet changes...');
        }
    }, [ walletAddress ]);

    useEffect(() => {
        const onLoad = async () => {
            await checkIfWalletIsConnected(setWalletAddress);
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);


    const nextPlayer = () => {
        const squaresLeft = state.filter((val) => val === -1).length
        if (squaresLeft % 2 === 1) {
            return xPlayer
        } else if (xPlayer == firstPlayer) {
            return secondPlayer
        } else {
            return firstPlayer
        }
    }

    const joinGame = async () => {
        try {
            const provider = getProvider();
            const program = new Program<any>(idl, programID, provider);
            console.log("joining game...")
            setLoading(true)
            await program.methods.joinGame().accounts({
                game: new PublicKey(game),
                user: new PublicKey(walletAddress),
            }).rpc()
            setSecondPlayer(walletAddress)
        } catch (error) {
            console.log("Error joining a game:", error)
        }
    };

    const renderNotConnectedContainer = () => (
        <button className="cta-button connect-wallet-button" onClick={connectWallet}>
            Connect to Wallet
        </button>
    );

    useEffect(() => {
        if (walletAddress) {
            console.log('Wallet changes...');
        }
    }, [ walletAddress ]);

    const loadState = async () => {
        try {
            const provider = getProvider()
            const program = new Program<any>(idl, programID, provider)
            const id = router.query.game as string
            console.log('path: ', id)
            let account = await program.account.game.fetch(new PublicKey(id))
            console.log('program state', account.state)
            setState(account.state)
            console.log('first player', account.firstPlayer.toBase58())
            setFirstPlayer(account.firstPlayer.toBase58())
            setSecondPlayer(account.secondPlayer.toBase58())
            console.log('second player', account.secondPlayer.toBase58())
            setWinner(account.winner.toBase58())
            console.log('winner', account.winner.toBase58())
            setXPlayer(account.xPlayer.toBase58())
            console.log('xPlayer', account.xPlayer.toBase58())
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false)
        }
    };

    useEffect(() => {
        const onLoad = async () => {
            setLoading(true)
            await checkIfWalletIsConnected(setWalletAddress);
            await loadState()
            setLoading(false)
        };
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);

    useEffect(() => {
        if(!router.isReady || !router.query.game) return;
        setLoading(true)
        loadState()
        setLoading(false)
        const gamePublicKey = new PublicKey(router.query.game);
        connection.onAccountChange(
            gamePublicKey,
            async (updatedAccountInfo, context) =>
                await loadState(),
            "confirmed"
        );
    }, [router.isReady, game]);

    useEffect(() => {
        if(router.isReady && router.query.game) {
            setGame(router.query.game as string)
        }
    }, [router.isReady, router.query.game]);

    const renderFirstPlayer = () => <div>🐯 {shortAddress(firstPlayer)} {firstPlayer === walletAddress && <>(You)</>} </div>

    const renderSecondPlayer = () => {
        if (secondPlayer === defaultPubkey) {
            if (walletAddress  && walletAddress !== firstPlayer) {
                return <button className="cta-button connect-wallet-button" onClick={joinGame}>
                    Join to play
                </button>
            }
            return <div>Second player not joined yet</div>
        }
        return <div>🦁 {shortAddress(secondPlayer)} {secondPlayer === walletAddress && <>(You)</>} </div>
    }

    const getSymbol = (i: number) => {
        if (i === 0) return 'O'
        if (i === 1) return 'X'
        return ''
    }

    const move = async (i: number) => {
        const provider = getProvider();
        const program = new Program<any>(idl, programID, provider);
        console.log("making a move...")
        setLoading(true)
        await program.methods.setValue(i)
            .accounts({
                game: new PublicKey(game),
                user: new PublicKey(walletAddress),
            }).rpc()
        await loadState()
    }

    const renderSquare = (i: number) => {
        let blankFiled = state.filter((val) => val === -1).length === 9;
        const canMove = walletAddress && winner === defaultPubkey
            && secondPlayer && secondPlayer !== defaultPubkey
            && (nextPlayer() === walletAddress && state[i] === -1 || blankFiled)
        let style = "square"
        if (canMove) {
            style = "square hoverableSquare"
        }
        let onClick = async () => {
            if (canMove) await move(i);
        }
        return (
            <button
                className={style}
                onClick={onClick}
            >
                {getSymbol(state[i])}
            </button>
        )
    };

    const readyToMakeMove = () => walletAddress && secondPlayer !== defaultPubkey

    const renderLoading = () => <div><div className={styles.ldsRing}><div></div><div></div><div></div><div></div></div></div>

    if (!game) {
        return (
            <>
                <p className="header">🦄 Tic Tac Toe</p>
                <p className="sub-text">Now on the Solana blockchain ✨</p>
                {!walletAddress && renderNotConnectedContainer()}
                {walletAddress && renderConnectedContainer()}
                {loading && renderLoading()}
            </>
        );
    }

    return (
        <>
            <div className={styles.profilesRow}>
                <div className={styles.firstPlayer}>
                    {firstPlayer && renderFirstPlayer()}
                </div>
                <div className={styles.winner}>
                    {winner && winner !== defaultPubkey && <>
                        <div>Game Over</div>
                        <div>Winner {shortAddress(winner)}!🎉🎉</div>
                    </>}
                </div>
                <div className={styles.secondPlayer}>
                    {firstPlayer && renderSecondPlayer()}
                </div>
            </div>
            {!walletAddress &&!loading && renderNotConnectedContainer()}
            {readyToMakeMove() && xPlayer === defaultPubkey && <div className={styles.makeMove}>Make a first move yourself or wait for another player</div> }
            <div className="game">
                <div className="game-board">
                    <div>
                        <div className="board-row">
                            {renderSquare(0)}
                            {renderSquare(1)}
                            {renderSquare(2)}
                        </div>
                        <div className="board-row">
                            {renderSquare(3)}
                            {renderSquare(4)}
                            {renderSquare(5)}
                        </div>
                        <div className="board-row">
                            {renderSquare(6)}
                            {renderSquare(7)}
                            {renderSquare(8)}
                        </div>
                    </div>
                </div>
            </div>
            {loading && renderLoading()}
        </>
    );
}

export default Home;
