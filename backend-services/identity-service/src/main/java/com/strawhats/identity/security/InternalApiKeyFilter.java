package com.strawhats.identity.security;

import com.strawhats.identity.config.InternalApiProperties;
import com.strawhats.identity.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Guards /internal/** with a shared-secret header instead of a user JWT,
 * since the caller here is core-service itself (US-17 privacy check), not
 * an end user. Only applied to requests under /internal/** (see
 * SecurityConfig); everything else ignores this header entirely.
 */
@Component
public class InternalApiKeyFilter extends OncePerRequestFilter {

    private static final String API_KEY_HEADER = "X-Internal-Api-Key";

    private final InternalApiProperties internalApiProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InternalApiKeyFilter(InternalApiProperties internalApiProperties) {
        this.internalApiProperties = internalApiProperties;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedKey = request.getHeader(API_KEY_HEADER);
        if (providedKey == null || !providedKey.equals(internalApiProperties.key())) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ErrorResponse body = ErrorResponse.of(
                    HttpStatus.UNAUTHORIZED.value(), "Unauthorized",
                    "Missing or invalid internal API key", request.getRequestURI());
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }

        var authentication = new UsernamePasswordAuthenticationToken("core-service", null, List.of());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        filterChain.doFilter(request, response);
    }
}
