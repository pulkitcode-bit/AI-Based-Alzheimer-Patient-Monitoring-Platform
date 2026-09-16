package com.neuromind.neuromind_backend.Controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import com.neuromind.neuromind_backend.Service.ChatService;
import com.neuromind.neuromind_backend.model.ChatMessage;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ChatController {
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final ChatService chatService;

    @PostMapping("/send-stream")
    public ResponseBodyEmitter sendMessageStream(@RequestParam Long patientId,
            @RequestBody Map<String, String> request) {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(60_000L);
        String message = request.get("message");

        if (message == null || message.trim().isEmpty()) {
            emitter.complete();
            return emitter;
        }

        // Runs the actual Groq call + DB writes off the request thread — the
        // emitter is returned to Spring immediately and fed from here as
        // chunks arrive. A dedicated thread pool would be the production
        // move under real concurrent load; a plain thread is a reasonable
        // simplification at this project's scale.
        Thread worker = new Thread(() -> {
            try {
                chatService.streamMessage(patientId, message, chunk -> {
                    try {
                        emitter.send(chunk, MediaType.TEXT_PLAIN);
                    } catch (IOException e) {
                        throw new java.io.UncheckedIOException(e);
                    }
                });
                emitter.complete();
            } catch (Exception e) {
                log.error("Chat stream error for patient {}: {}", patientId, e.getMessage(), e);
                emitter.completeWithError(e);
            }
        });
        worker.setDaemon(true);
        worker.start();

        return emitter;
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, String>> sendMessage(@RequestParam Long patientId,
            @RequestBody Map<String, String> request) {
        String message = request.get("message");
        
        if (message == null || message.trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Message content is required");
            return ResponseEntity.badRequest().body(err);
        }

        try {
            System.out.println("Processing chat for patient: " + patientId);
            String response = chatService.sendMessage(patientId, message);
            Map<String, String> res = new HashMap<>();
            res.put("response", response);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            System.err.println("FATAL ERROR in ChatController: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> err = new HashMap<>();
            err.put("error", "Internal Server Error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(err);
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessage>> getChatHistory(@RequestParam Long patientId) {
        return ResponseEntity.ok(chatService.getChatHistory(patientId));
    }
}
