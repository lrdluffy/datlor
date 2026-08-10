package com.strawhats.core.entity.enums;

/**
 * Kept generic on the `messages` table so the same table can carry
 * DM and GROUP messages without further schema migrations. This service
 * currently produces/consumes CHANNEL and GROUP messages (see
 * GroupMessageService); DM is reserved for a future slice.
 */
public enum ChatType {
    CHANNEL,
    GROUP,
    DM
}
