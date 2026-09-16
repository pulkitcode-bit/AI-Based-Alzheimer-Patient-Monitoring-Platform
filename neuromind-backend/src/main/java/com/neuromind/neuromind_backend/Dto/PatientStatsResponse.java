package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientStatsResponse {
    private Long totalGames;
    private Double averageScore;
    private Integer currentStreak;
}
