package com.neuromind.neuromind_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "game_sessions")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "activity_id", nullable = false, length = 20)
    private String activityId;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal accuracy;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal consistency;

    @Column(name = "time_taken", nullable = false)
    private Integer timeTaken;

    @Column(name = "raw_score", nullable = false)
    private Integer rawScore;

    @Column(name = "final_score", nullable = false, precision = 8, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
