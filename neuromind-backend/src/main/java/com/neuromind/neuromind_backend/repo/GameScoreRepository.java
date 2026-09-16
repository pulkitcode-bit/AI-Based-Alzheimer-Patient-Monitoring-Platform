package com.neuromind.neuromind_backend.repo;

import com.neuromind.neuromind_backend.model.GameScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GameScoreRepository extends JpaRepository<GameScore,Long> {
    List<GameScore> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    List<GameScore> findByPatientIdIn(List<Long> patientIds);

    @Query("SELECT AVG(g.score) FROM GameScore g WHERE g.patientId = ?1")
    Double getAverageScore(Long patientId);

    @Query("SELECT COUNT(g) FROM GameScore g WHERE g.patientId = ?1")
    Long getTotalGamesPlayed(Long patientId);

}
