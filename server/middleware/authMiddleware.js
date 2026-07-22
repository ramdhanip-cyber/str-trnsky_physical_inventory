const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const TOKEN_FILE_PATH = "./temp/token.json"

// Function to check if token exists and is still valid
const getValidAccessToken = async () => {
    try {
        if (fs.existsSync(TOKEN_FILE_PATH)) {
            const fileContent = fs.readFileSync(TOKEN_FILE_PATH, "utf8");
            
            // Check if file is empty
            if (!fileContent || fileContent.trim() === '') {
                console.log("Token file is empty, fetching new token");
                return await fetchNewAccessToken();
            }
            
            const tokenData = JSON.parse(fileContent);
            
            // Validate token data structure
            if (!tokenData.access_token || !tokenData.expires_at) {
                console.log("Token file has invalid structure, fetching new token");
                return await fetchNewAccessToken();
            }
            
            if (tokenData.expires_at > Date.now()) {
                return tokenData.access_token;
            } else {
                console.log("Token expired, fetching new token");
            }
        } else {
            console.log("Token file does not exist, fetching new token");
        }
        
        return await fetchNewAccessToken();
    } catch (error) {
        console.error("Error reading token file:", error);
        // If there's an error reading the file, try to delete it and fetch a new token
        try {
            if (fs.existsSync(TOKEN_FILE_PATH)) {
                fs.unlinkSync(TOKEN_FILE_PATH);
                console.log("Deleted corrupted token file");
            }
        } catch (deleteError) {
            console.error("Error deleting corrupted token file:", deleteError);
        }
        return await fetchNewAccessToken();
    }
};

// Function to request a new access token
const fetchNewAccessToken = async () => {
    try {
        // Ensure temp directory exists
        const tempDir = path.dirname(TOKEN_FILE_PATH);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log("Created temp directory:", tempDir);
        }

        const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.OAUTH_CLIENT_ID,
            client_secret: process.env.OAUTH_CLIENT_SECRET,
        });
        const response = await fetch(process.env.OAUTH_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error("OAuth token HTTP error:", response.status, errText);
            throw new Error("Failed to get access token");
        }
        const tokenJson = await response.json();

        const tokenData = {
            access_token: tokenJson.access_token,
            expires_at: Date.now() + tokenJson.expires_in * 1000
        };

        // Write token data with proper error handling
        try {
            fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2));
            console.log("Successfully saved new token to file");
        } catch (writeError) {
            console.error("Error writing token file:", writeError);
            // Continue without saving to file, but return the token
        }

        return tokenData.access_token;
    } catch (error) {
        console.error("Error fetching OAuth token:", error);
        throw new Error("Failed to get access token");
    }
};

// Middleware function
const authMiddleware = async (req, res, next) => {
    try {
        // verifyToken(req, res, next);
        req.accessToken = await getValidAccessToken();
        next();
    } catch (error) {
        res.status(500).json({ error: "Authentication failed" });
    }
};

module.exports = { authMiddleware };