package com.strawhats.core.client;

import com.strawhats.core.config.InternalApiProperties;
import com.strawhats.core.config.ServiceUrlsProperties;
import com.strawhats.core.exception.ServiceCommunicationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/**
 * US-17: the ONLY sanctioned way core-service learns a user's privacy
 * preference - it NEVER reads identity-service's `profiles` table
 * directly (no cross-DB FK, per the global architecture rule). Calls
 * identity-service's /internal/profiles/{userId}/privacy, guarded by a
 * shared API key rather than a user JWT since the caller here is a
 * service, not a user.
 */
@Component
public class IdentityServiceClient {

    private record PrivacyProfileResponse(UUID userId, boolean allowDirectGroupAdd) {
    }

    private static final String API_KEY_HEADER = "X-Internal-Api-Key";

    private final RestTemplate restTemplate;
    private final ServiceUrlsProperties serviceUrlsProperties;
    private final InternalApiProperties internalApiProperties;

    public IdentityServiceClient(RestTemplate restTemplate,
                                  ServiceUrlsProperties serviceUrlsProperties,
                                  InternalApiProperties internalApiProperties) {
        this.restTemplate = restTemplate;
        this.serviceUrlsProperties = serviceUrlsProperties;
        this.internalApiProperties = internalApiProperties;
    }

    /** US-17: true if `userId` can be added to a group directly, without an invite. */
    public boolean allowsDirectGroupAdd(UUID userId) {
        String url = serviceUrlsProperties.identity().baseUrl() + "/internal/profiles/" + userId + "/privacy";

        HttpHeaders headers = new HttpHeaders();
        headers.set(API_KEY_HEADER, internalApiProperties.key());

        try {
            var response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), PrivacyProfileResponse.class);
            PrivacyProfileResponse body = response.getBody();
            return body != null && body.allowDirectGroupAdd();
        } catch (RestClientException e) {
            throw new ServiceCommunicationException(
                    "Failed to reach identity-service to check privacy settings for user " + userId, e);
        }
    }
}
