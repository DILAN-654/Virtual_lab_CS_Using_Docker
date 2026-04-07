const { getMonitoringSnapshot } = require('../utils/monitoringService');

exports.getMonitoringOverview = async (req, res, next) => {
    try {
        const data = await getMonitoringSnapshot();
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
};
