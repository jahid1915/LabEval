const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  loginIdentifier: {
    type: String,
    required: [true, 'Login identifier is required'],
    trim: true,
  },
  loginIdentifierLower: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'department_head', 'admin'],
    required: [true, 'Role is required'],
    index: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE',
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  department: {
    type: String,
    uppercase: true,
    trim: true,
    default: '',
    index: true,
  },
  departmentRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
  },
  faculty: {
    type: String,
    trim: true,
    default: '',
  },
  facultyRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    default: null,
  },
  profileRef: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'profileModel',
    default: null,
  },
  profileModel: {
    type: String,
    enum: ['Student', 'Teacher', 'Admin'],
    default: null,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    default: '',
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  mustChangePassword: {
    type: Boolean,
    default: false,
  },
  sessionVersion: {
    type: Number,
    default: 1,
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  }
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.passwordHash) return false;
  if (!this.passwordHash.startsWith('$2')) {
    if (this.passwordHash === enteredPassword) {
      try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(enteredPassword, salt);
        await this.save();
      } catch (_) {}
      return true;
    }
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

userSchema.statics.hashPassword = async function(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

// Compound index for queries filtering role and department
userSchema.index({ role: 1, department: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

module.exports = mongoose.model('User', userSchema);
