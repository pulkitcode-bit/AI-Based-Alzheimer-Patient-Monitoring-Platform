package com.neuromind.neuromind_backend.Dto;


import lombok.Builder;
import lombok.Data;

@Data

@Builder
public class AuthResponse {
    private String token;
    private Long doctorId;
    private Long patientId;
    private String email;
    private String message;
    public AuthResponse() {
    }
    public AuthResponse(String token, Long doctorId, Long patientId, String email, String message) {
        this.token = token;
        this.doctorId = doctorId;
        this.patientId = patientId;
        this.email = email;
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public Long getPatientId() {
        return patientId;
    }

    public void setPatientId(Long patientId) {
        this.patientId = patientId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
