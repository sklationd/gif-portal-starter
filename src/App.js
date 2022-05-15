import React, { useEffect, useState } from "react";
import "./App.css";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";
const { SystemProgram } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl("devnet");

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
    preflightCommitment: "processed",
};

// Constants
const App = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [gifList, setGifList] = useState([]);

    const checkIfWalletIsConnected = async () => {
        try {
            const { solana } = window;
            if (solana) {
                if (solana.isPhantom) {
                    console.log("found phantom!");
                    const response = await solana.connect({
                        onlyIfTrusted: true,
                    });
                    console.log(
                        "Connected with Public Key:",
                        response.publicKey.toString()
                    );
                    setWalletAddress(response.publicKey.toString());
                } else {
                    alert(
                        "there is already other solana wallet that occupy window.solana"
                    );
                }
            } else {
                alert("please install the phantom");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const connectWallet = async () => {
        const { solana } = window;
        if (solana) {
            const response = await window.solana.connect();
            console.log(
                "Connected with Public Key:",
                response.publicKey.toString()
            );
            setWalletAddress(response.publicKey.toString());
        } else {
            alert("Where is the phantom? it's weird...");
        }
    };

    const sendGif = async () => {
        if (inputValue.length > 0) {
            console.log("Gif link:", inputValue);
            setInputValue("");
            try {
                const provider = getProvider();
                const program = new Program(idl, programID, provider);

                await program.rpc.addGif(inputValue, {
                    accounts: {
                        baseAccount: baseAccount.publicKey,
                        user: provider.wallet.publicKey,
                    },
                });
                console.log("GIF successfully sent to program", inputValue);

                await getGifList();
            } catch (error) {
                console.log("Error sending GIF:", error);
            }
        } else {
            console.log("Empty input. Try again");
        }
    };

    const onInputChange = (event) => {
        const { value } = event.target;
        setInputValue(value);
    };

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new AnchorProvider(
            connection,
            window.solana,
            opts.preflightCommitment
        );
        return provider;
    };

    const renderNotConnectedContainer = () => (
        <button
            className="cta-button connect-wallet-button"
            onClick={connectWallet}
        >
            Connect to Wallet
        </button>
    );

    const renderConnectedContainer = () => {
        if (gifList === null) {
            return (
                <div className="connected-container">
                    <button
                        className="cta-button submit-gif-button"
                        onClick={createGifAccount}
                    >
                        Do One-Time Initialization For GIF Program Account
                    </button>
                </div>
            );
        } else {
            return (
                <div className="connected-container">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendGif();
                        }}
                    >
                        <input
                            type="text"
                            placeholder="Enter gif link!"
                            value={inputValue}
                            onChange={onInputChange}
                        />
                        <button
                            type="submit"
                            className="cta-button submit-gif-button"
                        >
                            Submit
                        </button>
                    </form>

                    <div className="gif-grid">
                        {gifList.map((item, index) => (
                            <div className="gif-item" key={index}>
                                <img src={item.gifLink} alt={item.gifLink} />
                                <p>Added by: {item.userAddress.toString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
    };

    useEffect(() => {
        const onLoad = async () => {
            await checkIfWalletIsConnected();
        };
        window.addEventListener("load", onLoad);
        return () => window.removeEventListener("load", onLoad);
    }, []);

    const createGifAccount = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            console.log("ping");
            await program.rpc.initialize({
                accounts: {
                    baseAccount: baseAccount.publicKey,
                    user: provider.wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                },
                signers: [baseAccount],
            });
            console.log(
                "Created a new BaseAccount w/ address:",
                baseAccount.publicKey.toString()
            );
            await getGifList();
        } catch (error) {
            console.log("Error creating BaseAccount account:", error);
        }
    };

    const getGifList = async () => {
        try {
            const provider = getProvider();
            const program = new Program(idl, programID, provider);
            const account = await program.account.baseAccount.fetch(
                baseAccount.publicKey
            );

            console.log("Got the account", account);
            setGifList(account.gifList);
        } catch (error) {
            console.log("Error in getGifList: ", error);
            setGifList(null);
        }
    };

    useEffect(() => {
        if (walletAddress) {
            console.log("Fetching GIF List...");
            // Call solana program here
            // Set state
            getGifList();
        }
    }, [walletAddress]);

    return (
        <div className="App">
            <div className="container">
                <div className="authed-container">
                    <p className="header">🖼 CAT Portal</p>
                    <p className="sub-text">
                        View your CAT collection in the metaverse ✨
                    </p>
                    {!walletAddress && renderNotConnectedContainer()}
                    {walletAddress && renderConnectedContainer()}
                </div>
                <div className="footer-container"></div>
            </div>
        </div>
    );
};

export default App;
