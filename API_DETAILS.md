# NimbleVoice — Complete API Implementation & Integration Specification

> **Backend Service**: `nimble-voice-backend` (Go / Gin / GORM / gsocketio)  
> **Backend Base URL**: `http://localhost:8080` (Route prefix: `/api/...` and `/api/v1/...`)  
> **Socket.IO Gateway**: `ws://localhost:8080/socket.io/` (Socket.IO v4)  
> **Frontend Integration**: Aligns with `@/lib/axios.ts`, `@/lib/socket.ts`, `@/hooks/useApi.ts`, and `@/lib/normalize.ts`.

---

## 📌 1. Integration & Architecture Summary

The NimbleVoice system pairs a high-performance Go backend service with a Next.js 15 client:
- **REST Endpoints**: Handled by the Go Gin backend on port `8080`.
- **Response Format**: All endpoints return standard `{ status: number, message: string, data: any }`. The frontend Axios client in `lib/axios.ts` automatically unwraps `response.data.data`.
- **Dual Route Compatibility**: All endpoints are mounted at both `/api/...` and `/api/v1/...`.
- **Authentication**: JWT tokens passed via `Authorization: Bearer <token>` header or `withCredentials: true` cookies. Tokens are saved in both `localStorage.getItem("token")` and `localStorage.getItem("nimble_auth_token")`.
- **Socket Gateway**: Mounted at `http://localhost:8080/socket.io/` with automatic handshake token authentication and WebRTC signaling.

---

## 2. Complete REST API Catalog (All 19 Endpoints)

| # | Group | Method | Endpoint Path | Auth Required | Purpose |
|---|---|:---:|---|:---:|---|
| **1** | Auth | `POST` | `/api/auth/guest` | No | Create anonymous guest session & token |
| **2** | Auth | `GET` | `/api/auth/session` | Bearer / Cookie | Read active user session |
| **3** | Auth | `GET` | `/api/auth/profile` | Bearer | Extended profile + room stats |
| **4** | Auth | `POST` | `/api/auth/register` | No | Email + password registration |
| **5** | Auth | `POST` | `/api/auth/login` | No | Email + password login |
| **6** | Rooms | `GET` | `/api/rooms` | No | Filter & list live rooms (query, lang, filter, page, limit) |
| **7** | Rooms | `POST` | `/api/rooms` | Bearer | Create voice room & enroll host |
| **8** | Rooms | `GET` | `/api/rooms/:id` | No | Single room details + active roster |
| **9** | Rooms | `PATCH` | `/api/rooms/:id` | Bearer (Host) | Update title, topic, maxSlots, status |
| **10**| Rooms | `DELETE`| `/api/rooms/:id` | Bearer (Host) | Close room & disconnect members |
| **11**| Rooms | `POST` | `/api/rooms/:id/join` | Bearer | ACID slot allocation & peer token |
| **12**| Rooms | `POST` | `/api/rooms/:id/leave`| Bearer | Release slot & update room state |
| **13**| Chat | `GET` | `/api/rooms/:id/messages` | No | In-room backchannel messages |
| **14**| Chat | `POST` | `/api/rooms/:id/messages` | Bearer | Post message (triggers socket broadcast) |
| **15**| Users | `GET` | `/api/users/:userId` | No | Public learner card & CEFR stats |
| **16**| Users | `PATCH` | `/api/users/portfolio` | Bearer | Update language levels & location |
| **17**| Users | `GET` | `/api/users/stats` | Bearer | Telemetry: hours spoken, streak, karma |
| **18**| Topics| `GET` | `/api/topics/prompts` | No | Icebreakers & conversation starter decks |
| **19**| Stats | `GET` | `/api/stats/network` | No | Platform active learners & room counts |

---

## 3. REST API Payloads & Contracts

