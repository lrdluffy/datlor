package com.strawhats.identity.service;

import com.strawhats.identity.dto.request.LoginRequest;
import com.strawhats.identity.dto.request.RegisterRequest;
import com.strawhats.identity.dto.response.AuthResponse;

public interface AuthService {

    /** US-01: create a new user + profile and return a fresh token pair. */
    AuthResponse register(RegisterRequest request);

    /** US-02: authenticate an existing user and return a fresh token pair. */
    AuthResponse login(LoginRequest request);

    /** Exchange a valid, non-revoked refresh token for a new access/refresh pair (rotation). */
    AuthResponse refresh(String rawRefreshToken);

    /** Revoke a refresh token (logout on this device). Idempotent. */
    void logout(String rawRefreshToken);
}
