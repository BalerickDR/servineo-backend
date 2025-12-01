import 'express';
import { Request, Response } from 'express';
import * as LocationService from '../../services/location/location.service';

export async function getLocation(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ message: 'Missing query parameter: q' });
    }
    const data = await LocationService.searchLocation(q);
    res.json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching location data' });
  }
}

export async function getAddress(req: Request, res: Response) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
      return res.status(400).json({ message: 'Missing query parameters: lat and log' });
    }
    const data = await LocationService.reverseLocation(lat, lon);
    res.json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching address' });
  }
}
