import { appendFileSync } from 'fs';

const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const OAUTH_BETA_VERSION = "oauth-2025-04-20";
const TOKEN_URL = "https://console.anthropic.com/v1/oauth/token";

interface TokenResponse {
    token_type: string;
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    organization: {
        uuid: string;
        name: string;
    };
    account: {
        uuid: string;
        email_address: string;
    };
}

interface TokenData {
    grant_type: string;
    refresh_token: string;
    client_id: string;
}

async function refreshToken(refreshToken: string): Promise<TokenResponse> {
    /**
     * Refresh access token using refresh token
     */
    const tokenData: TokenData = {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
    };

    const headers = {
        "Content-Type": "application/json",
        "anthropic-beta": OAUTH_BETA_VERSION,
        "User-Agent": "Claude-Code/1.0.31",
    };

    try {
        const response = await fetch(TOKEN_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(tokenData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json() as TokenResponse;
        return result;
    } catch (error) {
        throw new Error(`Token refresh error: ${error}`);
    }
}

function isTokenExpired(expire_at: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000); // Current Unix timestamp
    return currentTime >= expire_at;
}

function setGitHubEnv(name: string, value: string) {
    const envFile = process.env.GITHUB_ENV;
    if (envFile) {
        appendFileSync(envFile, `${name}=${value}\n`);
    }
}

function maskGitHubSecret(value: string) {
    console.log(`::add-mask::${value}`);
}

async function run() {
    const expiresAt = Number(process.env.CLAUDE_EXPIRES_AT);
    const refreshTokenValue = process.env.CLAUDE_REFRESH_TOKEN;
    const currentAccessToken = process.env.CLAUDE_ACCESS_TOKEN;

    if (!refreshTokenValue) {
        console.error("CLAUDE_REFRESH_TOKEN environment variable is not set");
        process.exit(1);
    }

    if (!currentAccessToken) {
        console.error("CLAUDE_ACCESS_TOKEN environment variable is not set");
        process.exit(1);
    }

    if (!expiresAt) {
        console.error("CLAUDE_EXPIRES_AT environment variable is not set");
        process.exit(1);
    }

    if (!isTokenExpired(expiresAt)) {
        console.log("Token is not expired, using existing tokens");

        maskGitHubSecret(currentAccessToken);
        maskGitHubSecret(refreshTokenValue);
        maskGitHubSecret(expiresAt.toString());

        // Set environment variables with current token values
        setGitHubEnv('UPDATED_CLAUDE_ACCESS_TOKEN', currentAccessToken);
        setGitHubEnv('UPDATED_CLAUDE_REFRESH_TOKEN', refreshTokenValue);
        setGitHubEnv('UPDATED_CLAUDE_EXPIRES_AT', expiresAt.toString());

        process.exit(0);
    }

    try {
        console.log("Token is expired, refreshing...");
        const result = await refreshToken(refreshTokenValue);

        // Calculate new expiration time
        const newExpiresAt = Math.floor(Date.now() / 1000) + result.expires_in;

        maskGitHubSecret(result.access_token);
        maskGitHubSecret(result.refresh_token);
        maskGitHubSecret(newExpiresAt.toString());

        // Set environment variables with new token values
        setGitHubEnv('UPDATED_CLAUDE_ACCESS_TOKEN', result.access_token);
        setGitHubEnv('UPDATED_CLAUDE_REFRESH_TOKEN', result.refresh_token);
        setGitHubEnv('UPDATED_CLAUDE_EXPIRES_AT', newExpiresAt.toString());

        console.log("Token refreshed successfully");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

if (import.meta.main) {
    run();
}