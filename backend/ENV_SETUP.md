# Environment Setup Instructions

To run the backend server, you need to create a `.env` file in the `backend` directory.

## Steps:

1. Copy this template and create `.env` in the `backend` folder:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/clinic_appointments?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random
NODE_ENV=development
```

2. Replace the placeholders:
   - `<username>`: Your MongoDB Atlas username
   - `<password>`: Your MongoDB Atlas password
   - `your-secret-key-change-in-production`: A random secret string for JWT signing (at least 32 characters)

3. Get your MongoDB Atlas connection string:
   - Log into MongoDB Atlas (https://cloud.mongodb.com)
   - Go to your cluster
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

4. Once `.env` is created, restart the backend server:
   ```bash
   cd backend
   npm start
   ```

5. Seed the database (optional, but recommended for testing):
   ```bash
   npm run seed
   ```

This will create:
- Test patient: emily@patient.com / password123
- 50 additional patients
- 15 doctors
- 650+ appointments

