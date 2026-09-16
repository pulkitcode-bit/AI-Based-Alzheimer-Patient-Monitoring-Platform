package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Dto.AuthResponse;
import com.neuromind.neuromind_backend.Dto.LoginRequest;
import com.neuromind.neuromind_backend.Dto.PatientRegisterRequest;
import com.neuromind.neuromind_backend.Service.PatientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/patient")

public class PatientAuthController {
    private final PatientService patientService;
    public PatientAuthController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody PatientRegisterRequest request) {
        try {
            AuthResponse response = patientService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            AuthResponse response = new AuthResponse();
            response.setMessage(e.getMessage());

            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(response);
        }
    }
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = patientService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            AuthResponse response=new AuthResponse();
            response.setMessage(e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }
    }


}
