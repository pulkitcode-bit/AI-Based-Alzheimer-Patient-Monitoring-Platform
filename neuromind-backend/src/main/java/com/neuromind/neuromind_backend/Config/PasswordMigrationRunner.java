package com.neuromind.neuromind_backend.Config;

import com.neuromind.neuromind_backend.model.Doctor;
import com.neuromind.neuromind_backend.model.Patient;
import com.neuromind.neuromind_backend.repo.DoctorRepo;
import com.neuromind.neuromind_backend.repo.PatientRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PasswordMigrationRunner implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(PasswordMigrationRunner.class);

    @Autowired
    private DoctorRepo doctorRepo;

    @Autowired
    private PatientRepo patientRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        log.info("[PasswordMigrationRunner] Checking for plain-text passwords in database...");

        // Migrate Doctors
        List<Doctor> doctors = doctorRepo.findAll();
        int doctorMigrated = 0;
        for (Doctor doctor : doctors) {
            String rawPass = doctor.getPassword();
            if (isPlainTextPassword(rawPass)) {
                doctor.setPassword(passwordEncoder.encode(rawPass));
                doctorRepo.save(doctor);
                doctorMigrated++;
            }
        }
        if (doctorMigrated > 0) {
            log.info("[PasswordMigrationRunner] Successfully hashed {} plain-text doctor password(s).", doctorMigrated);
        }

        // Migrate Patients
        List<Patient> patients = patientRepo.findAll();
        int patientMigrated = 0;
        for (Patient patient : patients) {
            String rawPass = patient.getPassword();
            if (isPlainTextPassword(rawPass)) {
                patient.setPassword(passwordEncoder.encode(rawPass));
                patientRepo.save(patient);
                patientMigrated++;
            }
        }
        if (patientMigrated > 0) {
            log.info("[PasswordMigrationRunner] Successfully hashed {} plain-text patient password(s).", patientMigrated);
        }
    }

    private boolean isPlainTextPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            return false;
        }
        return !password.startsWith("$2a$") && !password.startsWith("$2b$") && !password.startsWith("$2y$");
    }
}
