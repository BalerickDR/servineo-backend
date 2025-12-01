import { deleteMeetingEvent } from '../utils/googleCalendarHelper';
import * as dotenv from 'dotenv';

dotenv.config();

const ID_CITA_VIRTUAL = "02o20u8d7qhfdj4nqaaeo33gko";
const ID_CITA_PRESENCIAL = "ap1l6pm7ln4gotrvo9u03nlvoo";

async function testDeletes() {
    console.log("TEST 4: Eliminando citas...");

    console.log("Eliminando Cita Virtual...");
    await deleteMeetingEvent(ID_CITA_VIRTUAL);
    
    console.log("Eliminando Cita Presencial...");
    await deleteMeetingEvent(ID_CITA_PRESENCIAL);
}

testDeletes();