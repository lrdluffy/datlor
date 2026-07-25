package com.strawhats.core.config;

import com.strawhats.core.security.JwtChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    public WebSocketConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // The single WebSocket entry point required by the spec: /ws/connect.
        // SockJS wraps it with an HTTP fallback for browsers/proxies that block
        // raw WebSocket; native/mobile STOMP clients that don't use the SockJS
        // JS client can instead connect directly to /ws/connect/websocket,
        // which SockJS exposes as a plain WebSocket sub-path automatically.
        registry.addEndpoint("/ws/connect")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // Broadcast destinations: /topic/channels/{id} and /topic/channels/{id}/members.
        // /queue is used for the per-user error/reply channel (/user/queue/**).
        registry.enableSimpleBroker("/topic", "/queue");

        // Client-to-server destinations, e.g. SEND to /app/messages.send
        // is routed to @MessageMapping("/messages.send").
        registry.setApplicationDestinationPrefixes("/app");

        // Enables SimpMessagingTemplate#convertAndSendToUser(...) to resolve
        // "/user/queue/errors" to the right session via StompPrincipal#getName().
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Authenticates CONNECT frames and authorizes SUBSCRIBE frames -
        // see JwtChannelInterceptor for the full rationale.
        registration.interceptors(jwtChannelInterceptor);
    }
}
