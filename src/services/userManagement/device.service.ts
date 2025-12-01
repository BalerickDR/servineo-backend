
import Device, { IDevice } from '../../models/divice.model';

export const findDevicesByUser = async (userId: string): Promise<IDevice[]> => {
  return await Device.find({ userId }).sort({ lastLogin: -1 });
};

export const createDevice = async (userId: string, os: string, type: string): Promise<IDevice> => {
  return await Device.create({
    userId,
    os,
    type,
    lastLogin: new Date(),
  });
};

export const updateDeviceLastLogin = async (device: IDevice): Promise<IDevice> => {
  device.lastLogin = new Date();
  await device.save();
  return device;
};

export const removeDevice = async (id: string): Promise<void> => {
  await Device.findByIdAndDelete(id);
};
