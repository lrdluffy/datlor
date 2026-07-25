package com.strawhats.identity.service.impl;

import com.strawhats.identity.config.JwtProperties;
import com.strawhats.identity.dto.request.LoginRequest;
import com.strawhats.identity.dto.request.RegisterRequest;
import com.strawhats.identity.dto.response.AuthResponse;
import com.strawhats.identity.entity.Profile;
import com.strawhats.identity.entity.RefreshToken;
import com.strawhats.identity.entity.User;
import com.strawhats.identity.exception.EmailAlreadyExistsException;
import com.strawhats.identity.exception.InvalidCredentialsException;
import com.strawhats.identity.exception.InvalidTokenException;
import com.strawhats.identity.mapper.UserMapper;
import com.strawhats.identity.repository.ProfileRepository;
import com.strawhats.identity.repository.RefreshTokenRepository;
import com.strawhats.identity.repository.UserRepository;
import com.strawhats.identity.security.JwtTokenProvider;
import com.strawhats.identity.service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;

    public AuthServiceImpl(UserRepository userRepository,
                            ProfileRepository profileRepository,
                            RefreshTokenRepository refreshTokenRepository,
                            PasswordEncoder passwordEncoder,
                            JwtTokenProvider jwtTokenProvider,
                            JwtProperties jwtProperties,
                            UserMapper userMapper) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
        this.userMapper = userMapper;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new EmailAlreadyExistsException(normalizedEmail);
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
        user = userRepository.save(user);

        String displayName = (request.displayName() == null || request.displayName().isBlank())
                ? normalizedEmail.split("@")[0]
                : request.displayName().trim();

        Profile profile = Profile.builder()
                .user(user)
                .displayName(displayName)
                .allowDirectGroupAdd(true)
                .build();
        profile = profileRepository.save(profile);

        return issueTokenPair(user, profile);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        Profile profile = profileRepository.findByUserId(user.getId()).orElse(null);

        return issueTokenPair(user, profile);
    }

    @Override
    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        if (!jwtTokenProvider.isValid(rawRefreshToken)
                || !JwtTokenProvider.TOKEN_TYPE_REFRESH.equals(jwtTokenProvider.getTokenType(rawRefreshToken))) {
            throw new InvalidTokenException("Invalid or expired refresh token");
        }

        String tokenHash = JwtTokenProvider.hash(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new InvalidTokenException("Refresh token is unknown or was already revoked"));

        if (stored.isRevoked()) {
            throw new InvalidTokenException("Refresh token has been revoked");
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now(ZoneOffset.UTC))) {
            throw new InvalidTokenException("Refresh token has expired");
        }

        // Rotation: the old refresh token is single-use. Revoke it, then issue a brand-new pair.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        Profile profile = profileRepository.findByUserId(user.getId()).orElse(null);

        return issueTokenPair(user, profile);
    }

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        String tokenHash = JwtTokenProvider.hash(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(stored -> {
                    stored.setRevoked(true);
                    refreshTokenRepository.save(stored);
                });
    }

    private AuthResponse issueTokenPair(User user, Profile profile) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId());

        LocalDateTime expiresAt = LocalDateTime.ofInstant(
                Instant.now().plusMillis(jwtProperties.refreshTokenExpirationMs()), ZoneOffset.UTC);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(JwtTokenProvider.hash(refreshToken))
                .expiresAt(expiresAt)
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.of(
                accessToken,
                refreshToken,
                jwtTokenProvider.getAccessTokenExpirationSeconds(),
                userMapper.toUserResponse(user, profile)
        );
    }
}
