import mongoose from 'mongoose';

const appointment_schema = new mongoose.Schema(
  {
    id_fixer: {
      type: String,
      required: true,
      unique: false,
    },
    id_requester: {
      type: String,
      required: true,
      unique: false,
    },
    selected_date: {
      type: Date,
      required: true,
      unique: false,
      default: Date.now,
    },
    current_requester_name: {
      type: String,
      required: true,
      unique: false,
    },
    appointment_type: {
      type: String,
      enum: ['virtual', 'presential'],
      required: true,
      unique: false,
      default: 'virtual',
    },
    appointment_description: {
      type: String,
      required: false,
      unique: false,
    },
    link_id: {
      type: String,
      required: false,
      unique: false,
    },
    current_requester_phone: {
      type: String,
      required: true,
      unique: false,
    },
    starting_time: {
      type: Date,
      required: true,
      unique: false,
    },
    finishing_time: { type: Date },
    schedule_state: {
      type: String,
      enum: ['cancelled', 'booked'],
      required: true,
      unique: false,
      default: 'booked'
    },
    display_name_location: {
      type: String,
      required: false,
    },
    lat: {
      type: String,
      required: false,
    },
    lon: {
      type: String,
      required: false,
    },
    cancelled_fixer: {
      type: Boolean,
      default: false
    },
    reprogram_reason: {
      type: String,
      default: '',
      required: false,
      unique: false
    },
    googleEventId: {
      type: String,
      required: false,
      unique: false
    },
    mail: {
      type: [String], // Array de strings
      required: false,
      unique: false
    }
  },
  { timestamps: true },
);

const Appointment = mongoose.model('Appointment', appointment_schema);

export default Appointment;
