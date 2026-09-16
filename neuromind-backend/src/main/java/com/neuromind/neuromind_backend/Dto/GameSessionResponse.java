package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSessionResponse {

    private Long sessionId;
    private Long patientId;
    private String activityId;
    private String activityName;
    private BigDecimal finalScore;
    private BigDecimal accuracy;
    private BigDecimal speed;
    private BigDecimal consistency;
    private Integer timeTaken;
    private Integer rawScore;
    private LocalDateTime createdAt;
}
