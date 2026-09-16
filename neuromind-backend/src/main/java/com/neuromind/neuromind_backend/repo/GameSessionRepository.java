package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameSessionRepository extends JpaRepository<GameSession, Long> {

    List<GameSession> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<GameSession> findByPatientIdIn(List<Long> patientIds);

    List<GameSession> findByActivityIdOrderByCreatedAtDesc(String activityId);
}
