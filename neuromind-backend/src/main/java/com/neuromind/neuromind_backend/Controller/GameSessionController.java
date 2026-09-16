package com.neuromind.neuromind_backend.Controller;

import com.neuromind.neuromind_backend.Dto.GameSessionRequest;
import com.neuromind.neuromind_backend.Dto.GameSessionResponse;
import com.neuromind.neuromind_backend.Service.GameSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/game-sessions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GameSessionController {

    private final GameSessionService gameSessionService;

    // POST /api/game-sessions
    @PostMapping
    public ResponseEntity<?> submitSession(@Valid @RequestBody GameSessionRequest request) {
        try {
            GameSessionResponse response = gameSessionService.submitSession(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (GameSessionService.ActivityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
