package com.strawhats.core.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** US-19: tuning knobs for ScheduledMessageDispatcher's polling job. */
@ConfigurationProperties(prefix = "scheduling.dispatcher")
public record SchedulingProperties(
        long fixedDelayMs,
        int batchSize
) {
}
