# Environment Setup Instructions

To run the backend server, you need to create a `.env` file in the `backend` directory.

## Steps:

1. Copy this template and create `.env` in the `backend` folder:

```env
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/clinic_appointments?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-in-production-make-it-long-and-random
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
CLINIC_TIMEZONE=America/New_York
```

2. Replace the placeholders:

   - `<username>`: Your MongoDB Atlas username
   - `<password>`: Your MongoDB Atlas password
   - `your-secret-key-change-in-production`: A random secret string for JWT signing (at least 32 characters)
   - `FRONTEND_ORIGIN`: The URL of your frontend application (e.g., `http://localhost:3000` for local development, or your production frontend URL)
   - `CLINIC_TIMEZONE`: IANA timezone for clinic scheduling (default `America/New_York`)

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

## Deployment to Render (or other platforms)

When deploying to Render, make sure to set the following environment variables in your Render dashboard:

1. **FRONTEND_ORIGIN**: Set this to your frontend URL (e.g., `https://your-frontend.onrender.com` or your custom domain)

   - **Important**: Use the exact URL including the protocol (`https://` or `http://`)
   - **No trailing slash**: Don't include a trailing slash (e.g., use `https://example.com` not `https://example.com/`)
   - **Multiple origins**: You can specify multiple origins separated by commas: `https://example.com,https://www.example.com`

2. **MONGODB_URI**: Your MongoDB Atlas connection string

3. **JWT_SECRET**: A secure random string (at least 32 characters)

4. **PORT**: Usually set automatically by Render, but you can override if needed

5. **NODE_ENV**: Set to `production` for production deployments

### Common CORS Issues:

- **Wrong protocol**: Make sure both frontend and backend use the same protocol (`http://` vs `https://`)
- **Trailing slash**: Remove trailing slashes from the FRONTEND_ORIGIN value
- **Subdomain mismatch**: `https://example.com` and `https://www.example.com` are different origins
- **Port mismatch**: Include the port if your frontend uses a non-standard port

After setting the environment variables, redeploy your service on Render.
