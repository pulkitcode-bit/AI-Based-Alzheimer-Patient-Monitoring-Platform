package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameScoreRequest {
    private Long patientId;
    private String gameType;
    private Integer score;
    private Integer moves;
    private Integer time;
    private Integer level;
}