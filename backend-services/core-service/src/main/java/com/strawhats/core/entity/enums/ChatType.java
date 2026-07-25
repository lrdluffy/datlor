package com.strawhats.core.entity.enums;

/**
 * Kept generic on the `messages` table so the same table can carry
 * DM messages later without a schema migration. This service currently
 * only produces/consumes CHANNEL messages.
 */
public enum ChatType {
    CHANNEL,
    DM
}
