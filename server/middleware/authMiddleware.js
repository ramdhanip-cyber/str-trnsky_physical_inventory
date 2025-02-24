const axios = require("axios");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { verifyToken } = require("../controllers/authController");

dotenv.config();

const TOKEN_FILE_PATH = "./temp/token.json"

// Function to check if token exists and is still valid
const getValidAccessToken = async () => {
    try {
        if (fs.existsSync(TOKEN_FILE_PATH)) {
            const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));
            if (tokenData.expires_at > Date.now()) {
                return tokenData.access_token;
            }
        }
        return await fetchNewAccessToken();
    } catch (error) {
        console.error("Error reading token file:", error);
        return await fetchNewAccessToken();
    }
};

// Function to request a new access token
const fetchNewAccessToken = async () => {
    try {
        const response = await axios.post(process.env.OAUTH_TOKEN_URL, new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.OAUTH_CLIENT_ID,
            client_secret: process.env.OAUTH_CLIENT_SECRET,
        }), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        const tokenData = {
            access_token: response.data.access_token,
            expires_at: Date.now() + response.data.expires_in * 1000
        };

        fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2));

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