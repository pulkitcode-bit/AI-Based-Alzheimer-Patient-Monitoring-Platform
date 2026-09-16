package com.neuromind.neuromind_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EntityScan("com.neuromind.neuromind_backend.model")
@EnableJpaRepositories("com.neuromind.neuromind_backend.repo")
// Powers ScheduledReminderService.deliverDueReminders() — without this the
// @Scheduled annotation is inert and no reminder ever fires on its own.
@EnableScheduling
public class NeuromindBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(NeuromindBackendApplication.class, args);
	}

}
