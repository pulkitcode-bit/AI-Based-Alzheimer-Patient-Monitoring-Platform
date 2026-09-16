package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Dto.ReminderRequest;
import com.neuromind.neuromind_backend.model.Doctor;
import com.neuromind.neuromind_backend.model.Patient;
import com.neuromind.neuromind_backend.model.Reminder;
import com.neuromind.neuromind_backend.repo.DoctorRepo;
import com.neuromind.neuromind_backend.repo.PatientRepo;
import com.neuromind.neuromind_backend.repo.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReminderController {
    private static final Logger log = LoggerFactory.getLogger(ReminderController.class);
    private final ReminderRepository reminderRepository;
    private final DoctorRepo doctorRepo;
    private final PatientRepo patientRepo;

    @PostMapping({"/reminders", "/doctor/reminder"})
    public ResponseEntity<?> sendReminder(@RequestBody ReminderRequest request) {
        try {
            if (request.getPatientId() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "patientId is required"));
            }
            if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Message cannot be empty"));
            }

            Reminder reminder = Reminder.builder()
                    .patientId(request.getPatientId())
                    .doctorId(request.getDoctorId())
                    .message(request.getMessage().trim())
                    .build();

            Reminder saved = reminderRepository.save(reminder);
            log.info("Reminder sent successfully to patientId {}: {}", request.getPatientId(), saved.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Reminder sent successfully");
            response.put("reminder", saved);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error sending reminder", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/reminders/patient/{patientId}")
    public ResponseEntity<?> getPatientReminders(@PathVariable("patientId") Long patientId) {
        try {
            List<Reminder> reminders = reminderRepository.findByPatientIdOrderBySentAtDesc(patientId);
            
            // Resolve patient doctor name as fallback
            String defaultDoctorName = null;
            Optional<Patient> patientOpt = patientRepo.findById(patientId);
            if (patientOpt.isPresent() && patientOpt.get().getDoctor() != null) {
                defaultDoctorName = "Dr. " + patientOpt.get().getDoctor().getFullName();
            }

            List<Map<String, Object>> responseList = new ArrayList<>();
            for (Reminder rem : reminders) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", rem.getId());
                map.put("patientId", rem.getPatientId());
                map.put("doctorId", rem.getDoctorId());
                map.put("message", rem.getMessage());
                map.put("sentAt", rem.getSentAt());
                map.put("isRead", rem.isRead());

                String doctorName = defaultDoctorName;
                if (rem.getDoctorId() != null) {
                    Optional<Doctor> docOpt = doctorRepo.findById(rem.getDoctorId());
                    if (docOpt.isPresent()) {
                        doctorName = "Dr. " + docOpt.get().getFullName();
                    }
                }
                if (doctorName == null) {
                    doctorName = "Doctor";
                }
                map.put("doctorName", doctorName);

                responseList.add(map);
            }

            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("Error fetching patient reminders", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/reminders/patient/{patientId}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable("patientId") Long patientId) {
        try {
            long count = reminderRepository.countByPatientIdAndIsReadFalse(patientId);
            Map<String, Object> response = new HashMap<>();
            response.put("unreadCount", count);
            response.put("count", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching unread count", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/reminders/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable("id") Long id) {
        try {
            var reminderOpt = reminderRepository.findById(id);
            if (reminderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            Reminder reminder = reminderOpt.get();
            reminder.setRead(true);
            reminderRepository.save(reminder);
            return ResponseEntity.ok(Map.of("message", "Reminder marked as read"));
        } catch (Exception e) {
            log.error("Error marking reminder as read", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/reminders/patient/{patientId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable("patientId") Long patientId) {
        try {
            List<Reminder> unreadList = reminderRepository.findByPatientIdAndIsReadFalse(patientId);
            for (Reminder rem : unreadList) {
                rem.setRead(true);
            }
            reminderRepository.saveAll(unreadList);
            return ResponseEntity.ok(Map.of("message", "All reminders marked as read", "updatedCount", unreadList.size()));
        } catch (Exception e) {
            log.error("Error marking all reminders as read", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/reminders/{id}")
    public ResponseEntity<?> deleteReminder(@PathVariable("id") Long id) {
        try {
            if (!reminderRepository.existsById(id)) {
                return ResponseEntity.notFound().build();
            }
            reminderRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Reminder deleted successfully"));
        } catch (Exception e) {
            log.error("Error deleting reminder", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
