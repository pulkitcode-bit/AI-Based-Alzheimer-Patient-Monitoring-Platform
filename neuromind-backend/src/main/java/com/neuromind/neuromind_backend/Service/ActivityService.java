package com.neuromind.neuromind_backend.Service;

import com.neuromind.neuromind_backend.model.Activity;
import com.neuromind.neuromind_backend.repo.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityRepository activityRepository;

    public List<Activity> getAllActivities() {
        return activityRepository.findAll();
    }

    public List<Activity> getActivitiesByCategory(String category) {
        return activityRepository.findByCategory(category);
    }

    public Optional<Activity> getActivityById(String activityId) {
        return activityRepository.findById(activityId);
    }
}
