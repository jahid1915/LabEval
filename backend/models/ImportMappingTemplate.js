const mongoose = require('mongoose');

const importMappingTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  mapping: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  selectedFields: [{
    type: String
  }],
  duplicateMatchingField: {
    type: String,
    enum: ['rollNumber', 'registrationNumber', 'email'],
    default: 'rollNumber'
  },
  duplicateAction: {
    type: String,
    enum: ['skip', 'update', 'create_new'],
    default: 'skip'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, { timestamps: true });

importMappingTemplateSchema.index({ name: 1, department: 1 });

module.exports = mongoose.model('ImportMappingTemplate', importMappingTemplateSchema);
