# media-service (not yet implemented)

This microservice is out of scope for the current sprint. It will own the
`media_files` and `push_subscriptions` tables shown in the SD_PROJ ERD
(pages 16-18).

Planned responsibilities:
- Upload/download of attachments to MinIO (object storage key lives in
  `media_files.storage_key`)
- Web Push subscription management for notifications

It should follow the same layered structure as `identity-service` and
validate JWTs issued by identity-service rather than re-implementing
authentication.
