import { describe, expect, it } from "bun:test";
import { isTokenExpired } from "../src/oauth/token-refresh";

describe("OAuth Token Refresh", () => {
    describe("isTokenExpired", () => {
        it("should return false for valid token with buffer", () => {
            const now = Date.now();
            const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now
            expect(isTokenExpired(expiresAt)).toBe(false);
        });

        it("should return true for expired token", () => {
            const now = Date.now();
            const expiresAt = now - 1000; // 1 second ago
            expect(isTokenExpired(expiresAt)).toBe(true);
        });

        it("should return true for token expiring within buffer", () => {
            const now = Date.now();
            const expiresAt = now + 3 * 60 * 1000; // 3 minutes from now (within 5-minute buffer)
            expect(isTokenExpired(expiresAt)).toBe(true);
        });

        it("should return false exactly at buffer boundary", () => {
            const now = Date.now();
            const expiresAt = now + 6 * 60 * 1000; // 6 minutes from now (just outside buffer)
            expect(isTokenExpired(expiresAt)).toBe(false);
        });

        it("should handle edge case timestamps", () => {
            const now = Date.now();

            // Token expired exactly now
            expect(isTokenExpired(now)).toBe(true);

            // Token expires in exactly 5 minutes (should be considered expired due to buffer)
            const fiveMinutesFromNow = now + 5 * 60 * 1000;
            expect(isTokenExpired(fiveMinutesFromNow)).toBe(true);

            // Token expires in exactly 5 minutes and 1 second (should be valid)
            const justOverFiveMinutes = now + 5 * 60 * 1000 + 1000;
            expect(isTokenExpired(justOverFiveMinutes)).toBe(false);
        });
    });
});

// Additional test to verify the buffer time calculation
describe("Token expiration buffer logic", () => {
    it("should use correct buffer time of 5 minutes", () => {
        const now = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        // Token expiring exactly at buffer time should be considered expired
        const atBufferBoundary = now + bufferTime;
        expect(isTokenExpired(atBufferBoundary)).toBe(true);

        // Token expiring just after buffer time should be valid
        const justAfterBuffer = now + bufferTime + 1;
        expect(isTokenExpired(justAfterBuffer)).toBe(false);
    });
}); 