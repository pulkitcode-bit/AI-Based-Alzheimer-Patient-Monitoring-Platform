package com.neuromind.neuromind_backend.Dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameSessionRequest {

    @NotNull
    private Long patientId;

    @NotBlank
    private String activityId;

    @NotNull
    private Integer rawScore;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal accuracy;

    @NotNull
    @Min(1)
    private Integer timeTaken;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private BigDecimal consistency;
}
