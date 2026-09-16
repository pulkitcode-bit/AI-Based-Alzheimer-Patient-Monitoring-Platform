package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Service.ActivityService;
import com.neuromind.neuromind_backend.model.Activity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ActivityController {

    private final ActivityService activityService;

    // GET /api/activities — returns all activities
    @GetMapping
    public ResponseEntity<List<Activity>> getAllActivities() {
        return ResponseEntity.ok(activityService.getAllActivities());
    }

    // GET /api/activities/category/{category} — filtered by category
    @GetMapping("/category/{category}")
    public ResponseEntity<List<Activity>> getActivitiesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(activityService.getActivitiesByCategory(category));
    }

    // GET /api/activities/{activityId} — single activity config
    @GetMapping("/{activityId}")
    public ResponseEntity<Activity> getActivityById(@PathVariable String activityId) {
        return activityService.getActivityById(activityId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
