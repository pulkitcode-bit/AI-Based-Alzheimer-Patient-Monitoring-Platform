package com.neuromind.neuromind_backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Data
@Table(name = "activities")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Activity {

    @Id
    @Column(name = "activity_id", nullable = false, length = 20)
    private String activityId;

    @Column(name = "activity_name", nullable = false)
    private String activityName;

    @Column(nullable = false)
    private String category;

    @Column(name = "difficulty_level", nullable = false)
    private String difficultyLevel;

    @Column(name = "base_score", nullable = false)
    private Integer baseScore;

    @Column(name = "expected_time_sec", nullable = false)
    private Integer expectedTimeSec;

    @Column(name = "target_skill", nullable = false)
    private String targetSkill;

    @Column(name = "success_threshold", nullable = false)
    private Integer successThreshold;

    @Column(name = "accuracy_weight", nullable = false, precision = 3, scale = 2)
    private BigDecimal accuracyWeight;

    @Column(name = "speed_weight", nullable = false, precision = 3, scale = 2)
    private BigDecimal speedWeight;

    @Column(name = "consistency_weight", nullable = false, precision = 3, scale = 2)
    private BigDecimal consistencyWeight;
}
