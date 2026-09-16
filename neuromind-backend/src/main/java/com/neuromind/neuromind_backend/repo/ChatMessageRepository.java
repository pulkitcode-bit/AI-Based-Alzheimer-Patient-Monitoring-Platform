package com.neuromind.neuromind_backend.repo;

import java.util.List;
import com.neuromind.neuromind_backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /** Chronological order — this is what a conversation history should render in. */
    List<ChatMessage> findByPatientIdOrderByCreatedAtAsc(Long patientId);
}
