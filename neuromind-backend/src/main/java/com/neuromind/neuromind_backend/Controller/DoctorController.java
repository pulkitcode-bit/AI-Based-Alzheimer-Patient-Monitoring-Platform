package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Dto.AddPatientRequest;
import com.neuromind.neuromind_backend.Dto.CreatePatientRequest;
import com.neuromind.neuromind_backend.Dto.CreatePatientResponse;
import com.neuromind.neuromind_backend.Service.DoctorService;
import com.neuromind.neuromind_backend.Service.PatientProgressService;
import com.neuromind.neuromind_backend.model.Patient;
import com.neuromind.neuromind_backend.repo.GameScoreRepository;
import com.neuromind.neuromind_backend.repo.PatientRepo;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctor")
public class DoctorController {
    private static final Logger log = LoggerFactory.getLogger(DoctorController.class);

    private final DoctorService doctorService;
    private final PatientRepo patientRepo;
    private final GameScoreRepository gameScoreRepository;
    private final PatientProgressService patientProgressService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    public DoctorController(DoctorService doctorService, PatientRepo patientRepo,
            GameScoreRepository gameScoreRepository, PatientProgressService patientProgressService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.doctorService = doctorService;
        this.patientRepo = patientRepo;
        this.gameScoreRepository = gameScoreRepository;
        this.patientProgressService = patientProgressService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getDoctorProfile(@RequestParam("doctorId") Long doctorId) {
        try {
            var profile = doctorService.getProfile(doctorId);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Error fetching doctor profile", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateDoctorProfile(@RequestBody com.neuromind.neuromind_backend.Dto.UpdateProfileRequest request) {
        try {
            var updatedDoctor = doctorService.updateProfile(request);
            var profile = doctorService.getProfile(updatedDoctor.getId());
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Error updating doctor profile", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changeDoctorPassword(@RequestBody com.neuromind.neuromind_backend.Dto.ChangePasswordRequest request) {
        try {
            doctorService.changePassword(request);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password updated successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Password mismatch for doctor change-password: {}", e.getMessage());
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            log.error("Error changing doctor password", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/patients")
    public ResponseEntity<?> getDoctorPatients(@RequestParam("doctorId") Long doctorId) {
        try {
            log.info("Fetching patients for doctorId: {}", doctorId);
            var patients = patientRepo.findByDoctorId(doctorId);
            Map<String, Object> result = new HashMap<>();
            result.put("patients", patients);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error fetching doctor patients", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(
            @RequestParam("doctorId") Long doctorId,
            @RequestParam(value = "days", defaultValue = "30") int days) {
        try {
            log.info("Calculating analytics for doctorId: {} over {} days", doctorId, days);
            var patients = patientRepo.findByDoctorId(doctorId);

            // Everything below used to run patientProgressService.getPatientStats()
            // twice per patient (once for avg score, once for game count), each
            // call doing its own 3-query fetch — up to 6N DB round trips for N
            // patients, on top of a further separate batched fetch for the charts.
            // getDoctorChartData now computes all of it from one batched fetch.
            List<Long> patientIds = patients.stream().map(Patient::getId).collect(java.util.stream.Collectors.toList());
            Map<String, Object> chartData = patientProgressService.getDoctorChartData(patientIds, days);
            double improvementTrend = ((Number) chartData.get("improvementTrend")).doubleValue();
            double totalAvgScore = ((Number) chartData.get("avgScoreAcrossPatients")).doubleValue();
            double avgGamesPlayed = ((Number) chartData.get("avgGamesPlayedPerPatient")).doubleValue();
            double avgCompletion = Math.min(100, (avgGamesPlayed / 10.0) * 100);

            Map<String, Object> result = new HashMap<>();
            result.put("totalPatients", patients.size());
            result.put("activeUsers", patients.size());
            result.put("averageScore", Math.round(totalAvgScore * 10.0) / 10.0);
            result.put("avgCompletion", Math.round(avgCompletion * 10.0) / 10.0);
            result.put("improvementTrend", improvementTrend);
            // avgImprovement is the same figure under the name the doctor
            // dashboard's stat tile reads — kept so that page doesn't need to
            // change alongside this one.
            result.put("avgImprovement", improvementTrend);
            result.put("gameCompletionData", chartData.get("gameCompletionData"));
            result.put("scoreProgressData", chartData.get("scoreProgressData"));
            result.put("gameTypeData", chartData.get("gameTypeData"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error calculating analytics", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/analytics/alerts")
    public ResponseEntity<?> getDeclineAlerts(@RequestParam("doctorId") Long doctorId) {
        try {
            var patients = patientRepo.findByDoctorId(doctorId);
            Map<Long, String> nameById = patients.stream()
                    .collect(java.util.stream.Collectors.toMap(Patient::getId, Patient::getName));
            List<Long> patientIds = patients.stream().map(Patient::getId).collect(java.util.stream.Collectors.toList());

            List<Map<String, Object>> alerts = patientProgressService.getDeclineAlerts(patientIds);
            for (Map<String, Object> alert : alerts) {
                alert.put("patientName", nameById.getOrDefault(alert.get("patientId"), "Patient"));
            }
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            log.error("Error computing decline alerts", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/analytics/inactive")
    public ResponseEntity<?> getInactivePatients(
            @RequestParam("doctorId") Long doctorId,
            @RequestParam(value = "minDays", defaultValue = "3") int minDays) {
        try {
            var patients = patientRepo.findByDoctorId(doctorId);
            Map<Long, String> nameById = patients.stream()
                    .collect(java.util.stream.Collectors.toMap(Patient::getId, Patient::getName));
            List<Long> patientIds = patients.stream().map(Patient::getId).collect(java.util.stream.Collectors.toList());

            List<Map<String, Object>> inactive = patientProgressService.getInactivePatients(patientIds, minDays);
            for (Map<String, Object> entry : inactive) {
                entry.put("patientName", nameById.getOrDefault(entry.get("patientId"), "Patient"));
            }
            return ResponseEntity.ok(inactive);
        } catch (Exception e) {
            log.error("Error computing inactive patients", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/patient/{id}")
    public ResponseEntity<?> getPatientDetails(@PathVariable("id") Long id) {
        try {
            var patient = patientRepo.findById(id).orElseThrow(() -> new RuntimeException("Patient not found"));
            var stats = patientProgressService.getPatientStats(id);
            var avgScore = stats.getAverageScore();
            var totalGames = stats.getTotalGames();

            // Reuses the same week-over-week trend computation the doctor-wide
            // analytics endpoint uses, just scoped to this one patient — this
            // used to be a hardcoded "8" regardless of the patient's actual data.
            Map<String, Object> chartData = patientProgressService.getDoctorChartData(List.of(id), 30);
            double improvementTrend = ((Number) chartData.get("improvementTrend")).doubleValue();

            Map<String, Object> result = new HashMap<>();
            result.put("id", patient.getId());
            result.put("name", patient.getName());
            result.put("email", patient.getEmail());
            result.put("age", patient.getAge() != null ? patient.getAge() : 0);
            result.put("diagnosis", patient.getDiagnosis() != null ? patient.getDiagnosis() : "Not specified");
            result.put("status", patient.getStatus() != null ? patient.getStatus() : "active");
            result.put("createdAt", patient.getCreatedAt() != null ? patient.getCreatedAt().toString() : null);
            result.put("latestScore", avgScore != null ? avgScore : 0);
            result.put("totalGames", totalGames != null ? totalGames : 0);
            result.put("improvementTrend", improvementTrend);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error fetching patient details", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/patient")
    public ResponseEntity<?> addPatient(@RequestBody AddPatientRequest request) {
        try {
            if (request.getName() == null || request.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("{\"message\": \"Name is required\"}");
            }
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("{\"message\": \"Email is required\"}");
            }

            Patient newPatient = new Patient();
            newPatient.setName(request.getName());
            newPatient.setEmail(request.getEmail());
            String generatedPassword = "temp-password-123";
            newPatient.setPassword(passwordEncoder.encode(generatedPassword));

            Patient savedPatient = patientRepo.save(newPatient);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Patient added successfully");
            response.put("patient", savedPatient);
            response.put("patientId", savedPatient.getId());
            response.put("patientName", savedPatient.getName());
            response.put("email", savedPatient.getEmail());
            response.put("generatedPassword", generatedPassword);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error adding patient", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/patients/create")
    public ResponseEntity<CreatePatientResponse> createPatient(@Valid @RequestBody CreatePatientRequest request) {
        try {
            CreatePatientResponse response = doctorService.createPatient(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error creating patient", e);
            CreatePatientResponse errorResponse = CreatePatientResponse.builder()
                    .message(e.getMessage())
                    .build();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }
    }

    @Transactional
    @DeleteMapping("/patients/delete/{id}")
    public ResponseEntity<String> deletePatient(@PathVariable Long id) {
        try {
            patientRepo.deleteById(id);
            return ResponseEntity.ok("Patient deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting patient", e);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
    }

    @Transactional
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteDoctor(@PathVariable Long id) {
        try {
            doctorService.deleteDoctor(id);
            return ResponseEntity.ok("{\"message\": \"Doctor deleted successfully\"}");
        } catch (Exception e) {
            log.error("Error deleting doctor", e);
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }
}