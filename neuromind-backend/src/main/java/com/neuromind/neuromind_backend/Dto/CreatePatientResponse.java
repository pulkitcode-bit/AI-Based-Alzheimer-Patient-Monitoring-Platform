package com.neuromind.neuromind_backend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePatientResponse {
    private Long patientId;
    private String name;
    private String email;
    private String generatedPassword;
    private String message;
}
