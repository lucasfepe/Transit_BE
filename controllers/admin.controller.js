

import cacheService from "../services/cache.service.js";

class AdminController {
    async clearCache(req, res, next) {
        try {
            cacheService.clearCache();
            res.json({ message: 'Cache cleared successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to clear cache' });
        }
    }
}

const adminController = new AdminController();
export default adminController;