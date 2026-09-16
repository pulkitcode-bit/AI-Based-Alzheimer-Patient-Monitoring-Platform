package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.repo.GameScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
public class PatientController {
    private final GameScoreRepository gameScoreRepository;
    private final com.neuromind.neuromind_backend.repo.DoctorRepo doctorRepo;
    private final com.neuromind.neuromind_backend.repo.PatientRepo patientRepo;
    private final com.neuromind.neuromind_backend.Service.PatientProgressService patientProgressService;
    private final com.neuromind.neuromind_backend.Service.PatientService patientService;

    @GetMapping("/profile")
    public ResponseEntity<?> getPatientProfile(@RequestParam("patientId") Long patientId) {
        try {
            var profile = patientService.getProfile(patientId);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updatePatientProfile(@RequestBody com.neuromind.neuromind_backend.Dto.UpdateProfileRequest request) {
        try {
            var updatedPatient = patientService.updateProfile(request);
            var profile = patientService.getProfile(updatedPatient.getId());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePatientPassword(@RequestBody com.neuromind.neuromind_backend.Dto.ChangePasswordRequest request) {
        try {
            patientService.changePassword(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password updated successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }


    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestParam("patientId") Long patientId) {
        try {
            return ResponseEntity.ok(patientProgressService.getPatientHistory(patientId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@RequestParam("patientId") Long patientId) {
        try {
            return ResponseEntity.ok(patientProgressService.getPatientStats(patientId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    /** Average score per cognitive domain — powers the progress page's domain chart. */
    @GetMapping("/domain-scores")
    public ResponseEntity<?> getDomainScores(@RequestParam("patientId") Long patientId) {
        try {
            return ResponseEntity.ok(patientProgressService.getDomainScores(patientId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/all-doctors")
    public ResponseEntity<?> getAllDoctors() {
        try {
            return ResponseEntity.ok(doctorRepo.findAll());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/doctors")
    public ResponseEntity<?> getDoctorsForPatient(@RequestParam("patientId") Long patientId) {
        try {
            var allDoctors = doctorRepo.findAll();
            var patientOpt = patientRepo.findById(patientId);

            if (patientOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("primaryDoctor", null);
                response.put("otherDoctors", allDoctors);
                return ResponseEntity.ok(response);
            }

            var patient = patientOpt.get();
            var primaryDoctor = patient.getDoctor();

            var otherDoctors = allDoctors.stream()
                .filter(d -> primaryDoctor == null || !d.getId().equals(primaryDoctor.getId()))
                .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("primaryDoctor", primaryDoctor);
            response.put("otherDoctors", otherDoctors);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/primary-doctor")
    public ResponseEntity<?> getPrimaryDoctor(@RequestParam("patientId") Long patientId) {
        try {
            var patientOpt = patientRepo.findById(patientId);
            if (patientOpt.isEmpty()) {
                return ResponseEntity.noContent().build();
            }
            var doctor = patientOpt.get().getDoctor();
            if (doctor == null) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(doctor);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PatientController.class);

    @PutMapping("/primary-doctor")
    public ResponseEntity<?> setPrimaryDoctor(@RequestBody Map<String, Object> request) {
        try {
            if (request == null || !request.containsKey("patientId") || !request.containsKey("doctorId")) {
                return ResponseEntity.badRequest().body("{\"message\": \"patientId and doctorId are required\"}");
            }
            Long patientId = Long.valueOf(request.get("patientId").toString());
            Long doctorId = Long.valueOf(request.get("doctorId").toString());
            
            log.info("Explicit request to reassign primary doctor for patientId={} to doctorId={}", patientId, doctorId);
            
            var patientOpt = patientRepo.findById(patientId);
            var doctorOpt = doctorRepo.findById(doctorId);
            
            if (patientOpt.isEmpty() || doctorOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"message\": \"Patient or Doctor not found\"}");
            }
            
            var patient = patientOpt.get();
            patient.setDoctor(doctorOpt.get());
            patientRepo.save(patient);
            
            return ResponseEntity.ok("{\"message\": \"Primary doctor updated successfully\"}");
        } catch (Exception e) {
            log.error("Error setting primary doctor", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }
}