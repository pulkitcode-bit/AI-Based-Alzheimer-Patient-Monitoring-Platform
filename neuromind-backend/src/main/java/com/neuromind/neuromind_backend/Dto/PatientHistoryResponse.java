package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientHistoryResponse {
    private List<GameSessionDto> recentSessions;
    private List<Map<String, Object>> scoreHistory;
    private List<GameDistributionDto> gameDistribution;
}
