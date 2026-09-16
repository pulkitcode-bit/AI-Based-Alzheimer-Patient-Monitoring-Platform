package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Dto.AppointmentRequest;
import com.neuromind.neuromind_backend.Service.AppointmentService;
import com.neuromind.neuromind_backend.model.Appointment;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/appointment")
@RequiredArgsConstructor
@CrossOrigin("http://localhost:3000")
public class AppointmentController {
    private final AppointmentService appointmentService;

    @PostMapping("/book")
    public ResponseEntity<?> bookAppointment(@Valid @RequestBody AppointmentRequest request) {
        try {
            Appointment appointment = appointmentService.bookAppointment(request);
            return ResponseEntity.ok(appointment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<Appointment>> getPatientAppointments(@RequestParam Long patientId) {
        return ResponseEntity.ok(appointmentService.getPatientAppointments(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getDoctorAppointments(@PathVariable Long doctorId) {
        return ResponseEntity.ok(appointmentService.getDoctorAppointments(doctorId));
    }

    @PutMapping("/approve/{id}")
    public ResponseEntity<?> approveAppointment(@PathVariable Long id) {
        try {
            Appointment appointment = appointmentService.updateAppointmentStatus(id, "approved");
            return ResponseEntity.ok(appointment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PutMapping("/reject/{id}")
    public ResponseEntity<?> rejectAppointment(@PathVariable Long id) {
        try {
            Appointment appointment = appointmentService.updateAppointmentStatus(id, "rejected");
            return ResponseEntity.ok(appointment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancelAppointment(@RequestBody Map<String, Long> request) {
        try {
            Long appointmentId = request.get("appointmentId");
            appointmentService.cancelAppointment(appointmentId);
            return ResponseEntity.ok("{\"message\": \"Appointment cancelled\"}");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("{\"message\": \"" + e.getMessage() + "\"}");
        }
    }
}
