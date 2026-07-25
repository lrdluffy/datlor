package com.strawhats.core.repository;

import com.strawhats.core.entity.SearchOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchOutboxRepository extends JpaRepository<SearchOutbox, Long> {
}
