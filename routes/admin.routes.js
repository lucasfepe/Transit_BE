router.post('/api/admin/clearCache', authMiddleware, (req, res) => {
    try {
        cacheService.clearCache();
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

module.exports = router;