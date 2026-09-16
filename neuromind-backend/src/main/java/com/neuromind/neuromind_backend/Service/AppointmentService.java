package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.Dto.AppointmentRequest;
import com.neuromind.neuromind_backend.model.Appointment;
import com.neuromind.neuromind_backend.repo.AppointmentRepo;
import com.neuromind.neuromind_backend.repo.DoctorRepo;
import com.neuromind.neuromind_backend.repo.PatientRepo;
import com.neuromind.neuromind_backend.model.Doctor;
import com.neuromind.neuromind_backend.model.Patient;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepo appointmentRepo;
    private final DoctorRepo doctorRepo;
    private final PatientRepo patientRepo;

    public Appointment bookAppointment(AppointmentRequest request) {
        Long docId = request.getDoctorId() != null ? request.getDoctorId() : 1L;
        Doctor doctor = doctorRepo.findById(docId).orElse(null);
        String docName = doctor != null ? doctor.getFullName() : "Your Doctor";

        Patient patient = patientRepo.findById(request.getPatientId()).orElse(null);
        String patientName = patient != null ? patient.getName() : "Patient #" + request.getPatientId();

        Appointment appointment = Appointment.builder()
                .patientId(request.getPatientId())
                .patientName(patientName)
                .doctorId(docId)
                .doctorName(docName)
                .date(request.getDate())
                .time(request.getTime())
                .type(request.getType())
                .notes(request.getNotes())
                .status("pending")
                .build();

        return appointmentRepo.save(appointment);

    }

    public List<Appointment> getPatientAppointments(Long patientId) {
        return appointmentRepo.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    public List<Appointment> getDoctorAppointments(Long doctorId) {
        return appointmentRepo.findByDoctorIdOrderByCreatedAtDesc(doctorId);
    }

    public Appointment updateAppointmentStatus(Long id, String status) {
        Appointment appointment = appointmentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));
        appointment.setStatus(status);
        return appointmentRepo.save(appointment);
    }

    public void cancelAppointment(Long appointmentId) {
        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));
        appointmentRepo.delete(appointment);
    }

}
