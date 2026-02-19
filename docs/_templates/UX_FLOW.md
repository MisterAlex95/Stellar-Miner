# User Experience Flows

## 1. User Authentication Flow

```mermaid
flowchart TD
    A[User visits site] --> B{Is logged in?};
    B -- No --> C[Shows Login / Sign Up page];
    C --> D[User chooses Sign Up];
    D -- Enters credentials --> E{Validation};
    E -- Success --> F[Creates user account & logs in];
    F --> G[Redirects to Dashboard];
    E -- Failure --> H[Shows error message on Sign Up page];
    B -- Yes --> G;
```

| Flow | Persona | Happy Path Steps | Edge Cases / Alternate Paths |
|---|---|---|---|
| **Sign Up** | New Visitor | 1. Clicks "Sign Up". 2. Fills valid email/password. 3. Clicks "Submit". 4. Is redirected to Dashboard. | - Email already exists. - Password is too weak. - Network error on submission. |
| **Login** | Returning User | 1. Clicks "Login". 2. Enters correct credentials. 3. Is redirected to Dashboard. | - Incorrect password. - User not found. - Account is locked. |
