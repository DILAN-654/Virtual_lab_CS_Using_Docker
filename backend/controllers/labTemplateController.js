const LabTemplate = require('../models/LabTemplate');

// GET /api/lab-templates
exports.getLabTemplates = async (req, res, next) => {
    try {
        const query = req.user?.role === 'admin' ? {} : { isActive: true };
        const templates = await LabTemplate.find(query).sort('name').lean();
        res.status(200).json({ success: true, count: templates.length, data: templates });
    } catch (error) {
        console.error('Error fetching lab templates:', error);
        next(error);
    }
};

// GET /api/lab-templates/:id
exports.getLabTemplate = async (req, res, next) => {
    try {
        const template = await LabTemplate.findById(req.params.id).lean();
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        console.error('Error fetching lab template:', error);
        next(error);
    }
};

// Admin create/update/delete helpers (optional)
exports.createLabTemplate = async (req, res, next) => {
    try {
        const template = await LabTemplate.create(req.body);
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        console.error('Error creating lab template:', error);
        next(error);
    }
};

exports.updateLabTemplate = async (req, res, next) => {
    try {
        const template = await LabTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        console.error('Error updating lab template:', error);
        next(error);
    }
};

exports.deleteLabTemplate = async (req, res, next) => {
    try {
        const template = await LabTemplate.findByIdAndDelete(req.params.id);
        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
        res.status(200).json({ success: true, message: 'Template deleted' });
    } catch (error) {
        console.error('Error deleting lab template:', error);
        next(error);
    }
};
