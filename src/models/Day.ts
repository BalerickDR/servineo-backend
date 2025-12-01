import mongoose from 'mongoose';
import Appointment from './Appointment';

const day_schema = new mongoose.Schema(
    {
        day_status: {
            type: String,
            enum: ['available', 'occupied', 'partially-occupied'],
            required: true,
            unique: false,
            default: 'available',
        },
        meetings: [
            {
                type: Appointment.schema,
                required: true,
                unique: true,
            }
        ],
        id_fixer: {
            type: String,
            required: false,
            unique: false,
        },
        id_requester: {
            type: String,
            required: false,
            unique: false,
        }
    }
);

const Day = mongoose.model('Day', day_schema, 'day');

export default Day;