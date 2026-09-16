package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Service.ScheduledReminderService;
import com.neuromind.neuromind_backend.model.ScheduledReminder;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduled-reminders")
@RequiredArgsConstructor
public class ScheduledReminderController {
    private static final Logger log = LoggerFactory.getLogger(ScheduledReminderController.class);
    private final ScheduledReminderService scheduledReminderService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
            String label = String.valueOf(body.get("label"));
            LocalTime time = LocalTime.parse(String.valueOf(body.get("time"))); // "HH:mm"
            String recurrence = body.getOrDefault("recurrence", "DAILY").toString();
            LocalDate date = body.get("date") != null ? LocalDate.parse(String.valueOf(body.get("date"))) : null;

            ScheduledReminder created = scheduledReminderService.create(patientId, label, time, recurrence, date);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.error("Error creating scheduled reminder", e);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam("patientId") Long patientId) {
        return ResponseEntity.ok(scheduledReminderService.list(patientId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deactivate(@PathVariable Long id, @RequestParam("patientId") Long patientId) {
        scheduledReminderService.deactivate(id, patientId);
        return ResponseEntity.ok(Map.of("message", "Reminder cancelled"));
    }
}
