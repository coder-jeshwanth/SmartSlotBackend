# SmartSlot Backend API

A professional REST API backend for SmartSlot booking management system built with Node.js, Express.js, and MongoDB.

## 🚀 Features

- **Complete Booking Management**: Full CRUD operations for slot bookings
- **Admin Panel Support**: Dashboard, analytics, and management endpoints
- **Customer Interface**: Public booking endpoints with calendar integration
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Input Validation**: Comprehensive validation using express-validator
- **Security**: Rate limiting, CORS, input sanitization, and security headers
- **Error Handling**: Global error handling with detailed logging
- **Database Integration**: MongoDB with Mongoose ODM
- **Performance**: Compression, caching, and optimized queries
- **Scalability**: Professional architecture with separation of concerns

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Validation](#validation)
- [Error Handling](#error-handling)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Testing](#testing)

## 🛠️ Installation

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartSlotBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartslot
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2025
JWT_EXPIRE=24h
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
BCRYPT_SALT_ROUNDS=12
API_VERSION=v1
```

### Database Configuration

The application automatically connects to MongoDB using the connection string in `MONGODB_URI`. The database will be created automatically when the application starts.

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new admin user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/verify` | Verify JWT token | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update user profile | Yes |

### Admin Panel

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/dashboard` | Dashboard statistics | Admin |
| GET | `/api/admin/dates` | Get all available dates | Admin |
| POST | `/api/admin/dates` | Create new available date | Admin |
| PUT | `/api/admin/dates/:id` | Update available date | Admin |
| DELETE | `/api/admin/dates/:id` | Delete available date | Admin |
| GET | `/api/admin/bookings` | Get all bookings | Admin |
| GET | `/api/admin/bookings/:date` | Get bookings for specific date | Admin |
| PUT | `/api/admin/bookings/:id` | Update booking status | Admin |
| DELETE | `/api/admin/bookings/:id` | Cancel/delete booking | Admin |
| GET | `/api/admin/analytics` | Booking analytics data | Admin |

### Customer Booking

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/customer/dates` | Get available dates for booking | No |
| GET | `/api/customer/slots/:date` | Get available time slots for date | No |
| GET | `/api/customer/calendar/:month/:year` | Get calendar data for month | No |
| GET | `/api/customer/check-availability` | Check slot availability | No |
| GET | `/api/customer/next-slots` | Get next available slots | No |

### Booking Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/booking` | Create new booking | No |
| GET | `/api/booking/:ref` | Get booking by reference | No |
| PUT | `/api/booking/:ref` | Update customer booking | No |
| DELETE | `/api/booking/:ref` | Cancel customer booking | No |
| PUT | `/api/booking/:ref/reschedule` | Reschedule booking | No |
| POST | `/api/booking/:ref/checkin` | Check-in for booking | No |

### General

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check endpoint | No |
| GET | `/api/status` | API status endpoint | No |
| POST | `/api/validate/email` | Email validation | No |
| POST | `/api/validate/phone` | Phone validation | No |

## 🗄️ Database Schema

### User Schema
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  role: String (admin/customer),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### AvailableDate Schema
```javascript
{
  date: String (YYYY-MM-DD),
  startTime: String (HH:MM),
  endTime: String (HH:MM),
  slotDuration: Number (30 minutes),
  isActive: Boolean,
  notes: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Schema
```javascript
{
  date: String (YYYY-MM-DD),
  timeSlot: String (HH:MM),
  customer: {
    name: String,
    email: String,
    phone: String,
    notes: String
  },
  status: String (pending/confirmed/cancelled/completed/no-show),
  bookingReference: String (unique),
  source: String (online/phone/walk-in/admin),
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login**: POST to `/api/auth/login` with credentials
2. **Token**: Receive JWT token in response
3. **Authorization**: Include token in `Authorization: Bearer <token>` header
4. **Roles**: Admin routes require admin role, customer routes are public

### Example Login Request
```javascript
POST /api/auth/login
{
  "identifier": "admin@example.com",
  "password": "password123"
}
```

### Example Response
```javascript
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## ✅ Validation

All API endpoints include comprehensive input validation:

- **Email format validation**
- **Phone number format validation**
- **Date format validation (YYYY-MM-DD)**
- **Time format validation (HH:MM)**
- **Business rules validation**
- **XSS prevention**
- **SQL injection prevention**

### Example Validation Error Response
```javascript
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 400,
  "error": {
    "errors": [
      {
        "field": "email",
        "message": "Please provide a valid email address",
        "value": "invalid-email"
      }
    ]
  },
  "timestamp": "2025-09-23T10:30:00.000Z"
}
```

## 🚨 Error Handling

The API includes comprehensive error handling:

- **Global error handler**
- **MongoDB error handling**
- **Validation error formatting**
- **Custom business logic errors**
- **Rate limiting errors**
- **Authentication errors**

### Standard Error Response Format
```javascript
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "error": "Detailed error information",
  "timestamp": "2025-09-23T10:30:00.000Z"
}
```

## 👩‍💻 Development

### Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run tests (when implemented)
npm test

# Check code style
npm run lint
```

### Project Structure

```
src/
├── config/           # Configuration files
├── models/           # MongoDB models
├── routes/           # Express routes
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── utils/           # Utility functions
└── app.js           # Express app setup
```

### Adding New Features

1. **Create Model**: Add MongoDB schema in `src/models/`
2. **Create Controller**: Add business logic in `src/controllers/`
3. **Create Routes**: Add API endpoints in `src/routes/`
4. **Add Validation**: Include validation rules
5. **Update Documentation**: Update this README

## 🚀 Production Deployment

### Environment Setup

1. **Set production environment variables**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-super-secure-production-secret
   ```

2. **Use process manager**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name smartslot-api
   ```

3. **Set up reverse proxy**
   ```nginx
   # Nginx configuration
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Security Considerations

- Use HTTPS in production
- Set strong JWT secrets
- Configure proper CORS origins
- Set up rate limiting
- Monitor and log errors
- Regular security updates

## 🌐 Vercel Deployment

This API is configured for seamless deployment on Vercel:

### Prerequisites
- Vercel account
- MongoDB database (MongoDB Atlas recommended)
- GitHub repository

### Deployment Steps

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

2. **Set Environment Variables**
   
   Create environment variables in Vercel dashboard or using CLI:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add CORS_ORIGIN
   ```
   
   Required environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Strong secret key for JWT tokens
   - `CORS_ORIGIN`: Your frontend domain (e.g., https://yourdomain.com)

3. **Deploy to Vercel**
   ```bash
   # Login to Vercel (if not already logged in)
   vercel login
   
   # Deploy
   vercel --prod
   ```

4. **Alternative: GitHub Integration**
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Set environment variables in Vercel dashboard
   - Vercel will automatically deploy on every push

### Configuration Files
- `vercel.json`: Vercel deployment configuration
- `api/index.js`: Serverless function entry point
- `.env.example`: Environment variables template

### MongoDB Setup
For production, use MongoDB Atlas:
1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com)
2. Get connection string
3. Add to VERCEL_ENV as `MONGODB_URI`

## 🧪 Testing

### Manual Testing

Use tools like Postman or curl to test endpoints:

```bash
# Health check
curl http://localhost:5000/health

# Create booking
curl -X POST http://localhost:5000/api/booking \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-09-25",
    "timeSlot": "14:30",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  }'
```

### API Documentation

Visit `http://localhost:5000/api/docs` for interactive API documentation.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/api/docs`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**SmartSlot Backend API** - Professional booking management system for modern applications.