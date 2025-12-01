import mongoose from 'mongoose';

const address_schema = new mongoose.Schema(
  {
    neighbourhood: { type: String },
    county: { type: String },
    state: { type: String },
    country: { type: String },
    country_code: { type: String },
  },
  { _id: false },
);

const location_schema = new mongoose.Schema(
  {
    place_id: {
      type: String,
      required: true,
      unique: true,
    },
    licence: { type: String },
    osm_type: { type: String },
    osm_id: { type: String },
    lat: {
      type: String,
      require: true,
    },
    lon: {
      type: String,
      require: true,
    },
    display_name: {
      type: String,
      required: true,
    },
    address: {
      type: address_schema,
      required: false,
    },
    boundingbox: [{ type: String }],
  },
  { timestamps: true },
);

const Location = mongoose.model('Location', location_schema, 'Locations');

export default Location;
