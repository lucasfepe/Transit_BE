import express from 'express'
import cors from 'cors'
import * as mongodb from './db.js'
import routes from './routes/index.js'
import vehicleTrackingService from './services/vehicleTracking.service.js'
import requestLogger from './middleware/log.middleware.js'

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());

app.use(requestLogger);

app.use(express.json());

mongodb.initDb()
    .then(() => {
        app.use('/', routes);

        const server = app.listen(port, '0.0.0.0', () => {
            console.log(`Server is running on port ${port}`);

            // Start the vehicle tracking service after server is running
            vehicleTrackingService.start();
        });

        // Handle graceful shutdown
        const gracefulShutdown = () => {
            console.log('Received shutdown signal, closing server...');

            // Stop the vehicle tracking service
            vehicleTrackingService.stop();

            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });

            // Force close after 10 seconds if server doesn't close gracefully
            setTimeout(() => {
                console.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        // Listen for termination signals
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    });