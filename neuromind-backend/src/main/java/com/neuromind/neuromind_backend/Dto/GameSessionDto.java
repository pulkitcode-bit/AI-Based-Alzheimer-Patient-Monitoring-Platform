package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSessionDto {
    private Long id;
    private String gameType;
    private Integer score;
    private Integer time;
    private LocalDateTime date;
}
