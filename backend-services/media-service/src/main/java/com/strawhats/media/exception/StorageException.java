package com.strawhats.media.exception;

/** Thrown when the (simulated) storage backend fails to write or read a file. */
public class StorageException extends RuntimeException {
    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }

    public StorageException(String message) {
        super(message);
    }
}
