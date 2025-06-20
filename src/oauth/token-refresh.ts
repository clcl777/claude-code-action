import * as core from "@actions/core";
import fetch from "node-fetch";

export interface OAuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface RefreshTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
}

/**
 * Claude OAuth token refresh endpoint
 */
const CLAUDE_OAUTH_REFRESH_URL = "https://api.claude.ai/oauth/token";

/**
 * Check if the OAuth token is expired or will expire soon (within 5 minutes)
 * @param expiresAt - Token expiration timestamp in milliseconds
 * @returns true if token is expired or will expire soon
 */
export function isTokenExpired(expiresAt: number): boolean {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return now >= (expiresAt - bufferTime);
}

/**
 * Refresh the OAuth access token using the refresh token
 * @param refreshToken - The refresh token
 * @returns Promise with new token information
 */
export async function refreshOAuthToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
        const response = await fetch(CLAUDE_OAUTH_REFRESH_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Failed to refresh OAuth token: ${response.status} ${response.statusText} - ${errorText}`
            );
        }

        const data = await response.json() as RefreshTokenResponse;
        return data;
    } catch (error) {
        throw new Error(`OAuth token refresh failed: ${error}`);
    }
}

/**
 * Get valid OAuth tokens, refreshing if necessary
 * @param accessToken - Current access token
 * @param refreshToken - Refresh token
 * @param expiresAt - Current token expiration timestamp
 * @returns Promise with valid tokens
 */
export async function getValidOAuthTokens(
    accessToken: string,
    refreshToken: string,
    expiresAt: number
): Promise<OAuthTokens> {
    // Check if current token is still valid
    if (!isTokenExpired(expiresAt)) {
        console.log("OAuth token is still valid");
        return {
            accessToken,
            refreshToken,
            expiresAt,
        };
    }

    console.log("OAuth token expired or expiring soon, refreshing...");

    try {
        const refreshResponse = await refreshOAuthToken(refreshToken);

        // Calculate new expiration timestamp
        const newExpiresAt = Date.now() + (refreshResponse.expires_in * 1000);

        console.log("✅ OAuth token refreshed successfully");

        // Export the new tokens as environment variables for use in subsequent steps
        core.exportVariable("CLAUDE_ACCESS_TOKEN_REFRESHED", refreshResponse.access_token);
        core.exportVariable("CLAUDE_REFRESH_TOKEN_REFRESHED", refreshResponse.refresh_token);
        core.exportVariable("CLAUDE_EXPIRES_AT_REFRESHED", newExpiresAt.toString());

        return {
            accessToken: refreshResponse.access_token,
            refreshToken: refreshResponse.refresh_token,
            expiresAt: newExpiresAt,
        };
    } catch (error) {
        throw new Error(`Failed to refresh OAuth token: ${error}`);
    }
}

/**
 * Setup OAuth authentication with automatic token refresh
 * @returns Promise with valid OAuth tokens
 */
export async function setupOAuthWithRefresh(): Promise<OAuthTokens | null> {
    const useOAuth = core.getInput("use_oauth");

    if (useOAuth !== "true") {
        return null;
    }

    const accessToken = core.getInput("claude_access_token");
    const refreshToken = core.getInput("claude_refresh_token");
    const expiresAtStr = core.getInput("claude_expires_at");

    if (!accessToken || !refreshToken || !expiresAtStr) {
        throw new Error(
            "OAuth authentication requires claude_access_token, claude_refresh_token, and claude_expires_at inputs"
        );
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) {
        throw new Error("claude_expires_at must be a valid timestamp");
    }

    return await getValidOAuthTokens(accessToken, refreshToken, expiresAt);
} 