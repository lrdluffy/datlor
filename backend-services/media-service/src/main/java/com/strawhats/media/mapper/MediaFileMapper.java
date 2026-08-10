package com.strawhats.media.mapper;

import com.strawhats.media.dto.response.MediaFileResponse;
import com.strawhats.media.entity.MediaFile;
import org.springframework.stereotype.Component;

@Component
public class MediaFileMapper {

    public MediaFileResponse toResponse(MediaFile mediaFile) {
        return new MediaFileResponse(
                mediaFile.getId(),
                mediaFile.getUploaderId(),
                mediaFile.getFileUrl(),
                mediaFile.getFileType(),
                mediaFile.getSize(),
                mediaFile.getCreatedAt()
        );
    }
}
