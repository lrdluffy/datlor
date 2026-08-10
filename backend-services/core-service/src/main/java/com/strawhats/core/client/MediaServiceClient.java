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
 * US-18: the ONLY sanctioned way core-service learns whether a mediaId is
 * real - it NEVER reads media-service's database directly (no cross-DB
 * FK, per the global architecture rule). Calls media-service's
 * /internal/media/{id}/exists, guarded by a shared API key rather than a
 * user JWT since the caller here is a service, not a user.
 */
@Component
public class MediaServiceClient {

    private record MediaExistsResponse(UUID id, boolean exists) {
    }

    private static final String API_KEY_HEADER = "X-Internal-Api-Key";

    private final RestTemplate restTemplate;
    private final ServiceUrlsProperties serviceUrlsProperties;
    private final InternalApiProperties internalApiProperties;

    public MediaServiceClient(RestTemplate restTemplate,
                               ServiceUrlsProperties serviceUrlsProperties,
                               InternalApiProperties internalApiProperties) {
        this.restTemplate = restTemplate;
        this.serviceUrlsProperties = serviceUrlsProperties;
        this.internalApiProperties = internalApiProperties;
    }

    public boolean mediaExists(UUID mediaId) {
        String url = serviceUrlsProperties.media().baseUrl() + "/internal/media/" + mediaId + "/exists";

        HttpHeaders headers = new HttpHeaders();
        headers.set(API_KEY_HEADER, internalApiProperties.key());

        try {
            var response = restTemplate.exchange(
                    url, HttpMethod.GET, new HttpEntity<>(headers), MediaExistsResponse.class);
            MediaExistsResponse body = response.getBody();
            return body != null && body.exists();
        } catch (RestClientException e) {
            throw new ServiceCommunicationException("Failed to reach media-service to validate mediaId " + mediaId, e);
        }
    }
}
