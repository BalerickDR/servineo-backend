import axios from 'axios';
import { LOCATIONIQ_TOKEN } from '../../config/env.config';

export async function searchLocation(query: string) {
  const url = `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(query)}&format=json`;
  const response = await axios.get(url);
  return response.data;
}

export async function reverseLocation(lat: string, lon: string) {
  const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_TOKEN}&lat=${lat}&lon=${lon}&format=json`;
  const response = await axios.get(url);
  return response.data;
}
