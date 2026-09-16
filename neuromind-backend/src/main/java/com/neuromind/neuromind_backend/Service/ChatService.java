package com.neuromind.neuromind_backend.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.neuromind.neuromind_backend.model.ChatMessage;
import com.neuromind.neuromind_backend.repo.ChatMessageRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final AIService aiService;
    private final ScheduledReminderService scheduledReminderService;

    // ── Reminder intent — rule-based, not the LLM ───────────────────────────
    // This is deliberately regex matching rather than asking the LLM to "just
    // handle it": an LLM can produce a perfectly confident "Done, I've set
    // that reminder!" without anything being created, which is worse than not
    // offering the feature at all. Matching here means the confirmation the
    // patient sees only appears once a real ScheduledReminder row exists.
    // It's a best-effort parser, not true NLU — unusual phrasing may fall
    // through to the plain conversational reply below instead of being caught.
    private static final Pattern REMINDER_TRIGGER =
            Pattern.compile("\\b(remind me|set (a |an )?reminder|schedule a reminder)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TIME_12H =
            Pattern.compile("\\b(\\d{1,2})(:(\\d{2}))?\\s*(am|pm)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TIME_24H =
            Pattern.compile("\\b([01]?\\d|2[0-3]):([0-5]\\d)\\b");
    private static final Pattern DAILY_HINT =
            Pattern.compile("\\b(every ?day|each day|daily)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern FILLER_WORDS =
            Pattern.compile("\\b(to|for|at|me|please)\\b", Pattern.CASE_INSENSITIVE);

    public String sendMessage(Long patientId, String message) {
        if (patientId == null) {
            throw new IllegalArgumentException("Patient ID cannot be null");
        }

        ChatMessage userMessage = ChatMessage.builder()
                .patientId(patientId)
                .message(message)
                .sender("user")
                .build();
        chatMessageRepository.save(userMessage);

        String responseText = tryHandleReminderIntent(patientId, message)
                .orElseGet(() -> {
                    String aiText = aiService.generateAIResponse(message);
                    return aiText != null ? aiText : "I'm sorry, I encountered an error processing your request.";
                });

        ChatMessage assistantMessage = ChatMessage.builder()
                .patientId(patientId)
                .message(responseText)
                .sender("assistant")
                .build();
        chatMessageRepository.save(assistantMessage);

        return responseText;
    }

    /**
     * Streaming counterpart to {@link #sendMessage}. {@code onChunk} is called
     * once per piece of text as it becomes available; the full reply is
     * still persisted to history exactly once, after the stream completes —
     * so a page that reloads mid-reply sees either nothing or the finished
     * message, never a half-written row.
     */
    public void streamMessage(Long patientId, String message, Consumer<String> onChunk) {
        if (patientId == null) {
            throw new IllegalArgumentException("Patient ID cannot be null");
        }

        ChatMessage userMessage = ChatMessage.builder()
                .patientId(patientId)
                .message(message)
                .sender("user")
                .build();
        chatMessageRepository.save(userMessage);

        StringBuilder full = new StringBuilder();
        Optional<String> reminderReply = tryHandleReminderIntent(patientId, message);

        if (reminderReply.isPresent()) {
            // Deterministic reply, not LLM-generated — there's nothing to
            // stream token-by-token, so it's sent as a single chunk.
            String text = reminderReply.get();
            onChunk.accept(text);
            full.append(text);
        } else {
            aiService.streamAIResponse(message, token -> {
                onChunk.accept(token);
                full.append(token);
            });
        }

        String responseText = full.length() > 0
                ? full.toString()
                : "I'm sorry, I encountered an error processing your request.";

        ChatMessage assistantMessage = ChatMessage.builder()
                .patientId(patientId)
                .message(responseText)
                .sender("assistant")
                .build();
        chatMessageRepository.save(assistantMessage);
    }

    public List<ChatMessage> getChatHistory(Long patientId) {
        // Ascending — the widget renders this list top-to-bottom as a
        // conversation, so it needs oldest-first.
        return chatMessageRepository.findByPatientIdOrderByCreatedAtAsc(patientId);
    }

    /**
     * Returns a confirmation reply (and creates the reminder as a side
     * effect) if {@code message} reads as a reminder request; empty if it
     * doesn't, so the caller falls through to the normal AI response.
     */
    private Optional<String> tryHandleReminderIntent(Long patientId, String message) {
        if (!REMINDER_TRIGGER.matcher(message).find()) {
            return Optional.empty();
        }

        LocalTime time = null;
        String matchedTimeText = null;

        Matcher m12 = TIME_12H.matcher(message);
        if (m12.find()) {
            int hour = Integer.parseInt(m12.group(1));
            int minute = m12.group(3) != null ? Integer.parseInt(m12.group(3)) : 0;
            boolean pm = m12.group(4).equalsIgnoreCase("pm");
            if (pm && hour != 12) hour += 12;
            if (!pm && hour == 12) hour = 0;
            time = LocalTime.of(hour, minute);
            matchedTimeText = m12.group();
        } else {
            Matcher m24 = TIME_24H.matcher(message);
            if (m24.find()) {
                time = LocalTime.of(Integer.parseInt(m24.group(1)), Integer.parseInt(m24.group(2)));
                matchedTimeText = m24.group();
            }
        }

        if (time == null) {
            return Optional.of(
                    "I'd love to set that reminder! What time should I remind you? "
                            + "Try something like \"remind me to take my medicine at 8am\".");
        }

        boolean daily = DAILY_HINT.matcher(message).find();

        String label = REMINDER_TRIGGER.matcher(message).replaceAll(" ");
        label = label.replace(matchedTimeText, " ");
        label = DAILY_HINT.matcher(label).replaceAll(" ");
        label = FILLER_WORDS.matcher(label).replaceAll(" ");
        label = label.replaceAll("[\\s,.:;!?]+", " ").trim();
        if (label.isEmpty()) {
            label = "Reminder";
        } else {
            label = Character.toUpperCase(label.charAt(0)) + label.substring(1);
        }

        scheduledReminderService.create(patientId, label, time, daily ? "DAILY" : "ONCE", null);

        String timeStr = time.format(DateTimeFormatter.ofPattern("h:mm a"));
        String freq = daily ? " every day" : "";
        return Optional.of("Done! I've set a reminder — \"" + label + "\" at " + timeStr + freq
                + ". You'll see it in your notifications when it's time.");
    }
}
