# SpendSense API Documentation

## Base URL

All API endpoints are prefixed with `/api`

## Authentication

Most endpoints require a valid user session. The user ID is passed as a query parameter or in the request body.

## Endpoints

### Data Ingestion

#### POST /api/ingest

Upload and ingest synthetic user data.

**Request Body:**
```json
{
  "data": [
    {
      "id": "uuid",
      "fake_name": "John Doe",
      "demographics": {...},
      "accounts": [...],
      "transactions": [...],
      "liabilities": [...]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ingested 75 users",
  "results": {
    "users": 75,
    "accounts": 150,
    "transactions": 11250,
    "liabilities": 45,
    "errors": []
  }
}
```

### Signals

#### GET /api/signals

Get detected behavioral signals for a user.

**Query Parameters:**
- `user_id` (required) - User UUID

**Response:**
```json
{
  "signals": [
    {
      "signal_type": "subscriptions",
      "signal_data": {
        "recurring_merchants": [...],
        "total_monthly_spend": 120.50,
        "percentage_of_total": 15.2,
        "count": 4
      }
    }
  ]
}
```

### Personas

#### POST /api/personas

Assign a financial persona to a user.

**Request Body:**
```json
{
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "persona": {
    "type": "high_utilization",
    "rationale": "High credit utilization detected (68.0%)..."
  }
}
```

### Recommendations

#### GET /api/recommendations

Get personalized recommendations for a user.

**Query Parameters:**
- `user_id` (required) - User UUID

**Response:**
```json
{
  "education_items": [
    {
      "type": "education",
      "content_id": "uuid",
      "rationale": "We noticed your credit utilization is 68%..."
    }
  ],
  "offers": [
    {
      "type": "offer",
      "offer_data": {
        "type": "balance_transfer",
        "provider": "Chase Slate",
        "description": "..."
      },
      "rationale": "Your Visa at 68% utilization..."
    }
  ]
}
```

### Consent

#### POST /api/consent

Update user consent status.

**Request Body:**
```json
{
  "user_id": "uuid",
  "consent_status": true
}
```

**Response:**
```json
{
  "success": true,
  "consent_status": true
}
```

### Feedback

#### POST /api/feedback

Log user interactions and feedback.

**Request Body:**
```json
{
  "user_id": "uuid",
  "action_type": "click",
  "feedback_data": {
    "recommendation_id": "uuid",
    "action": "viewed"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### Operator

#### GET /api/operator/review

Get all users with their signals, personas, and recommendations (operator only).

**Response:**
```json
{
  "users": [
    {
      "user": {...},
      "signals": [...],
      "persona": {...},
      "recommendations": [...]
    }
  ]
}
```

## Error Responses

All endpoints may return error responses with the following format:

```json
{
  "statusCode": 400,
  "message": "Error description"
}
```

Common status codes:
- `400` - Bad Request (missing/invalid parameters)
- `403` - Forbidden (consent not granted)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

