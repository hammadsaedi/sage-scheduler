import mongoose, { Schema } from 'mongoose';

const InstagramCredentialsSchema = new Schema({
  user_id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: {
    type: String,
    required: true,
  },
  account_id: {
    type: Schema.Types.ObjectId,
    ref: 'Account', 
    required: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  expires_time: {
    type: Date, 
    required: true,
  },
});


// Index for faster lookups by account_id
InstagramCredentialsSchema.index({ account_id: 1 });

const InstagramCredentials =
  mongoose.models.InstagramCredentials ||
  mongoose.model('InstagramCredentials', InstagramCredentialsSchema);

export default InstagramCredentials;