### 3.1 Authentication & Session
#### `POST /api/auth/guest`
- **Request Body**:
```json
{
  "name": "Alex",
  "nativeLanguage": "English",
  "learningLanguage": "Spanish"
}
```
- **Response `201 Created`**:
```json
{
  "status": 201,
  "message": "Guest session created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "ck_user_1",
      "name": "Alex",
      "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
      "native_language": "English",
      "learning_language": "Spanish",
      "is_guest": true,
      "role": "user",
      "karma": 0,
      "hours_spoken": 0,
      "streak": 1,
      "cefr_portfolio": { "English": "NATIVE", "Spanish": "A1" }
    }
  }
}
```

#### `POST /api/auth/login`
- **Request Body**:
```json
{
  "email": "learner@example.com",
  "password": "SecurePassword123!"
}
```
- **Response `200 OK`**:
```json
{
  "status": 200,
  "message": "Logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { "id": "ck_user_2", "name": "Learner", "email": "learner@example.com" }
  }
}
```

---

### 3.2 Voice Rooms Catalog
#### `GET /api/rooms`
- **Query Params**:
  - `lang`: `"English"`, `"Spanish"`, `"Japanese"`, or `"all"`
  - `query`: Free-text search matching title, topic, or host name
  - `filter`: `"all"`, `"active"`, `"free-seats"`, `"beginner"`, `"native"`
  - `page`: default `1`
  - `limit`: default `20` (max `50`)
- **Response `200 OK`**:
```json
{
  "status": 200,
  "message": "Voice rooms retrieved successfully",
  "data": {
    "rooms": [
      {
        "id": "ck_room123",
        "title": "Global English Lounge",
        "topic": "Casual chat, culture & daily life",
        "language": "English",
        "flag": "🇬🇧",
        "cefr_level": "B1",
        "level_label": "Intermediate B1",
        "max_slots": 6,
        "current_slots": 2,
        "tags": ["Casual & Life", "Culture"],
        "status": "LIVE",
        "is_beginner_friendly": true,
        "has_free_seats": true,
        "has_native_speaker": false,
        "is_live": true,
        "host": { "id": "usr_1", "name": "Sarah", "avatar_url": "https://..." },
        "participants": [
          { "id": "part_1", "user_id": "usr_1", "is_host": true, "user": { "name": "Sarah" } }
        ]
      }
    ],
    "pagination": { "total": 48, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

#### `POST /api/rooms`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Japanese Anime & Everyday Slang",
  "language": "Japanese",
  "cefrLevel": "B2",
  "maxSlots": 5,
  "topicTag": "Pop Culture & Movies",
  "isBeginnerFriendly": true
}
```
- **Response `201 Created`**:
```json
{
  "status": 201,
  "message": "Voice room created successfully",
  "data": {
    "success": true,
    "room": {
      "id": "ck_room_456",
      "title": "Japanese Anime & Everyday Slang",
      "language": "Japanese",
      "flag": "🇯🇵",
      "current_slots": 1,
      "max_slots": 5
    }
  }
}
```

---

## 4. Frontend Integration Layer

1. **`lib/axios.ts`**:
   - `baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"`
   - `withCredentials: true`
   - Automatically injects `Authorization: Bearer <token>`
   - Automatically unwraps `response.data.data` so callers get direct data objects
2. **`lib/socket.ts`**:
   - `SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080"`
   - `path: "/socket.io/"`
   - `transports: ["websocket", "polling"]`
   - Handshake callback transmits Bearer token dynamically
3. **`lib/normalize.ts`**:
   - Transparently handles Go backend `snake_case` database fields (`max_slots`, `current_slots`, `cefr_level`, `is_beginner_friendly`) and maps them to client `VoiceRoom` interfaces without missing fields.
4. **`hooks/useApi.ts`**:
   - `useRoomsApi(params)` — SWR rooms list with search, filter, and pagination
   - `useRoomDetailApi(roomId)` — Single room detail, `joinRoom()`, and `leaveRoom()`
   - `useRoomMessagesApi(roomId)` — In-room chat history and `sendMessage()`
   - `useUserProfileApi(userId)` — Public learner profile and `updatePortfolio()`
   - `useNetworkStatsApi()` — Global learner counters
   - `useTopicPromptsApi(category)` — Conversation decks
   - `useAuthApi()` — `guestLogin()`, `login()`, `register()`, and `logout()`
