# NeuroMind Backend

## Environment Configuration

This application uses environment variables for sensitive configuration such as database credentials, JWT secrets, and API keys.

### Local Development Setup

1. Copy `.env.example` to `.env` in the `neuromind-backend` root folder:
   ```bash
   cp .env.example .env
   ```

2. Fill in your local credentials in `.env`:
   ```env
   DB_URL=jdbc:postgresql://localhost:5432/neuromind
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
   GEMINI_API_KEY=your_new_gemini_api_key
   ```

3. **Automatic `.env` Loading**:
   We use `me.paulschwarz:spring-dotenv` dependency in `pom.xml`. It automatically loads variables from `.env` at application startup during local development.

4. **IDE / Run Config (Alternative)**:
   You can also specify these variables in your IDE (IntelliJ IDEA / VS Code / Eclipse) Run/Debug Configuration or pass them directly in terminal:
   ```powershell
   $env:DB_URL="jdbc:postgresql://..."
   $env:DB_USERNAME="..."
   $env:DB_PASSWORD="..."
   $env:JWT_SECRET="..."
   $env:GEMINI_API_KEY="..."
   ./mvnw spring-boot:run
   ```
