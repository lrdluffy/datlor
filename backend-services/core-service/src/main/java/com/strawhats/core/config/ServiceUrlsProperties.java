package com.strawhats.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Base URLs for the other datlor services core-service talks to over HTTP. */
@ConfigurationProperties(prefix = "services")
public record ServiceUrlsProperties(
        Identity identity,
        Media media
) {
    public record Identity(String baseUrl) {
    }

    public record Media(String baseUrl) {
    }
}
