import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import * as https from 'https'; // Added for HTTPS requests
import {
  Client,
  PrivateKey,
  TokenAirdropTransaction,
  AccountId,
  TokenId,
  Hbar,
  Status,
} from "@hashgraph/sdk";

import { TREASURY_ACCOUNT_ID, TREASURY_PRIVATE_KEY } from "./config";

// Ensure your main server file (e.g., index.ts) has app.use(express.json());

const TOKEN_ID = TokenId.fromString("0.0.5818470"); // Provided Token ID
// const TOKEN_DECIMALS = 2; // Removed hardcoded decimals

// Helper function to fetch token decimals
async function fetchTokenDecimalsFromServer(tokenIdString: string, networkForTokenInfo: string = "testnet"): Promise<number> {
  return new Promise((resolve, reject) => {
    const mirrorNodeUrl = `https://${networkForTokenInfo}.mirrornode.hedera.com/api/v1/tokens/${tokenIdString}`;
    https.get(mirrorNodeUrl, (apiRes) => {
      let rawData = '';
      if (apiRes.statusCode !== 200) {
        // Handle non-200 responses
        let errorMsg = `Failed to fetch token info: Status Code ${apiRes.statusCode}`;
        apiRes.on('data', (chunk) => { rawData += chunk; }); // Attempt to get error body
        apiRes.on('end', () => {
          try {
            const errorBody = JSON.parse(rawData);
            errorMsg += ` - ${errorBody.message || JSON.stringify(errorBody)}`;
          } catch (e) {
            // Ignore parsing error of error body
          }
          reject(new Error(errorMsg));
        });
        apiRes.resume(); // Consume response data to free up memory
        return;
      }

      apiRes.on('data', (chunk) => { rawData += chunk; });
      apiRes.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          if (parsedData && typeof parsedData.decimals === 'string') {
            const decimals = parseInt(parsedData.decimals, 10);
            if (isNaN(decimals)) {
              reject(new Error("Fetched decimals is not a valid number."));
            } else {
              resolve(decimals);
            }
          } else {
            reject(new Error("Decimals not found or not a string in token info response."));
          }
        } catch (e: any) {
          reject(new Error(`Error parsing token info: ${e.message}`));
        }
      });
    }).on('error', (e: any) => {
      reject(new Error(`Error fetching token info: ${e.message}`));
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Fetch token decimals dynamically once at startup
  let tokenDecimals: number;
  try {
    // Using "testnet" as per previous context for this specific TOKEN_ID's information
    tokenDecimals = await fetchTokenDecimalsFromServer(TOKEN_ID.toString(), "testnet");
    console.log(`Successfully fetched token decimals: ${tokenDecimals} for token ${TOKEN_ID.toString()}`);
  } catch (error) {
    console.error(`FATAL: Failed to fetch token decimals for ${TOKEN_ID.toString()} from mirror node. Server cannot operate correctly.`, error);
    // Depending on desired behavior, either throw to stop server, or use a fallback with a clear warning.
    // For now, rethrowing to make it explicit that the server might not function as expected.
    throw new Error(`Failed to initialize token decimals. Details: ${(error as Error).message}`);
  }

  // It's good practice to ensure JSON body parsing middleware is active.
  // If not already set globally in your main server file, you might add it here:
  // app.use(express.json()); 
  // However, it's generally better to set this up where `app` is created.

  app.post("/api/claim-tokens", async (req: Request, res: Response) => {
    const { hederaAccountId, score } = req.body;

    // Validate input
    if (!hederaAccountId || typeof hederaAccountId !== 'string' || !/^\d+\.\d+\.\d+$/.test(hederaAccountId)) {
      return res.status(400).json({ message: "Invalid or missing Hedera Account ID." });
    }
    if (score == null || typeof score !== 'number' || score <= 0) {
      return res.status(400).json({ message: "Invalid or missing score, or score is not positive." });
    }

    const treasuryAccountIdString = TREASURY_ACCOUNT_ID;
    const treasuryPrivateKeyString = TREASURY_PRIVATE_KEY;
    const hederaNetwork = process.env.HEDERA_NETWORK || "testnet"; // Default to testnet

    if (!treasuryAccountIdString || !treasuryPrivateKeyString) {
      console.error("Treasury account ID or private key is not configured in environment variables.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    let client;
    try {
      const treasuryAccountId = AccountId.fromString(treasuryAccountIdString);
      const treasuryPrivateKey = PrivateKey.fromStringED25519(treasuryPrivateKeyString);

      if (hederaNetwork === "mainnet") {
        client = Client.forMainnet();
      } else if (hederaNetwork === "previewnet") {
        client = Client.forPreviewnet();
      } else {
        client = Client.forTestnet(); // Default
      }
      client.setOperator(treasuryAccountId, treasuryPrivateKey);
      // Consider setting max transaction fee if needed, e.g., client.setDefaultMaxTransactionFee(new Hbar(100));

      const recipientAccountId = AccountId.fromString(hederaAccountId);
      const amountToTransferBase = Math.floor(score); // Ensure it's an integer
      const amountToTransfer = amountToTransferBase * (10 ** tokenDecimals); // Adjust for dynamically fetched decimals

      // Create the token airdrop transaction
      // The amount is the smallest unit of the token.
      // If your token has decimals, ensure the 'score' reflects this or adjust here.
      // E.g., if score is 10 and token has 2 decimals, Hedera expects 1000.
      // For this example, we assume 'score' is already in the token's smallest unit.
      const transaction = new TokenAirdropTransaction()
        .addTokenTransfer(TOKEN_ID, treasuryAccountId, -amountToTransfer) // Sender (negative amount)
        .addTokenTransfer(TOKEN_ID, recipientAccountId, amountToTransfer); // Receiver (positive amount)

      // Freeze the transaction for signing
      const frozenTransaction = await transaction.freezeWith(client);

      // Sign with the sender account key
      const signedTransaction = await frozenTransaction.sign(treasuryPrivateKey);

      // Submit the transaction to a Hedera network
      const txResponse = await signedTransaction.execute(client);

      // Request the receipt of the transaction
      const receipt = await txResponse.getReceipt(client);

      // Get the transaction consensus status
      const transactionStatus = receipt.status;

      if (transactionStatus === Status.Success) {
        return res.status(200).json({
          message: `Successfully airdropped ${amountToTransferBase} tokens!`,
          transactionId: txResponse.transactionId.toString()
        });
      } else {
        console.error("Hedera transaction failed:", transactionStatus.toString(), receipt);
        return res.status(500).json({ message: `Token airdrop failed. Status: ${transactionStatus.toString()}` });
      }

    } catch (error: any) {
      console.error("Error processing token claim:", error);
      // Check for specific Hedera SDK errors if needed for more granular messages
      if (error.message && error.message.includes("Invalid account ID")) {
        return res.status(400).json({ message: "Invalid Hedera Account ID format provided for treasury or recipient." });
      }
      return res.status(500).json({ message: "An error occurred while processing your request." });
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (err) {
          console.error("Error closing Hedera client:", err);
        }
      }
    }
  });

  // put other application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
