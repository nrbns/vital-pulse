const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDatabase } = require('./database/connection');
const { loadRegions } = require('./utils/regionLoader');
const { initializeSocketIO } = require('./ws');
const { initializePGListener } = require('./database/pgListener');
const { initializeNotificationQueue } = require('./services/notifications');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const donorRoutes = require('./routes/donors');
const bloodRequestRoutes = require('./routes/bloodRequests');
const emergencyRoutes = require('./routes/emergency');
const hospitalRoutes = require('./routes/hospitals');
const eventRoutes = require('./routes/events');
const regionRoutes = require('./routes/regions');
const safetyRoutes = require('./routes/safety');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/donors', donorRoutes);
app.use('/api/v1/donors', require('./routes/donorPresence')); // Donor presence routes
app.use('/api/v1/blood-requests', bloodRequestRoutes);
app.use('/api/v1/emergency', emergencyRoutes);
app.use('/api/v1/hospitals', hospitalRoutes);
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/regions', regionRoutes);
app.use('/api/v1/safety', safetyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: { 
      code: 'NOT_FOUND', 
      message: 'Endpoint not found' 
    } 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Initialize app
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Load region configurations
    await loadRegions();
    console.log('✅ Region configurations loaded');

    // Initialize Socket.IO (WebSocket server)
    initializeSocketIO(server);
    console.log('✅ WebSocket server initialized');

    // Initialize PostgreSQL listener (for realtime triggers)
    if (process.env.ENABLE_PG_LISTENER !== 'false') {
      initializePGListener();
    }

    // Initialize notification queue (BullMQ)
    if (process.env.REDIS_URL || process.env.REDIS_ENABLED !== 'false') {
      initializeNotificationQueue();
      console.log('✅ Notification queue initialized');
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Pulse API server running on port ${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket available at ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

