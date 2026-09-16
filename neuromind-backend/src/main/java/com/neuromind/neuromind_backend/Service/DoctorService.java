package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.Dto.AuthResponse;
import com.neuromind.neuromind_backend.Dto.CreatePatientRequest;
import com.neuromind.neuromind_backend.Dto.CreatePatientResponse;
import com.neuromind.neuromind_backend.Dto.DoctorRegisterRequest;
import com.neuromind.neuromind_backend.Dto.LoginRequest;
import com.neuromind.neuromind_backend.model.Doctor;
import com.neuromind.neuromind_backend.model.Patient;
import com.neuromind.neuromind_backend.repo.DoctorRepo;
import com.neuromind.neuromind_backend.repo.PatientRepo;
import com.neuromind.neuromind_backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.neuromind.neuromind_backend.Dto.ChangePasswordRequest;
import com.neuromind.neuromind_backend.Dto.UpdateProfileRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.security.SecureRandom;

@Service
public class DoctorService {
    @Autowired
    private DoctorRepo doctorRepo;
    @Autowired
    private PatientRepo patientRepo;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    public AuthResponse register(DoctorRegisterRequest request) {
        if (doctorRepo.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        Doctor doctor = new Doctor();

             doctor.setFullName(request.getFullName());
             doctor.setEmail(request.getEmail());
        doctor.setPhoneNumber(request.getPhoneNumber());
        doctor.setHospitalName(request.getHospitalName());
        doctor.setSpecialization(request.getSpecialization());
        doctor.setYearsOfExperience(request.getYearsOfExperience());
        doctor.setPassword(passwordEncoder.encode(request.getPassword()));


        Doctor savedDoctor = doctorRepo.save(doctor);
        AuthResponse response = new AuthResponse();
        response.setDoctorId(savedDoctor.getId());
        response.setEmail(savedDoctor.getEmail());
        response.setMessage("Doctor registered successfully");

        return response;
    }

    public AuthResponse login(LoginRequest request) {
        Doctor doctor = doctorRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        if (!passwordEncoder.matches(request.getPassword(), doctor.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        String token = jwtUtil.generateToken(doctor.getId(), "DOCTOR");

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setDoctorId(doctor.getId());
        response.setEmail(doctor.getEmail());
        response.setMessage("Login successful");

        return response;
    }

    public Map<String, Object> getProfile(Long doctorId) {
        Doctor doctor = doctorRepo.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + doctorId));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", doctor.getId());
        profile.put("name", doctor.getFullName());
        profile.put("fullName", doctor.getFullName());
        profile.put("email", doctor.getEmail());
        profile.put("phone", doctor.getPhoneNumber());
        profile.put("phoneNumber", doctor.getPhoneNumber());
        profile.put("hospitalName", doctor.getHospitalName());
        profile.put("specialization", doctor.getSpecialization());
        profile.put("yearsOfExperience", doctor.getYearsOfExperience());
        return profile;
    }

    public Doctor updateProfile(UpdateProfileRequest request) {
        Long id = request.getDoctorId();
        if (id == null) {
            throw new RuntimeException("doctorId is required for updating profile");
        }
        Doctor doctor = doctorRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + id));

        String newName = request.getNameOrFullName();
        if (newName != null) {
            doctor.setFullName(newName);
        }
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            if (!doctor.getEmail().equalsIgnoreCase(request.getEmail().trim())
                    && doctorRepo.findByEmail(request.getEmail().trim()).isPresent()) {
                throw new RuntimeException("Email already in use by another account");
            }
            doctor.setEmail(request.getEmail().trim());
        }
        String newPhone = request.getPhoneOrPhoneNumber();
        if (newPhone != null) {
            doctor.setPhoneNumber(newPhone);
        }

        return doctorRepo.save(doctor);
    }

    public void changePassword(ChangePasswordRequest request) {
        Long id = request.getDoctorId();
        if (id == null) {
            throw new RuntimeException("doctorId is required");
        }
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isEmpty()) {
            throw new RuntimeException("Current password is required");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isEmpty()) {
            throw new RuntimeException("New password is required");
        }

        Doctor doctor = doctorRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + id));

        if (!passwordEncoder.matches(request.getCurrentPassword(), doctor.getPassword())) {
            throw new IllegalArgumentException("Current password does not match");
        }

        doctor.setPassword(passwordEncoder.encode(request.getNewPassword()));
        doctorRepo.save(doctor);
    }

    public CreatePatientResponse createPatient(CreatePatientRequest request) {
        // Validate doctor exists
        Doctor doctor = doctorRepo.findById(request.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + request.getDoctorId()));

        // Check if patient email already taken
        if (patientRepo.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use: " + request.getEmail());
        }

        // Generate random 10-char alphanumeric password
        String rawPassword = generateRandomPassword(10);

        // Build and save patient
        Patient patient = Patient.builder()
                .name(request.getName())
                .email(request.getEmail())
                .age(request.getAge())
                .diagnosis(request.getDiagnosis())
                .password(passwordEncoder.encode(rawPassword))
                .doctor(doctor)
                .build();

        Patient saved = patientRepo.save(patient);

        return CreatePatientResponse.builder()
                .patientId(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .generatedPassword(rawPassword)
                .message("Patient created successfully")
                .build();
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteDoctor(Long id) {
        Doctor doctor = doctorRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Doctor not found with id: " + id));
        List<Patient> linkedPatients = patientRepo.findByDoctorId(id);
        for (Patient p : linkedPatients) {
            p.setDoctor(null);
            patientRepo.save(p);
        }
        doctorRepo.delete(doctor);
    }

    private String generateRandomPassword(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
