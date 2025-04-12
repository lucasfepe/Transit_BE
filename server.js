import express from 'express';
import cors from 'cors';
import playgroundEquipmentRoutes from './routes/playgroundEquipmentRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/playgroundEquipment', playgroundEquipmentRoutes);

app.listen(PORT, () => {
    console.log('Server listening on port ' + PORT);
})
