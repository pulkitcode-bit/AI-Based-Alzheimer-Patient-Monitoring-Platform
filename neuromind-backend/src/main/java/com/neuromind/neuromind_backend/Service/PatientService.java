package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.Dto.AuthResponse;
import com.neuromind.neuromind_backend.Dto.LoginRequest;
import com.neuromind.neuromind_backend.Dto.PatientRegisterRequest;
import com.neuromind.neuromind_backend.model.Patient;
import com.neuromind.neuromind_backend.repo.PatientRepo;
import com.neuromind.neuromind_backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.neuromind.neuromind_backend.Dto.ChangePasswordRequest;
import com.neuromind.neuromind_backend.Dto.UpdateProfileRequest;
import java.util.HashMap;
import java.util.Map;

@Service
public class PatientService {
    @Autowired
    private PatientRepo patientRepo;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    public AuthResponse register(PatientRegisterRequest request) {
        if (patientRepo.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        Patient patient=new Patient();
        patient.setName(request.getName());
        patient.setEmail(request.getEmail());
        patient.setPassword(passwordEncoder.encode(request.getPassword()));

        Patient savedPatient=patientRepo.save(patient);
        String token = jwtUtil.generateToken(savedPatient.getId(), "PATIENT");
        AuthResponse response=new AuthResponse();
        response.setToken(token);
        response.setMessage("Patient registered successfully");
        response.setPatientId(savedPatient.getId());
        response.setEmail(savedPatient.getEmail());

        return response;

    }

    public AuthResponse login(LoginRequest request) {
        System.out.println("DEBUG: Login attempt for email: " + request.getEmail());
        Patient patient = patientRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        if (!passwordEncoder.matches(request.getPassword(), patient.getPassword())) {
            System.out.println("DEBUG: Password mismatch for user: " + request.getEmail());
            throw new RuntimeException("Invalid password");
        }

        String token = jwtUtil.generateToken(patient.getId(), "PATIENT");

        AuthResponse response=new AuthResponse();
        response.setToken(token);
        response.setPatientId(patient.getId());
        response.setEmail(patient.getEmail());
        response.setMessage("Login successful");

        return response;
    }

    public Map<String, Object> getProfile(Long patientId) {
        Patient patient = patientRepo.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + patientId));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", patient.getId());
        profile.put("name", patient.getName());
        profile.put("email", patient.getEmail());
        profile.put("phone", patient.getPhone());
        profile.put("phoneNumber", patient.getPhone());
        profile.put("age", patient.getAge() != null ? patient.getAge() : 0);
        profile.put("diagnosis", patient.getDiagnosis() != null ? patient.getDiagnosis() : "Not specified");
        profile.put("status", patient.getStatus() != null ? patient.getStatus() : "active");
        profile.put("createdAt", patient.getCreatedAt() != null ? patient.getCreatedAt().toString() : null);
        return profile;
    }

    public Patient updateProfile(UpdateProfileRequest request) {
        Long id = request.getPatientId();
        if (id == null) {
            throw new RuntimeException("patientId is required for updating profile");
        }
        Patient patient = patientRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + id));

        String newName = request.getNameOrFullName();
        if (newName != null) {
            patient.setName(newName);
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            if (!patient.getEmail().equalsIgnoreCase(request.getEmail().trim())
                    && patientRepo.findByEmail(request.getEmail().trim()).isPresent()) {
                throw new RuntimeException("Email already in use by another account");
            }
            patient.setEmail(request.getEmail().trim());
        }
        String newPhone = request.getPhoneOrPhoneNumber();
        if (newPhone != null) {
            patient.setPhone(newPhone);
        }
        if (request.getAge() != null) {
            patient.setAge(request.getAge());
        }
        if (request.getDiagnosis() != null) {
            patient.setDiagnosis(request.getDiagnosis());
        }

        return patientRepo.save(patient);
    }

    public void changePassword(ChangePasswordRequest request) {
        Long id = request.getPatientId();
        if (id == null) {
            throw new RuntimeException("patientId is required");
        }
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
            throw new RuntimeException("Current password is required");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            throw new RuntimeException("New password is required");
        }

        Patient patient = patientRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + id));

        if (!passwordEncoder.matches(request.getCurrentPassword(), patient.getPassword())) {
            throw new IllegalArgumentException("Current password does not match");
        }

        patient.setPassword(passwordEncoder.encode(request.getNewPassword()));
        patientRepo.save(patient);
    }
}
